/**
 * Symbol-related tools for TypeScript MCP server
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { TypeScriptLSPClient } from '../lsp/client.js';
import type { Location, SymbolDetails, SymbolSearchResult } from '../types.js';
import { createErrorResponse } from '../utils/errorHandler.js';
import {
	extractPathAndPosition,
	isTypeScriptFile,
	pathToUri,
	readFileContent,
	uriToPath,
} from '../utils/pathUtils.js';

export async function searchSymbols(
	lspClient: TypeScriptLSPClient,
	root: string,
	query: string,
	maxResults = 50,
): Promise<{
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: { symbols: SymbolSearchResult[]; query: string };
}> {
	try {
		if (!lspClient.isInitialized()) {
			throw new Error('LSP client is not initialized');
		}

		// Try workspace symbol search first
		const workspaceSymbols = await lspClient.getWorkspaceSymbols(query);

		// Convert workspace symbols to our format
		const symbols: SymbolSearchResult[] = workspaceSymbols
			.slice(0, maxResults)
			.map((symbol) => ({
				name: symbol.name,
				kind: symbol.kind,
				location: symbol.location,
				containerName: symbol.containerName,
				detail: getSymbolKindName(symbol.kind),
			}));

		if (symbols.length === 0) {
			// Fallback: search through TypeScript files manually
			const manualResults = await searchSymbolsInFiles(root, query, maxResults);
			symbols.push(...manualResults);
		}

		const text = formatSymbolSearchResults(symbols, query);

		return {
			content: [
				{
					type: 'text',
					text,
				},
			],
			structuredContent: {
				symbols,
				query,
			},
		};
	} catch (error) {
		return createErrorResponse(error, {
			operation: 'searchSymbols',
			symbolName: query,
		});
	}
}

export async function getSymbolDetails(
	lspClient: TypeScriptLSPClient,
	root: string,
	input: string,
): Promise<{
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: SymbolDetails;
}> {
	try {
		if (!lspClient.isInitialized()) {
			throw new Error('LSP client is not initialized');
		}

		const { path: relativePath, position } = extractPathAndPosition(input);
		const filePath = join(root, relativePath);

		const targetPosition = position;

		// If no position provided, try to find the symbol in the file
		if (!targetPosition) {
			throw new Error(
				'Position is required for symbol details. Use format: file.ts:line:column',
			);
		}

		// Get hover information
		const hover = await lspClient.getHover(filePath, targetPosition);

		// Get definitions
		const definitions = await lspClient.getDefinition(filePath, targetPosition);

		// Get references
		const references = await lspClient.getReferences(filePath, targetPosition);

		// Extract symbol name from file content or hover information
		let symbolName = 'Unknown';

		// Try to read the symbol from the file at the given position
		try {
			const content = readFileContent(filePath);
			const lines = content.split('\n');
			if (targetPosition.line < lines.length) {
				const line = lines[targetPosition.line];
				const char = targetPosition.character;

				// Extract word at position
				let start = char;
				let end = char;

				// Find word boundaries (alphanumeric, underscore, and $ for JS identifiers)
				while (start > 0 && /[\w$]/.test(line[start - 1])) start--;
				while (end < line.length && /[\w$]/.test(line[end])) end++;

				if (start < end) {
					symbolName = line.substring(start, end);
				}
			}
		} catch {
			// If file reading fails, fall back to hover text parsing
		}

		// If we still don't have a good symbol name, try parsing hover text
		if (symbolName === 'Unknown' && hover?.contents) {
			const hoverText = Array.isArray(hover.contents)
				? hover.contents
						.map((c) => (typeof c === 'string' ? c : c.value))
						.join(' ')
				: typeof hover.contents === 'string'
					? hover.contents
					: hover.contents.value;

			// Try multiple patterns to extract symbol name
			const patterns = [
				/(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/,
				/(?:property|method|parameter)\s+(\w+)/i,
				/^\s*(\w+)\s*:/,
				/^\s*(\w+)\s*\(/,
				/^\(?(\w+)\)?/,
			];

			for (const pattern of patterns) {
				const match = hoverText.match(pattern);
				if (match?.[1]) {
					symbolName = match[1];
					break;
				}
			}
		}

		const primaryLocation: Location =
			definitions.length > 0
				? definitions[0]
				: {
						uri: pathToUri(filePath),
						range: {
							start: targetPosition,
							end: {
								line: targetPosition.line,
								character: targetPosition.character + symbolName.length,
							},
						},
					};

		const symbolDetails: SymbolDetails = {
			name: symbolName,
			kind: 1, // Default to Text
			location: primaryLocation,
			hover,
			definitions,
			references,
			detail: hover ? 'Symbol with type information' : 'Symbol',
		};

		const text = formatSymbolDetails(symbolDetails);

		return {
			content: [
				{
					type: 'text',
					text,
				},
			],
			structuredContent: symbolDetails,
		};
	} catch (error) {
		return createErrorResponse(error, {
			operation: 'getSymbolDetails',
			file: input,
		});
	}
}

async function searchSymbolsInFiles(
	root: string,
	query: string,
	maxResults: number,
): Promise<SymbolSearchResult[]> {
	const results: SymbolSearchResult[] = [];
	const queryLower = query.toLowerCase();

	function walkDirectory(dir: string): void {
		if (results.length >= maxResults) return;

		try {
			const entries = readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				if (results.length >= maxResults) break;

				const fullPath = join(dir, entry.name);

				if (entry.isDirectory() && !shouldExcludeDirectory(entry.name)) {
					walkDirectory(fullPath);
				} else if (entry.isFile() && isTypeScriptFile(fullPath)) {
					searchInFile(fullPath);
				}
			}
		} catch {
			// Ignore directories we can't read
		}
	}

	function searchInFile(filePath: string): void {
		try {
			const content = readFileContent(filePath);
			const lines = content.split('\n');

			for (let i = 0; i < lines.length && results.length < maxResults; i++) {
				const line = lines[i];
				const index = line.toLowerCase().indexOf(queryLower);

				if (index >= 0) {
					// Look for word boundaries
					const wordMatch = line.match(
						new RegExp(`\\b\\w*${query}\\w*\\b`, 'i'),
					);
					if (wordMatch) {
						const symbolName = wordMatch[0];
						const symbolIndex = line.indexOf(symbolName);

						results.push({
							name: symbolName,
							kind: 1, // Text
							location: {
								uri: pathToUri(filePath),
								range: {
									start: { line: i, character: symbolIndex },
									end: { line: i, character: symbolIndex + symbolName.length },
								},
							},
							detail: `Found in ${filePath}:${i + 1}`,
						});
					}
				}
			}
		} catch {
			// Ignore files we can't read
		}
	}

	walkDirectory(root);
	return results;
}

function shouldExcludeDirectory(name: string): boolean {
	return [
		'node_modules',
		'.git',
		'dist',
		'build',
		'.next',
		'coverage',
	].includes(name);
}

function formatSymbolSearchResults(
	symbols: SymbolSearchResult[],
	query: string,
): string {
	if (symbols.length === 0) {
		return `# Symbol Search Results

No symbols found matching "${query}".`;
	}

	const results = symbols
		.map((symbol) => {
			const location = uriToPath(symbol.location.uri);
			const line = symbol.location.range.start.line + 1;
			const container = symbol.containerName
				? ` (in ${symbol.containerName})`
				: '';

			return `- **${symbol.name}** ${container}
  - Type: ${symbol.detail || getSymbolKindName(symbol.kind)}
  - Location: ${location}:${line}`;
		})
		.join('\n\n');

	return `# Symbol Search Results

Found ${symbols.length} symbols matching "${query}":

${results}`;
}

function formatSymbolDetails(details: SymbolDetails): string {
	const location = uriToPath(details.location.uri);
	const line = details.location.range.start.line + 1;
	const column = details.location.range.start.character + 1;

	let text = `# Symbol Details: ${details.name}

## Basic Information
- **Name**: ${details.name}
- **Type**: ${details.detail || getSymbolKindName(details.kind)}
- **Location**: ${location}:${line}:${column}`;

	if (details.hover?.contents) {
		const hoverText = Array.isArray(details.hover.contents)
			? details.hover.contents
					.map((c) => (typeof c === 'string' ? c : c.value))
					.join('\n')
			: typeof details.hover.contents === 'string'
				? details.hover.contents
				: details.hover.contents.value;

		text += `\n\n## Type Information\n\`\`\`typescript\n${hoverText}\n\`\`\``;
	}

	if (details.definitions && details.definitions.length > 0) {
		text += `\n\n## Definitions (${details.definitions.length})`;
		details.definitions.forEach((def, index) => {
			const defLocation = uriToPath(def.uri);
			const defLine = def.range.start.line + 1;
			text += `\n${index + 1}. ${defLocation}:${defLine}`;
		});
	}

	if (details.references && details.references.length > 0) {
		text += `\n\n## References (${details.references.length})`;
		details.references.forEach((ref, index) => {
			const refLocation = uriToPath(ref.uri);
			const refLine = ref.range.start.line + 1;
			text += `\n${index + 1}. ${refLocation}:${refLine}`;
		});
	}

	return text;
}

function getSymbolKindName(kind: number): string {
	const kindNames: Record<number, string> = {
		1: 'File',
		2: 'Module',
		3: 'Namespace',
		4: 'Package',
		5: 'Class',
		6: 'Method',
		7: 'Property',
		8: 'Field',
		9: 'Constructor',
		10: 'Enum',
		11: 'Interface',
		12: 'Function',
		13: 'Variable',
		14: 'Constant',
		15: 'String',
		16: 'Number',
		17: 'Boolean',
		18: 'Array',
		19: 'Object',
		20: 'Key',
		21: 'Null',
		22: 'EnumMember',
		23: 'Struct',
		24: 'Event',
		25: 'Operator',
		26: 'TypeParameter',
	};

	return kindNames[kind] || 'Unknown';
}
