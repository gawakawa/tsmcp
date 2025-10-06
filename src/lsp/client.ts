/**
 * LSP Client for TypeScript Language Server
 */

import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import type {
	CompletionItem,
	Diagnostic,
	DocumentSymbol,
	FormattingOptions,
	Hover,
	InitializeParams,
	InitializeResult,
	Location,
	Position,
	PublishDiagnosticsParams,
	ServerCapabilities,
	SymbolInformation,
	TextEdit,
	WorkspaceEdit,
} from "vscode-languageserver-protocol";
import {
	createMessageConnection,
	type MessageConnection,
	StreamMessageReader,
	StreamMessageWriter,
} from "vscode-languageserver-protocol/node.js";
import type { ErrorContext, LSPClientConfig } from "../types.js";
import {
	isNotSupportedError,
	TSMCPError,
	withErrorHandling,
} from "../utils/errorHandler.js";
import {
	getLanguageId,
	pathToUri,
	readFileContent,
	uriToPath,
} from "../utils/pathUtils.js";

export class TypeScriptLSPClient extends EventEmitter {
	private connection?: MessageConnection;
	private serverProcess?: ChildProcess;
	private serverCapabilities?: ServerCapabilities;
	private initialized = false;
	private documentVersions = new Map<string, number>();
	private openDocuments = new Set<string>();
	private diagnostics = new Map<string, Diagnostic[]>();

	constructor(private config: LSPClientConfig) {
		super();
	}

	async start(): Promise<void> {
		if (this.initialized) return;

		try {
			// Start TypeScript language server
			const serverPath =
				this.config.typescriptServerPath || "typescript-language-server";
			this.serverProcess = spawn(serverPath, ["--stdio"], {
				stdio: ["pipe", "pipe", "pipe"],
			});

			if (!this.serverProcess.stdin || !this.serverProcess.stdout) {
				throw new Error("Failed to create TypeScript language server process");
			}

			// Create LSP connection
			const reader = new StreamMessageReader(this.serverProcess.stdout);
			const writer = new StreamMessageWriter(this.serverProcess.stdin);
			this.connection = createMessageConnection(reader, writer);

			// Handle server messages
			this.connection.onNotification(
				"textDocument/publishDiagnostics",
				(params: PublishDiagnosticsParams) => {
					this.diagnostics.set(params.uri, params.diagnostics);
					this.emit("diagnostics", params);
				},
			);

			// Handle process errors
			this.serverProcess.on("error", (error: Error) => {
				console.error("TypeScript language server error:", error);
				this.emit("error", error);
			});

			this.serverProcess.on("exit", (code: number | null) => {
				console.log(`TypeScript language server exited with code: ${code}`);
				this.initialized = false;
				this.emit("exit", code);
			});

			// Start listening
			this.connection.listen();

			// Initialize the server
			await this.initialize();
			this.initialized = true;
		} catch (error) {
			throw new TSMCPError(
				"Failed to start TypeScript language server",
				{ operation: "start" },
				error instanceof Error ? error : undefined,
			);
		}
	}

	async stop(): Promise<void> {
		if (this.connection) {
			try {
				await this.connection.sendRequest("shutdown");
				this.connection.sendNotification("exit");
			} catch (error) {
				console.warn("Error during LSP shutdown:", error);
			}
		}

		if (this.serverProcess) {
			this.serverProcess.kill();
		}

		this.initialized = false;
		this.connection = undefined;
		this.serverProcess = undefined;
		this.serverCapabilities = undefined;
		this.documentVersions.clear();
		this.openDocuments.clear();
		this.diagnostics.clear();
	}

	private async initialize(): Promise<void> {
		if (!this.connection) {
			throw new Error("Connection not established");
		}

		const initParams: InitializeParams = {
			processId: process.pid,
			rootUri: pathToUri(this.config.rootPath),
			capabilities: {
				workspace: {
					applyEdit: true,
					workspaceEdit: {
						documentChanges: true,
					},
					didChangeConfiguration: {
						dynamicRegistration: true,
					},
					didChangeWatchedFiles: {
						dynamicRegistration: true,
					},
					symbol: {
						dynamicRegistration: true,
					},
					executeCommand: {
						dynamicRegistration: true,
					},
				},
				textDocument: {
					publishDiagnostics: {
						relatedInformation: true,
					},
					synchronization: {
						dynamicRegistration: true,
						willSave: true,
						willSaveWaitUntil: true,
						didSave: true,
					},
					completion: {
						dynamicRegistration: true,
						completionItem: {
							snippetSupport: true,
							commitCharactersSupport: true,
							documentationFormat: ["markdown", "plaintext"],
						},
					},
					hover: {
						dynamicRegistration: true,
						contentFormat: ["markdown", "plaintext"],
					},
					signatureHelp: {
						dynamicRegistration: true,
					},
					definition: {
						dynamicRegistration: true,
					},
					references: {
						dynamicRegistration: true,
					},
					documentHighlight: {
						dynamicRegistration: true,
					},
					documentSymbol: {
						dynamicRegistration: true,
					},
					codeAction: {
						dynamicRegistration: true,
					},
					codeLens: {
						dynamicRegistration: true,
					},
					formatting: {
						dynamicRegistration: true,
					},
					rangeFormatting: {
						dynamicRegistration: true,
					},
					onTypeFormatting: {
						dynamicRegistration: true,
					},
					rename: {
						dynamicRegistration: true,
					},
				},
			},
			initializationOptions: this.config.initializationOptions || {
				preferences: {
					disableSuggestions: false,
				},
			},
		};

		const result = await this.connection.sendRequest<InitializeResult>(
			"initialize",
			initParams,
		);
		this.serverCapabilities = result.capabilities;
		this.connection.sendNotification("initialized");

		// Wait for TypeScript project to be fully loaded
		await this.waitForProjectReady();
	}

	private async waitForProjectReady(timeoutMs = 5000): Promise<void> {
		if (!this.connection) return;

		const startTime = Date.now();

		while (Date.now() - startTime < timeoutMs) {
			try {
				// Try a simple workspace symbol query to verify project is loaded
				const result = await this.connection.sendRequest<unknown>(
					"workspace/symbol",
					{ query: "" },
				);

				// If we get a result (even empty array), project is ready
				if (result !== null && result !== undefined) {
					console.log("TypeScript project loaded successfully");
					return;
				}
			} catch (error) {
				// Project not ready yet, wait and retry
				if (error instanceof Error && error.message.includes("No Project")) {
					await new Promise((resolve) => setTimeout(resolve, 500));
					continue;
				}
				// Other errors should be logged but not thrown
				console.warn("Error checking project readiness:", error);
			}
		}

		console.warn(
			"TypeScript project may not be fully loaded after initialization",
		);
	}

	supportsFeature(feature: string): boolean {
		if (!this.serverCapabilities) return false;

		const caps = this.serverCapabilities as Record<string, unknown>;
		switch (feature) {
			case "hover":
				return !!caps.hoverProvider;
			case "completion":
				return !!caps.completionProvider;
			case "definition":
				return !!caps.definitionProvider;
			case "references":
				return !!caps.referencesProvider;
			case "rename":
				return !!caps.renameProvider;
			case "documentSymbol":
				return !!caps.documentSymbolProvider;
			case "workspaceSymbol":
				return !!caps.workspaceSymbolProvider;
			case "codeAction":
				return !!caps.codeActionProvider;
			case "formatting":
				return !!caps.documentFormattingProvider;
			case "rangeFormatting":
				return !!caps.documentRangeFormattingProvider;
			case "signatureHelp":
				return !!caps.signatureHelpProvider;
			case "diagnostics":
				return true; // Usually always supported
			default:
				return false;
		}
	}

	getServerCapabilities(): ServerCapabilities | undefined {
		return this.serverCapabilities;
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	// Document management
	private openDocument(uri: string, text: string, languageId?: string): void {
		if (!this.connection || this.openDocuments.has(uri)) return;

		const actualLanguageId = languageId || getLanguageId(uriToPath(uri));
		const version = 1;
		this.documentVersions.set(uri, version);
		this.openDocuments.add(uri);

		this.connection.sendNotification("textDocument/didOpen", {
			textDocument: {
				uri,
				languageId: actualLanguageId,
				version,
				text,
			},
		});
	}

	private closeDocument(uri: string): void {
		if (!this.connection || !this.openDocuments.has(uri)) return;

		this.connection.sendNotification("textDocument/didClose", {
			textDocument: { uri },
		});

		this.openDocuments.delete(uri);
		this.documentVersions.delete(uri);
		this.diagnostics.delete(uri);
	}

	private ensureDocumentOpen(filePath: string): string {
		const uri = pathToUri(filePath);

		if (!this.openDocuments.has(uri)) {
			const content = readFileContent(filePath);
			this.openDocument(uri, content);
		}

		return uri;
	}

	// LSP operations
	async getHover(filePath: string, position: Position): Promise<Hover | null> {
		const context: ErrorContext = {
			operation: "getHover",
			file: filePath,
			position,
		};

		return withErrorHandling(async () => {
			if (!this.connection) throw new Error("LSP client not initialized");
			if (!this.supportsFeature("hover"))
				throw new Error("Hover not supported");

			const uri = this.ensureDocumentOpen(filePath);

			const result = await this.connection.sendRequest<Hover | null>(
				"textDocument/hover",
				{
					textDocument: { uri },
					position,
				},
			);

			return result;
		}, context);
	}

	async getDefinition(
		filePath: string,
		position: Position,
	): Promise<Location[]> {
		const context: ErrorContext = {
			operation: "getDefinition",
			file: filePath,
			position,
		};

		return withErrorHandling(async () => {
			if (!this.connection) throw new Error("LSP client not initialized");
			if (!this.supportsFeature("definition"))
				throw new Error("Definition not supported");

			const uri = this.ensureDocumentOpen(filePath);

			const result = await this.connection.sendRequest(
				"textDocument/definition",
				{
					textDocument: { uri },
					position,
				},
			);

			// Handle different result types
			if (!result) return [];
			if (Array.isArray(result)) return result as Location[];
			return [result as Location];
		}, context);
	}

	async getReferences(
		filePath: string,
		position: Position,
		includeDeclaration = true,
	): Promise<Location[]> {
		const context: ErrorContext = {
			operation: "getReferences",
			file: filePath,
			position,
		};

		return withErrorHandling(async () => {
			if (!this.connection) throw new Error("LSP client not initialized");
			if (!this.supportsFeature("references"))
				throw new Error("References not supported");

			const uri = this.ensureDocumentOpen(filePath);

			const result = await this.connection.sendRequest<Location[] | null>(
				"textDocument/references",
				{
					textDocument: { uri },
					position,
					context: { includeDeclaration },
				},
			);

			return result || [];
		}, context);
	}

	async getDocumentSymbols(
		filePath: string,
	): Promise<DocumentSymbol[] | SymbolInformation[]> {
		const context: ErrorContext = {
			operation: "getDocumentSymbols",
			file: filePath,
		};

		return withErrorHandling(async () => {
			if (!this.connection) throw new Error("LSP client not initialized");
			if (!this.supportsFeature("documentSymbol"))
				throw new Error("Document symbols not supported");

			const uri = this.ensureDocumentOpen(filePath);

			const result = await this.connection.sendRequest<
				DocumentSymbol[] | SymbolInformation[] | null
			>("textDocument/documentSymbol", {
				textDocument: { uri },
			});

			return result || [];
		}, context);
	}

	async getWorkspaceSymbols(query: string): Promise<SymbolInformation[]> {
		const context: ErrorContext = {
			operation: "getWorkspaceSymbols",
			symbolName: query,
		};

		return withErrorHandling(async () => {
			if (!this.connection) throw new Error("LSP client not initialized");
			if (!this.supportsFeature("workspaceSymbol"))
				throw new Error("Workspace symbols not supported");

			const result = await this.connection.sendRequest<
				SymbolInformation[] | null
			>("workspace/symbol", {
				query,
			});

			return result || [];
		}, context);
	}

	async getCompletion(
		filePath: string,
		position: Position,
	): Promise<CompletionItem[]> {
		const context: ErrorContext = {
			operation: "getCompletion",
			file: filePath,
			position,
		};

		return withErrorHandling(async () => {
			if (!this.connection) throw new Error("LSP client not initialized");
			if (!this.supportsFeature("completion"))
				throw new Error("Completion not supported");

			const uri = this.ensureDocumentOpen(filePath);

			const result = await this.connection.sendRequest(
				"textDocument/completion",
				{
					textDocument: { uri },
					position,
				},
			);

			// Handle CompletionList or CompletionItem[]
			if (!result) return [];
			if (Array.isArray(result)) return result;
			return (result as { items?: CompletionItem[] }).items || [];
		}, context);
	}

	async getDiagnostics(filePath: string): Promise<Diagnostic[]> {
		const uri = pathToUri(filePath);
		return this.diagnostics.get(uri) || [];
	}

	async formatDocument(
		filePath: string,
		options: FormattingOptions,
	): Promise<TextEdit[]> {
		const context: ErrorContext = {
			operation: "formatDocument",
			file: filePath,
		};

		return withErrorHandling(async () => {
			if (!this.connection) throw new Error("LSP client not initialized");
			if (!this.supportsFeature("formatting"))
				throw new Error("Document formatting not supported");

			const uri = this.ensureDocumentOpen(filePath);

			const result = await this.connection.sendRequest<TextEdit[] | null>(
				"textDocument/formatting",
				{
					textDocument: { uri },
					options,
				},
			);

			return result || [];
		}, context);
	}

	async renameSymbol(
		filePath: string,
		position: Position,
		newName: string,
	): Promise<WorkspaceEdit | null> {
		const context: ErrorContext = {
			operation: "renameSymbol",
			file: filePath,
			position,
		};

		return withErrorHandling(async () => {
			if (!this.connection) throw new Error("LSP client not initialized");
			if (!this.supportsFeature("rename"))
				throw new Error("Rename not supported");

			const uri = this.ensureDocumentOpen(filePath);

			try {
				const result = await this.connection.sendRequest<WorkspaceEdit | null>(
					"textDocument/rename",
					{
						textDocument: { uri },
						position,
						newName,
					},
				);

				return result;
			} catch (error) {
				if (isNotSupportedError(error)) {
					return null;
				}
				throw error;
			}
		}, context);
	}

	// Cleanup method to close documents when done
	cleanup(): void {
		for (const uri of this.openDocuments) {
			this.closeDocument(uri);
		}
	}
}
