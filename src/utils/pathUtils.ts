/**
 * Path utilities for TypeScript MCP server
 */

import { readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import type { Position } from '../types.js';

export function normalizeUri(path: string): string {
	if (path.startsWith('file://')) {
		return path;
	}
	return `file://${resolve(path)}`;
}

export function uriToPath(uri: string): string {
	if (uri.startsWith('file://')) {
		return uri.slice(7);
	}
	return uri;
}

export function pathToUri(path: string): string {
	return normalizeUri(path);
}

export function resolveRelativePath(
	root: string,
	relativePath: string,
): string {
	return resolve(root, relativePath);
}

export function getRelativePath(root: string, absolutePath: string): string {
	return relative(root, absolutePath);
}

export function isTypeScriptFile(path: string): boolean {
	const ext = extname(path).toLowerCase();
	return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
}

export function getLanguageId(path: string): string {
	const ext = extname(path).toLowerCase();
	switch (ext) {
		case '.ts':
			return 'typescript';
		case '.tsx':
			return 'typescriptreact';
		case '.js':
			return 'javascript';
		case '.jsx':
			return 'javascriptreact';
		default:
			return 'typescript';
	}
}

export function readFileContent(path: string): string {
	try {
		return readFileSync(path, 'utf-8');
	} catch (error) {
		throw new Error(
			`Failed to read file ${path}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export function parseLineNumber(input: string): Position | null {
	// Support formats like "file.ts:10:5", "file.ts:10", ":10:5", ":10"
	const match = input.match(/:(\d+)(?::(\d+))?$/);
	if (match) {
		const line = parseInt(match[1], 10) - 1; // Convert to 0-based
		const character = match[2] ? parseInt(match[2], 10) - 1 : 0; // Convert to 0-based
		return { line, character };
	}
	return null;
}

export function extractPathAndPosition(input: string): {
	path: string;
	position: Position | null;
} {
	const positionMatch = input.match(/^(.*?)(?::(\d+)(?::(\d+))?)?$/);
	if (!positionMatch) {
		return { path: input, position: null };
	}

	const path = positionMatch[1];
	const line = positionMatch[2] ? parseInt(positionMatch[2], 10) - 1 : null;
	const character = positionMatch[3] ? parseInt(positionMatch[3], 10) - 1 : 0;

	const position = line !== null ? { line, character } : null;
	return { path, position };
}

export function findSymbolInLine(
	content: string,
	line: number,
	symbolName?: string,
): Position | null {
	const lines = content.split('\n');
	if (line < 0 || line >= lines.length) {
		return null;
	}

	const lineText = lines[line];
	if (!symbolName) {
		// Return position at start of first non-whitespace character
		const match = lineText.match(/\S/);
		return match
			? { line, character: match.index || 0 }
			: { line, character: 0 };
	}

	// Find the symbol in the line
	const index = lineText.indexOf(symbolName);
	if (index >= 0) {
		return { line, character: index };
	}

	return null;
}
