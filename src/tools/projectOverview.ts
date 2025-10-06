/**
 * Project overview tool for TypeScript MCP server
 */

import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { ProjectStats } from '../types.js';
import { createErrorResponse } from '../utils/errorHandler.js';
import { isTypeScriptFile, readFileContent } from '../utils/pathUtils.js';

export async function getProjectOverview(root: string): Promise<{
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: ProjectStats;
}> {
	try {
		const stats = analyzeProject(root);

		const overview = `# Project Overview

## Summary
- **Total Files**: ${stats.totalFiles}
- **Total Lines**: ${stats.totalLines}
- **Top Level Directories**: ${stats.topLevelDirectories.join(', ')}

## Files by Extension
${Object.entries(stats.filesByExtension)
	.sort((a, b) => b[1] - a[1])
	.map(([ext, count]) => `- **${ext}**: ${count} files`)
	.join('\n')}

## Project Structure
${stats.topLevelDirectories.map((dir) => `- **${dir}/**`).join('\n')}`;

		return {
			content: [
				{
					type: 'text',
					text: overview,
				},
			],
			structuredContent: stats,
		};
	} catch (error) {
		return createErrorResponse(error, { operation: 'getProjectOverview' });
	}
}

function analyzeProject(rootPath: string): ProjectStats {
	const stats: ProjectStats = {
		totalFiles: 0,
		totalLines: 0,
		filesByExtension: {},
		topLevelDirectories: [],
	};

	const excludePatterns = [
		'node_modules',
		'.git',
		'dist',
		'build',
		'.next',
		'coverage',
		'.nyc_output',
		'.vscode',
		'.idea',
		'__pycache__',
		'*.log',
	];

	function shouldExclude(name: string): boolean {
		return excludePatterns.some((pattern) => {
			if (pattern.includes('*')) {
				return name.match(pattern.replace('*', '.*'));
			}
			return name === pattern;
		});
	}

	function walkDirectory(dir: string, isRoot = false): void {
		try {
			const entries = readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				if (shouldExclude(entry.name)) continue;

				const fullPath = join(dir, entry.name);

				if (entry.isDirectory()) {
					if (isRoot) {
						stats.topLevelDirectories.push(entry.name);
					}
					walkDirectory(fullPath);
				} else if (entry.isFile()) {
					stats.totalFiles++;

					const ext = extname(entry.name) || '[no extension]';
					stats.filesByExtension[ext] = (stats.filesByExtension[ext] || 0) + 1;

					// Count lines for text files
					if (isTypeScriptFile(fullPath) || isTextFile(ext)) {
						try {
							const content = readFileContent(fullPath);
							stats.totalLines += content.split('\n').length;
						} catch {
							// Ignore files that can't be read
						}
					}
				}
			}
		} catch (error) {
			console.warn(`Failed to read directory ${dir}:`, error);
		}
	}

	walkDirectory(rootPath, true);
	return stats;
}

function isTextFile(extension: string): boolean {
	const textExtensions = [
		'.js',
		'.ts',
		'.jsx',
		'.tsx',
		'.json',
		'.md',
		'.txt',
		'.yml',
		'.yaml',
		'.html',
		'.css',
		'.scss',
		'.less',
		'.xml',
		'.csv',
		'.toml',
		'.ini',
		'.sh',
		'.bat',
		'.ps1',
	];

	return textExtensions.includes(extension.toLowerCase());
}
