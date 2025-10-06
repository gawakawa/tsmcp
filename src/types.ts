/**
 * Type definitions for TypeScript MCP server
 */

import type {
	CodeAction,
	Command,
	CompletionItem,
	Diagnostic,
	DocumentSymbol,
	FormattingOptions,
	Hover,
	Location,
	Position,
	Range,
	SignatureHelp,
	SymbolInformation,
	TextEdit,
	WorkspaceEdit,
} from 'vscode-languageserver-types';

// Re-export LSP types for convenience
export type {
	Position,
	Location,
	Hover,
	Diagnostic,
	DocumentSymbol,
	SymbolInformation,
	CompletionItem,
	SignatureHelp,
	CodeAction,
	Command,
	TextEdit,
	WorkspaceEdit,
	Range,
	FormattingOptions,
};

// TypeScript MCP specific types
export interface ProjectStats {
	[x: string]: unknown;
	totalFiles: number;
	totalLines: number;
	filesByExtension: Record<string, number>;
	topLevelDirectories: string[];
}

export interface SymbolSearchResult {
	[x: string]: unknown;
	name: string;
	kind: number;
	location: Location;
	containerName?: string;
	detail?: string;
}

export interface SymbolDetails {
	[x: string]: unknown;
	name: string;
	kind: number;
	location: Location;
	hover?: Hover | null;
	definitions?: Location[];
	references?: Location[];
	detail?: string;
	containerName?: string;
}

export interface FileSystemEntry {
	[x: string]: unknown;
	name: string;
	type: 'file' | 'directory';
	path: string;
}

export interface TSMCPConfig {
	workspaceRoot: string;
	typescriptServerPath?: string;
	timeout?: number;
	maxResults?: number;
	filePatterns?: string[];
	excludePatterns?: string[];
}

export interface LSPClientConfig {
	rootPath: string;
	typescriptServerPath?: string;
	timeout?: number;
	initializationOptions?: Record<string, unknown>;
}

export interface ErrorContext {
	operation: string;
	file?: string;
	position?: Position;
	symbolName?: string;
}
