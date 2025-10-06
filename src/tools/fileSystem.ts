/**
 * File system tools for TypeScript MCP server
 */

import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { FileSystemEntry } from '../types.js';
import { createErrorResponse } from '../utils/errorHandler.js';

export async function listDirectory(
	root: string,
	relativePath = '.',
): Promise<{
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: { entries: FileSystemEntry[]; path: string };
}> {
	try {
		const targetPath = join(root, relativePath);
		const entries = getDirectoryEntries(targetPath, root);

		const formattedEntries = entries
			.sort((a, b) => {
				// Directories first, then files
				if (a.type !== b.type) {
					return a.type === 'directory' ? -1 : 1;
				}
				return a.name.localeCompare(b.name);
			})
			.map((entry) => {
				const icon = entry.type === 'directory' ? '📁' : '📄';
				return `${icon} ${entry.name}`;
			})
			.join('\n');

		const pathDisplay =
			relativePath === '.' ? 'Root Directory' : `Directory: ${relativePath}`;
		const text = `# ${pathDisplay}

Found ${entries.length} items:

${formattedEntries}`;

		return {
			content: [
				{
					type: 'text',
					text,
				},
			],
			structuredContent: {
				entries,
				path: relativePath,
			},
		};
	} catch (error) {
		return createErrorResponse(error, {
			operation: 'listDirectory',
			file: relativePath,
		});
	}
}

function getDirectoryEntries(dir: string, root: string): FileSystemEntry[] {
	const entries: FileSystemEntry[] = [];

	const excludePatterns = [
		'node_modules',
		'.git',
		'dist',
		'build',
		'.next',
		'coverage',
		'.nyc_output',
	];

	function shouldExclude(name: string): boolean {
		return excludePatterns.includes(name) || name.startsWith('.');
	}

	try {
		const dirEntries = readdirSync(dir, { withFileTypes: true });

		for (const entry of dirEntries) {
			if (shouldExclude(entry.name)) continue;

			const fullPath = join(dir, entry.name);
			const relativePath = relative(root, fullPath);

			entries.push({
				name: entry.name,
				type: entry.isDirectory() ? 'directory' : 'file',
				path: relativePath,
			});
		}
	} catch (error) {
		throw new Error(
			`Failed to read directory: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return entries;
}
