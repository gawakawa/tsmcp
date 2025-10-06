import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config/config.js";
import { TypeScriptLSPClient } from "./lsp/client.js";
import { listDirectory } from "./tools/fileSystem.js";
import {
	lspFindReferences,
	lspFormatDocument,
	lspGetCompletion,
	lspGetDefinitions,
	lspGetDiagnostics,
	lspGetHover,
} from "./tools/lspTools.js";
import { getProjectOverview } from "./tools/projectOverview.js";
import { getSymbolDetails, searchSymbols } from "./tools/symbolTools.js";

const config = loadConfig();
let lspClient: TypeScriptLSPClient | undefined;

const server = new McpServer({
	name: "typescript-mcp-server",
	version: "1.0.0",
});

// Project overview tool
server.registerTool(
	"get_project_overview",
	{
		title: "Get Project Overview",
		description:
			"Get an overview of the TypeScript/JavaScript project structure and statistics",
		inputSchema: {},
		outputSchema: {
			totalFiles: z.number(),
			totalLines: z.number(),
			filesByExtension: z.record(z.number()),
			topLevelDirectories: z.array(z.string()),
		},
	},
	async () => {
		return await getProjectOverview(config.workspaceRoot);
	},
);

// Directory listing tool
server.registerTool(
	"list_dir",
	{
		title: "List Directory",
		description: "List files and directories in the specified path",
		inputSchema: {
			path: z
				.string()
				.optional()
				.describe('Relative path from workspace root (default: ".")'),
		},
		outputSchema: {
			entries: z.array(
				z.object({
					name: z.string(),
					type: z.enum(["file", "directory"]),
					path: z.string(),
				}),
			),
			path: z.string(),
		},
	},
	async ({ path = "." }) => {
		return await listDirectory(config.workspaceRoot, path);
	},
);

// Symbol search tool
server.registerTool(
	"search_symbols",
	{
		title: "Search Symbols",
		description:
			"Search for symbols (classes, functions, variables, etc.) in the TypeScript project",
		inputSchema: {
			query: z.string().describe("Symbol name to search for"),
		},
		outputSchema: {
			symbols: z.array(
				z.object({
					name: z.string(),
					kind: z.number(),
					location: z.object({
						uri: z.string(),
						range: z.object({
							start: z.object({ line: z.number(), character: z.number() }),
							end: z.object({ line: z.number(), character: z.number() }),
						}),
					}),
					containerName: z.string().optional(),
					detail: z.string().optional(),
				}),
			),
			query: z.string(),
		},
	},
	async ({ query }) => {
		await ensureLSPClient();
		if (!lspClient) {
			throw new Error("Failed to initialize LSP client");
		}
		return await searchSymbols(
			lspClient,
			config.workspaceRoot,
			query,
			config.maxResults,
		);
	},
);

// Symbol details tool
server.registerTool(
	"get_symbol_details",
	{
		title: "Get Symbol Details",
		description:
			"Get detailed information about a symbol at a specific location (file:line:column)",
		inputSchema: {
			location: z
				.string()
				.describe("File path with position in format: file.ts:line:column"),
		},
		outputSchema: {
			name: z.string(),
			kind: z.number(),
			location: z.object({
				uri: z.string(),
				range: z.object({
					start: z.object({ line: z.number(), character: z.number() }),
					end: z.object({ line: z.number(), character: z.number() }),
				}),
			}),
			hover: z.any().optional(),
			definitions: z.array(z.any()).optional(),
			references: z.array(z.any()).optional(),
			detail: z.string().optional(),
			containerName: z.string().optional(),
		},
	},
	async ({ location }) => {
		await ensureLSPClient();
		if (!lspClient) {
			throw new Error("Failed to initialize LSP client");
		}
		return await getSymbolDetails(lspClient, config.workspaceRoot, location);
	},
);

// LSP hover tool
server.registerTool(
	"lsp_get_hover",
	{
		title: "Get Hover Information",
		description:
			"Get type information and documentation for a symbol at a specific location",
		inputSchema: {
			location: z
				.string()
				.describe("File path with position in format: file.ts:line:column"),
		},
		outputSchema: {
			hover: z.any().optional(),
			file: z.string(),
			position: z.object({ line: z.number(), character: z.number() }),
		},
	},
	async ({ location }) => {
		await ensureLSPClient();
		if (!lspClient) {
			throw new Error("Failed to initialize LSP client");
		}
		return await lspGetHover(lspClient, config.workspaceRoot, location);
	},
);

// LSP definitions tool
server.registerTool(
	"lsp_get_definitions",
	{
		title: "Go to Definition",
		description: "Find the definition(s) of a symbol at a specific location",
		inputSchema: {
			location: z
				.string()
				.describe("File path with position in format: file.ts:line:column"),
		},
		outputSchema: {
			definitions: z.array(
				z.object({
					uri: z.string(),
					range: z.object({
						start: z.object({ line: z.number(), character: z.number() }),
						end: z.object({ line: z.number(), character: z.number() }),
					}),
				}),
			),
			file: z.string(),
			position: z.object({ line: z.number(), character: z.number() }),
		},
	},
	async ({ location }) => {
		await ensureLSPClient();
		if (!lspClient) {
			throw new Error("Failed to initialize LSP client");
		}
		return await lspGetDefinitions(lspClient, config.workspaceRoot, location);
	},
);

// LSP references tool
server.registerTool(
	"lsp_find_references",
	{
		title: "Find References",
		description: "Find all references to a symbol at a specific location",
		inputSchema: {
			location: z
				.string()
				.describe("File path with position in format: file.ts:line:column"),
			includeDeclaration: z
				.boolean()
				.optional()
				.describe("Include the declaration in results (default: true)"),
		},
		outputSchema: {
			references: z.array(
				z.object({
					uri: z.string(),
					range: z.object({
						start: z.object({ line: z.number(), character: z.number() }),
						end: z.object({ line: z.number(), character: z.number() }),
					}),
				}),
			),
			file: z.string(),
			position: z.object({ line: z.number(), character: z.number() }),
		},
	},
	async ({ location, includeDeclaration = true }) => {
		await ensureLSPClient();
		if (!lspClient) {
			throw new Error("Failed to initialize LSP client");
		}
		return await lspFindReferences(
			lspClient,
			config.workspaceRoot,
			location,
			includeDeclaration,
		);
	},
);

// LSP completion tool
server.registerTool(
	"lsp_get_completion",
	{
		title: "Get Code Completion",
		description: "Get code completion suggestions at a specific location",
		inputSchema: {
			location: z
				.string()
				.describe("File path with position in format: file.ts:line:column"),
			maxResults: z
				.number()
				.optional()
				.describe("Maximum number of results (default: 20)"),
		},
		outputSchema: {
			completions: z.array(
				z.object({
					label: z.string(),
					kind: z.number().optional(),
					detail: z.string().optional(),
				}),
			),
			file: z.string(),
			position: z.object({ line: z.number(), character: z.number() }),
		},
	},
	async ({ location, maxResults = 20 }) => {
		await ensureLSPClient();
		if (!lspClient) {
			throw new Error("Failed to initialize LSP client");
		}
		return await lspGetCompletion(
			lspClient,
			config.workspaceRoot,
			location,
			maxResults,
		);
	},
);

// LSP diagnostics tool
server.registerTool(
	"lsp_get_diagnostics",
	{
		title: "Get Diagnostics",
		description: "Get error and warning diagnostics for a file",
		inputSchema: {
			file: z
				.string()
				.describe("Relative path to the file from workspace root"),
		},
		outputSchema: {
			diagnostics: z.array(
				z.object({
					range: z.object({
						start: z.object({ line: z.number(), character: z.number() }),
						end: z.object({ line: z.number(), character: z.number() }),
					}),
					message: z.string(),
					severity: z.number().optional(),
					source: z.string().optional(),
				}),
			),
			file: z.string(),
		},
	},
	async ({ file }) => {
		await ensureLSPClient();
		if (!lspClient) {
			throw new Error("Failed to initialize LSP client");
		}
		return await lspGetDiagnostics(lspClient, config.workspaceRoot, file);
	},
);

// LSP formatting tool
server.registerTool(
	"lsp_format_document",
	{
		title: "Format Document",
		description: "Get formatting edits for a TypeScript/JavaScript file",
		inputSchema: {
			file: z
				.string()
				.describe("Relative path to the file from workspace root"),
			tabSize: z
				.number()
				.optional()
				.describe("Number of spaces per tab (default: 2)"),
			insertSpaces: z
				.boolean()
				.optional()
				.describe("Use spaces instead of tabs (default: true)"),
		},
		outputSchema: {
			edits: z.array(
				z.object({
					range: z.object({
						start: z.object({ line: z.number(), character: z.number() }),
						end: z.object({ line: z.number(), character: z.number() }),
					}),
					newText: z.string(),
				}),
			),
			file: z.string(),
		},
	},
	async ({ file, tabSize = 2, insertSpaces = true }) => {
		await ensureLSPClient();
		if (!lspClient) {
			throw new Error("Failed to initialize LSP client");
		}
		return await lspFormatDocument(lspClient, config.workspaceRoot, file, {
			tabSize,
			insertSpaces,
		});
	},
);

// Helper function to ensure LSP client is initialized
async function ensureLSPClient(): Promise<void> {
	if (!lspClient) {
		lspClient = new TypeScriptLSPClient({
			rootPath: config.workspaceRoot,
			timeout: config.timeout,
		});
		await lspClient.start();
	}
}

// Cleanup function
process.on("SIGINT", async () => {
	console.log("\nShutting down TypeScript MCP server...");
	if (lspClient) {
		lspClient.cleanup();
		await lspClient.stop();
	}
	process.exit(0);
});

process.on("SIGTERM", async () => {
	console.log("\nShutting down TypeScript MCP server...");
	if (lspClient) {
		lspClient.cleanup();
		await lspClient.stop();
	}
	process.exit(0);
});

async function main() {
	try {
		console.error(
			`Starting TypeScript MCP server for workspace: ${config.workspaceRoot}`,
		);

		const transport = new StdioServerTransport();
		await server.connect(transport);

		console.error("TypeScript MCP server ready!");
	} catch (error) {
		console.error("Failed to start TypeScript MCP server:", error);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("Failed to start MCP server:", error);
	process.exit(1);
});
