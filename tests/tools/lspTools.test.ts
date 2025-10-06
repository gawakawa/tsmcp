/**
 * Tests for LSP tools
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TypeScriptLSPClient } from "../../src/lsp/client.js";
import {
	lspFindReferences,
	lspFormatDocument,
	lspGetCompletion,
	lspGetDefinitions,
	lspGetDiagnostics,
	lspGetHover,
} from "../../src/tools/lspTools.js";

describe("lspTools", () => {
	let mockLSPClient: TypeScriptLSPClient;
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

		mockLSPClient = {
			isInitialized: vi.fn(() => true),
			getHover: vi.fn(async () => null),
			getDefinition: vi.fn(async () => []),
			getReferences: vi.fn(async () => []),
			getCompletion: vi.fn(async () => []),
			getDiagnostics: vi.fn(async () => []),
			formatDocument: vi.fn(async () => []),
		} as unknown as TypeScriptLSPClient;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("lspGetHover", () => {
		it("should return error when LSP client is not initialized", async () => {
			mockLSPClient.isInitialized = vi.fn(() => false);

			const result = await lspGetHover(mockLSPClient, tmpDir, "test.ts:10:5");

			expect(result.content[0].text).toContain("Error");
			expect(result.content[0].text).toContain("not initialized");
		});

		it("should require position format", async () => {
			const result = await lspGetHover(mockLSPClient, tmpDir, "test.ts");

			expect(result.content[0].text).toContain("Error");
			expect(result.content[0].text).toContain("Position is required");
		});

		it("should get hover information as string", async () => {
			mockLSPClient.getHover = vi.fn(async () => ({
				contents: "const myVar: number",
			}));

			const result = await lspGetHover(mockLSPClient, tmpDir, "test.ts:1:5");

			expect(result.content[0].text).toContain("Hover Information");
			expect(result.content[0].text).toContain("const myVar: number");
			expect(result.structuredContent?.hover).toBeDefined();
		});

		it("should get hover information as array", async () => {
			mockLSPClient.getHover = vi.fn(async () => ({
				contents: [
					{ value: "function test(): void" },
					{ value: "Additional info" },
				],
			}));

			const result = await lspGetHover(mockLSPClient, tmpDir, "test.ts:1:5");

			expect(result.content[0].text).toContain("function test(): void");
			expect(result.content[0].text).toContain("Additional info");
		});

		it("should handle no hover information", async () => {
			mockLSPClient.getHover = vi.fn(async () => null);

			const result = await lspGetHover(mockLSPClient, tmpDir, "test.ts:1:5");

			expect(result.content[0].text).toContain(
				"No hover information available",
			);
		});

		it("should clean up code block markers", async () => {
			mockLSPClient.getHover = vi.fn(async () => ({
				contents: "```typescript\nconst x: number\n```",
			}));

			const result = await lspGetHover(mockLSPClient, tmpDir, "test.ts:1:5");

			// Should not have nested code blocks
			const codeBlockCount = (result.content[0].text.match(/```/g) || [])
				.length;
			expect(codeBlockCount).toBe(2); // Only the outer code block
		});
	});

	describe("lspGetDefinitions", () => {
		it("should return error when LSP client is not initialized", async () => {
			mockLSPClient.isInitialized = vi.fn(() => false);

			const result = await lspGetDefinitions(
				mockLSPClient,
				tmpDir,
				"test.ts:10:5",
			);

			expect(result.content[0].text).toContain("Error");
		});

		it("should require position format", async () => {
			const result = await lspGetDefinitions(mockLSPClient, tmpDir, "test.ts");

			expect(result.content[0].text).toContain("Error");
			expect(result.content[0].text).toContain("Position is required");
		});

		it("should get definitions", async () => {
			const testFile = join(tmpDir, "test.ts");
			mockLSPClient.getDefinition = vi.fn(async () => [
				{
					uri: `file://${testFile}`,
					range: {
						start: { line: 5, character: 10 },
						end: { line: 5, character: 20 },
					},
				},
			]);

			const result = await lspGetDefinitions(
				mockLSPClient,
				tmpDir,
				"test.ts:1:5",
			);

			expect(result.content[0].text).toContain("Definition Results");
			expect(result.content[0].text).toContain("Found 1 definition(s)");
			expect(result.structuredContent?.definitions).toHaveLength(1);
		});

		it("should handle no definitions found", async () => {
			mockLSPClient.getDefinition = vi.fn(async () => []);

			const result = await lspGetDefinitions(
				mockLSPClient,
				tmpDir,
				"test.ts:1:5",
			);

			expect(result.content[0].text).toContain("No definitions found");
		});

		it("should list multiple definitions", async () => {
			const testFile = join(tmpDir, "test.ts");
			mockLSPClient.getDefinition = vi.fn(async () => [
				{
					uri: `file://${testFile}`,
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 10 },
					},
				},
				{
					uri: `file://${testFile}`,
					range: {
						start: { line: 10, character: 0 },
						end: { line: 10, character: 10 },
					},
				},
			]);

			const result = await lspGetDefinitions(
				mockLSPClient,
				tmpDir,
				"test.ts:1:5",
			);

			expect(result.content[0].text).toContain("Found 2 definition(s)");
		});
	});

	describe("lspFindReferences", () => {
		it("should return error when LSP client is not initialized", async () => {
			mockLSPClient.isInitialized = vi.fn(() => false);

			const result = await lspFindReferences(
				mockLSPClient,
				tmpDir,
				"test.ts:10:5",
			);

			expect(result.content[0].text).toContain("Error");
		});

		it("should find references", async () => {
			const testFile = join(tmpDir, "test.ts");
			mockLSPClient.getReferences = vi.fn(async () => [
				{
					uri: `file://${testFile}`,
					range: {
						start: { line: 0, character: 6 },
						end: { line: 0, character: 11 },
					},
				},
				{
					uri: `file://${testFile}`,
					range: {
						start: { line: 5, character: 12 },
						end: { line: 5, character: 17 },
					},
				},
			]);

			const result = await lspFindReferences(
				mockLSPClient,
				tmpDir,
				"test.ts:1:7",
			);

			expect(result.content[0].text).toContain("References");
			expect(result.content[0].text).toContain("Found 2 reference(s)");
			expect(result.structuredContent?.references).toHaveLength(2);
		});

		it("should handle no references found", async () => {
			mockLSPClient.getReferences = vi.fn(async () => []);

			const result = await lspFindReferences(
				mockLSPClient,
				tmpDir,
				"test.ts:1:5",
			);

			expect(result.content[0].text).toContain("No references found");
		});

		it("should pass includeDeclaration parameter", async () => {
			mockLSPClient.getReferences = vi.fn(async () => []);

			await lspFindReferences(mockLSPClient, tmpDir, "test.ts:1:5", false);

			expect(mockLSPClient.getReferences).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Object),
				false,
			);
		});
	});

	describe("lspGetCompletion", () => {
		it("should return error when LSP client is not initialized", async () => {
			mockLSPClient.isInitialized = vi.fn(() => false);

			const result = await lspGetCompletion(
				mockLSPClient,
				tmpDir,
				"test.ts:10:5",
			);

			expect(result.content[0].text).toContain("Error");
		});

		it("should get completions", async () => {
			mockLSPClient.getCompletion = vi.fn(async () => [
				{ label: "myFunction", kind: 3, detail: "() => void" },
				{ label: "myVariable", kind: 6, detail: "number" },
			]);

			const result = await lspGetCompletion(
				mockLSPClient,
				tmpDir,
				"test.ts:1:5",
			);

			expect(result.content[0].text).toContain("Code Completion");
			expect(result.content[0].text).toContain("myFunction");
			expect(result.content[0].text).toContain("myVariable");
			expect(result.structuredContent?.completions).toHaveLength(2);
		});

		it("should respect maxResults parameter", async () => {
			const manyCompletions = Array.from({ length: 50 }, (_, i) => ({
				label: `item${i}`,
				kind: 1,
			}));

			mockLSPClient.getCompletion = vi.fn(async () => manyCompletions);

			const result = await lspGetCompletion(
				mockLSPClient,
				tmpDir,
				"test.ts:1:5",
				10,
			);

			expect(result.structuredContent?.completions).toHaveLength(10);
			expect(result.content[0].text).toContain("showing first 10 of 50");
		});

		it("should handle no completions", async () => {
			mockLSPClient.getCompletion = vi.fn(async () => []);

			const result = await lspGetCompletion(
				mockLSPClient,
				tmpDir,
				"test.ts:1:5",
			);

			expect(result.content[0].text).toContain("No completions available");
		});
	});

	describe("lspGetDiagnostics", () => {
		it("should return error when LSP client is not initialized", async () => {
			mockLSPClient.isInitialized = vi.fn(() => false);

			const result = await lspGetDiagnostics(mockLSPClient, tmpDir, "test.ts");

			expect(result.content[0].text).toContain("Error");
		});

		it("should get diagnostics", async () => {
			mockLSPClient.getDiagnostics = vi.fn(async () => [
				{
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 10 },
					},
					message: "Type 'string' is not assignable to type 'number'",
					severity: 1,
					source: "ts",
				},
			]);

			const result = await lspGetDiagnostics(mockLSPClient, tmpDir, "test.ts");

			expect(result.content[0].text).toContain("Diagnostics");
			expect(result.content[0].text).toContain("Found 1 diagnostic(s)");
			expect(result.content[0].text).toContain("Error");
			expect(result.structuredContent?.diagnostics).toHaveLength(1);
		});

		it("should handle no diagnostics", async () => {
			mockLSPClient.getDiagnostics = vi.fn(async () => []);

			const result = await lspGetDiagnostics(mockLSPClient, tmpDir, "test.ts");

			expect(result.content[0].text).toContain("No diagnostics found");
			expect(result.content[0].text).toContain("✅");
		});

		it("should show diagnostic severity levels", async () => {
			mockLSPClient.getDiagnostics = vi.fn(async () => [
				{
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 1 },
					},
					message: "Error message",
					severity: 1,
				},
				{
					range: {
						start: { line: 1, character: 0 },
						end: { line: 1, character: 1 },
					},
					message: "Warning message",
					severity: 2,
				},
			]);

			const result = await lspGetDiagnostics(mockLSPClient, tmpDir, "test.ts");

			expect(result.content[0].text).toContain("Error");
			expect(result.content[0].text).toContain("Warning");
		});
	});

	describe("lspFormatDocument", () => {
		it("should return error when LSP client is not initialized", async () => {
			mockLSPClient.isInitialized = vi.fn(() => false);

			const result = await lspFormatDocument(
				mockLSPClient,
				tmpDir,
				"test.ts",
			);

			expect(result.content[0].text).toContain("Error");
		});

		it("should get formatting edits", async () => {
			mockLSPClient.formatDocument = vi.fn(async () => [
				{
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 10 },
					},
					newText: "const x = 1;",
				},
			]);

			const result = await lspFormatDocument(
				mockLSPClient,
				tmpDir,
				"test.ts",
			);

			expect(result.content[0].text).toContain("Document Formatting");
			expect(result.content[0].text).toContain("Found 1 formatting change(s)");
			expect(result.structuredContent?.edits).toHaveLength(1);
		});

		it("should handle no formatting changes needed", async () => {
			mockLSPClient.formatDocument = vi.fn(async () => []);

			const result = await lspFormatDocument(
				mockLSPClient,
				tmpDir,
				"test.ts",
			);

			expect(result.content[0].text).toContain(
				"Document is already properly formatted",
			);
			expect(result.content[0].text).toContain("✅");
		});

		it("should truncate long text in preview", async () => {
			const longText = "a".repeat(100);
			mockLSPClient.formatDocument = vi.fn(async () => [
				{
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 10 },
					},
					newText: longText,
				},
			]);

			const result = await lspFormatDocument(
				mockLSPClient,
				tmpDir,
				"test.ts",
			);

			expect(result.content[0].text).toContain("...");
		});

		it("should pass formatting options", async () => {
			mockLSPClient.formatDocument = vi.fn(async () => []);

			await lspFormatDocument(mockLSPClient, tmpDir, "test.ts", {
				tabSize: 4,
				insertSpaces: false,
			});

			expect(mockLSPClient.formatDocument).toHaveBeenCalledWith(
				expect.any(String),
				{ tabSize: 4, insertSpaces: false },
			);
		});
	});
});
