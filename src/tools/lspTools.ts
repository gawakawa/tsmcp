/**
 * LSP-specific tools for TypeScript MCP server
 */

import { join } from 'node:path';
import type { TypeScriptLSPClient } from '../lsp/client.js';
import type {
	CompletionItem,
	Diagnostic,
	Hover,
	Location,
	Position,
	TextEdit,
} from '../types.js';
import { createErrorResponse } from '../utils/errorHandler.js';
import { extractPathAndPosition, uriToPath } from '../utils/pathUtils.js';

export async function lspGetHover(
	lspClient: TypeScriptLSPClient,
	root: string,
	input: string,
): Promise<{
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: { hover: Hover | null; file: string; position: Position };
}> {
	try {
		if (!lspClient.isInitialized()) {
			throw new Error('LSP client is not initialized');
		}

		const { path: relativePath, position } = extractPathAndPosition(input);
		if (!position) {
			throw new Error('Position is required. Use format: file.ts:line:column');
		}

		const filePath = join(root, relativePath);
		const hover = await lspClient.getHover(filePath, position);

		let text: string;
		if (hover?.contents) {
			const hoverText = Array.isArray(hover.contents)
				? hover.contents
						.map((c) => (typeof c === 'string' ? c : c.value))
						.join('\n')
				: typeof hover.contents === 'string'
					? hover.contents
					: hover.contents.value;

			// Remove existing code block markers if present to prevent double-nesting
			const cleanedHoverText = hoverText
				.replace(/^```[\w]*\n?/gm, '')
				.replace(/\n?```$/gm, '')
				.trim();

			text = `# Hover Information

**File**: ${relativePath}
**Position**: ${position.line + 1}:${position.character + 1}

\`\`\`typescript
${cleanedHoverText}
\`\`\``;
		} else {
			text = `# Hover Information

**File**: ${relativePath}
**Position**: ${position.line + 1}:${position.character + 1}

No hover information available at this position.`;
		}

		return {
			content: [{ type: 'text', text }],
			structuredContent: { hover, file: relativePath, position },
		};
	} catch (error) {
		return createErrorResponse(error, {
			operation: 'lsp_get_hover',
			file: input,
		});
	}
}

export async function lspGetDefinitions(
	lspClient: TypeScriptLSPClient,
	root: string,
	input: string,
): Promise<{
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: {
		definitions: Location[];
		file: string;
		position: Position;
	};
}> {
	try {
		if (!lspClient.isInitialized()) {
			throw new Error('LSP client is not initialized');
		}

		const { path: relativePath, position } = extractPathAndPosition(input);
		if (!position) {
			throw new Error('Position is required. Use format: file.ts:line:column');
		}

		const filePath = join(root, relativePath);
		const definitions = await lspClient.getDefinition(filePath, position);

		let text: string;
		if (definitions.length > 0) {
			const definitionList = definitions
				.map((def, index) => {
					const defPath = uriToPath(def.uri);
					const line = def.range.start.line + 1;
					const column = def.range.start.character + 1;
					return `${index + 1}. **${defPath}**:${line}:${column}`;
				})
				.join('\n');

			text = `# Definition Results

**File**: ${relativePath}
**Position**: ${position.line + 1}:${position.character + 1}

Found ${definitions.length} definition(s):

${definitionList}`;
		} else {
			text = `# Definition Results

**File**: ${relativePath}
**Position**: ${position.line + 1}:${position.character + 1}

No definitions found at this position.`;
		}

		return {
			content: [{ type: 'text', text }],
			structuredContent: { definitions, file: relativePath, position },
		};
	} catch (error) {
		return createErrorResponse(error, {
			operation: 'lsp_get_definitions',
			file: input,
		});
	}
}

export async function lspFindReferences(
	lspClient: TypeScriptLSPClient,
	root: string,
	input: string,
	includeDeclaration = true,
): Promise<{
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: {
		references: Location[];
		file: string;
		position: Position;
	};
}> {
	try {
		if (!lspClient.isInitialized()) {
			throw new Error('LSP client is not initialized');
		}

		const { path: relativePath, position } = extractPathAndPosition(input);
		if (!position) {
			throw new Error('Position is required. Use format: file.ts:line:column');
		}

		const filePath = join(root, relativePath);
		const references = await lspClient.getReferences(
			filePath,
			position,
			includeDeclaration,
		);

		let text: string;
		if (references.length > 0) {
			const referenceList = references
				.map((ref, index) => {
					const refPath = uriToPath(ref.uri);
					const line = ref.range.start.line + 1;
					const column = ref.range.start.character + 1;
					return `${index + 1}. **${refPath}**:${line}:${column}`;
				})
				.join('\n');

			text = `# References

**File**: ${relativePath}
**Position**: ${position.line + 1}:${position.character + 1}

Found ${references.length} reference(s):

${referenceList}`;
		} else {
			text = `# References

**File**: ${relativePath}
**Position**: ${position.line + 1}:${position.character + 1}

No references found for this symbol.`;
		}

		return {
			content: [{ type: 'text', text }],
			structuredContent: { references, file: relativePath, position },
		};
	} catch (error) {
		return createErrorResponse(error, {
			operation: 'lsp_find_references',
			file: input,
		});
	}
}

export async function lspGetCompletion(
	lspClient: TypeScriptLSPClient,
	root: string,
	input: string,
	maxResults = 20,
): Promise<{
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: {
		completions: CompletionItem[];
		file: string;
		position: Position;
	};
}> {
	try {
		if (!lspClient.isInitialized()) {
			throw new Error('LSP client is not initialized');
		}

		const { path: relativePath, position } = extractPathAndPosition(input);
		if (!position) {
			throw new Error('Position is required. Use format: file.ts:line:column');
		}

		const filePath = join(root, relativePath);
		const allCompletions = await lspClient.getCompletion(filePath, position);
		const completions = allCompletions.slice(0, maxResults);

		let text: string;
		if (completions.length > 0) {
			const completionList = completions
				.map((completion, index) => {
					const kind = getCompletionKindName(completion.kind || 1);
					const detail = completion.detail ? ` - ${completion.detail}` : '';
					return `${index + 1}. **${completion.label}** (${kind})${detail}`;
				})
				.join('\n');

			text = `# Code Completion

**File**: ${relativePath}
**Position**: ${position.line + 1}:${position.character + 1}

Found ${completions.length} completion(s)${allCompletions.length > maxResults ? ` (showing first ${maxResults} of ${allCompletions.length})` : ''}:

${completionList}`;
		} else {
			text = `# Code Completion

**File**: ${relativePath}
**Position**: ${position.line + 1}:${position.character + 1}

No completions available at this position.`;
		}

		return {
			content: [{ type: 'text', text }],
			structuredContent: { completions, file: relativePath, position },
		};
	} catch (error) {
		return createErrorResponse(error, {
			operation: 'lsp_get_completion',
			file: input,
		});
	}
}

export async function lspGetDiagnostics(
	lspClient: TypeScriptLSPClient,
	root: string,
	relativePath: string,
): Promise<{
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: { diagnostics: Diagnostic[]; file: string };
}> {
	try {
		if (!lspClient.isInitialized()) {
			throw new Error('LSP client is not initialized');
		}

		const filePath = join(root, relativePath);
		const diagnostics = await lspClient.getDiagnostics(filePath);

		let text: string;
		if (diagnostics.length > 0) {
			const diagnosticList = diagnostics
				.map((diagnostic, index) => {
					const line = diagnostic.range.start.line + 1;
					const column = diagnostic.range.start.character + 1;
					const severity = getDiagnosticSeverityName(diagnostic.severity);
					return `${index + 1}. **${severity}** at ${line}:${column}
   ${diagnostic.message}${diagnostic.source ? ` (${diagnostic.source})` : ''}`;
				})
				.join('\n\n');

			text = `# Diagnostics

**File**: ${relativePath}

Found ${diagnostics.length} diagnostic(s):

${diagnosticList}`;
		} else {
			text = `# Diagnostics

**File**: ${relativePath}

No diagnostics found. File appears to be error-free! ✅`;
		}

		return {
			content: [{ type: 'text', text }],
			structuredContent: { diagnostics, file: relativePath },
		};
	} catch (error) {
		return createErrorResponse(error, {
			operation: 'lsp_get_diagnostics',
			file: relativePath,
		});
	}
}

export async function lspFormatDocument(
	lspClient: TypeScriptLSPClient,
	root: string,
	relativePath: string,
	options = { tabSize: 2, insertSpaces: true },
): Promise<{
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: { edits: TextEdit[]; file: string };
}> {
	try {
		if (!lspClient.isInitialized()) {
			throw new Error('LSP client is not initialized');
		}

		const filePath = join(root, relativePath);
		const edits = await lspClient.formatDocument(filePath, options);

		let text: string;
		if (edits.length > 0) {
			const editList = edits
				.map((edit, index) => {
					const startLine = edit.range.start.line + 1;
					const startCol = edit.range.start.character + 1;
					const endLine = edit.range.end.line + 1;
					const endCol = edit.range.end.character + 1;

					const newTextPreview =
						edit.newText.length > 50
							? `${edit.newText.substring(0, 50)}...`
							: edit.newText;

					return `${index + 1}. Replace ${startLine}:${startCol}-${endLine}:${endCol}
   New text: "${newTextPreview}"`;
				})
				.join('\n\n');

			text = `# Document Formatting

**File**: ${relativePath}

Found ${edits.length} formatting change(s):

${editList}

**Note**: These are the changes that would be applied. Use a code editor to actually apply formatting.`;
		} else {
			text = `# Document Formatting

**File**: ${relativePath}

Document is already properly formatted. No changes needed! ✅`;
		}

		return {
			content: [{ type: 'text', text }],
			structuredContent: { edits, file: relativePath },
		};
	} catch (error) {
		return createErrorResponse(error, {
			operation: 'lsp_format_document',
			file: relativePath,
		});
	}
}

function getCompletionKindName(kind: number): string {
	const kindNames: Record<number, string> = {
		1: 'Text',
		2: 'Method',
		3: 'Function',
		4: 'Constructor',
		5: 'Field',
		6: 'Variable',
		7: 'Class',
		8: 'Interface',
		9: 'Module',
		10: 'Property',
		11: 'Unit',
		12: 'Value',
		13: 'Enum',
		14: 'Keyword',
		15: 'Snippet',
		16: 'Color',
		17: 'File',
		18: 'Reference',
		19: 'Folder',
		20: 'EnumMember',
		21: 'Constant',
		22: 'Struct',
		23: 'Event',
		24: 'Operator',
		25: 'TypeParameter',
	};

	return kindNames[kind] || 'Unknown';
}

function getDiagnosticSeverityName(severity?: number): string {
	switch (severity) {
		case 1:
			return 'Error';
		case 2:
			return 'Warning';
		case 3:
			return 'Information';
		case 4:
			return 'Hint';
		default:
			return 'Unknown';
	}
}
