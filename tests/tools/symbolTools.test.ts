/**
 * Tests for symbol tools
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TypeScriptLSPClient } from "../../src/lsp/client.js";
import {
	getSymbolDetails,
	searchSymbols,
} from "../../src/tools/symbolTools.js";

describe("symbolTools", () => {
	let mockLSPClient: TypeScriptLSPClient;
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

		// Create a mock LSP client
		mockLSPClient = {
			isInitialized: vi.fn(() => true),
			getWorkspaceSymbols: vi.fn(async () => []),
			getHover: vi.fn(async () => null),
			getDefinition: vi.fn(async () => []),
			getReferences: vi.fn(async () => []),
		} as unknown as TypeScriptLSPClient;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("searchSymbols", () => {
		it("should return error when LSP client is not initialized", async () => {
			mockLSPClient.isInitialized = vi.fn(() => false);

			const result = await searchSymbols(mockLSPClient, tmpDir, "test");

			expect(result.content[0].text).toContain("Error");
			expect(result.content[0].text).toContain("not initialized");
		});

		it("should search workspace symbols via LSP", async () => {
			const mockSymbols = [
				{
					name: "TestFunction",
					kind: 12,
					location: {
						uri: `file://${tmpDir}/test.ts`,
						range: {
							start: { line: 0, character: 0 },
							end: { line: 0, character: 12 },
						},
					},
					containerName: "TestModule",
				},
			];

			mockLSPClient.getWorkspaceSymbols = vi.fn(async () => mockSymbols);

			const result = await searchSymbols(mockLSPClient, tmpDir, "Test");

			expect(result.content[0].text).toContain("TestFunction");
			expect(result.content[0].text).toContain("TestModule");
			expect(result.structuredContent?.symbols).toHaveLength(1);
			expect(result.structuredContent?.query).toBe("Test");
		});

		it("should fallback to manual search when LSP returns no results", async () => {
			writeFileSync(
				join(tmpDir, "sample.ts"),
				"function myTestFunction() {}",
			);

			mockLSPClient.getWorkspaceSymbols = vi.fn(async () => []);

			const result = await searchSymbols(mockLSPClient, tmpDir, "myTest");

			expect(result.structuredContent?.symbols.length).toBeGreaterThan(0);
		});

		it("should exclude node_modules during manual search", async () => {
			mkdirSync(join(tmpDir, "node_modules"));
			writeFileSync(
				join(tmpDir, "node_modules", "test.ts"),
				"function nodeModuleFunc() {}",
			);
			writeFileSync(join(tmpDir, "main.ts"), "function mainFunc() {}");

			mockLSPClient.getWorkspaceSymbols = vi.fn(async () => []);

			const result = await searchSymbols(mockLSPClient, tmpDir, "Func");

			const symbols = result.structuredContent?.symbols ?? [];
			const hasNodeModuleSymbol = symbols.some((s) =>
				s.location.uri.includes("node_modules"),
			);

			expect(hasNodeModuleSymbol).toBe(false);
		});

		it("should respect maxResults parameter", async () => {
			const manySymbols = Array.from({ length: 100 }, (_, i) => ({
				name: `Symbol${i}`,
				kind: 13,
				location: {
					uri: `file://${tmpDir}/test.ts`,
					range: {
						start: { line: i, character: 0 },
						end: { line: i, character: 7 },
					},
				},
			}));

			mockLSPClient.getWorkspaceSymbols = vi.fn(async () => manySymbols);

			const result = await searchSymbols(mockLSPClient, tmpDir, "Symbol", 10);

			expect(result.structuredContent?.symbols).toHaveLength(10);
		});

		it("should return no results message when no symbols found", async () => {
			mockLSPClient.getWorkspaceSymbols = vi.fn(async () => []);

			const result = await searchSymbols(
				mockLSPClient,
				tmpDir,
				"NonExistentSymbol",
			);

			expect(result.content[0].text).toContain("No symbols found");
			expect(result.content[0].text).toContain("NonExistentSymbol");
		});
	});

	describe("getSymbolDetails", () => {
		it("should return error when LSP client is not initialized", async () => {
			mockLSPClient.isInitialized = vi.fn(() => false);

			const result = await getSymbolDetails(
				mockLSPClient,
				tmpDir,
				"test.ts:10:5",
			);

			expect(result.content[0].text).toContain("Error");
			expect(result.content[0].text).toContain("not initialized");
		});

		it("should require position format", async () => {
			const result = await getSymbolDetails(mockLSPClient, tmpDir, "test.ts");

			expect(result.content[0].text).toContain("Error");
			expect(result.content[0].text).toContain("Position is required");
		});

		it("should get symbol details with hover, definitions, and references", async () => {
			const testFile = join(tmpDir, "test.ts");
			writeFileSync(testFile, "const myVar = 42;");

			mockLSPClient.getHover = vi.fn(async () => ({
				contents: "const myVar: number",
			}));

			mockLSPClient.getDefinition = vi.fn(async () => [
				{
					uri: `file://${testFile}`,
					range: {
						start: { line: 0, character: 6 },
						end: { line: 0, character: 11 },
					},
				},
			]);

			mockLSPClient.getReferences = vi.fn(async () => [
				{
					uri: `file://${testFile}`,
					range: {
						start: { line: 0, character: 6 },
						end: { line: 0, character: 11 },
					},
				},
			]);

			const result = await getSymbolDetails(
				mockLSPClient,
				tmpDir,
				"test.ts:1:7",
			);

			expect(result.content[0].text).toContain("Symbol Details");
			expect(result.content[0].text).toContain("myVar");
			expect(result.structuredContent?.name).toBe("myVar");
			expect(result.structuredContent?.hover).toBeDefined();
			expect(result.structuredContent?.definitions).toHaveLength(1);
			expect(result.structuredContent?.references).toHaveLength(1);
		});

		it("should extract symbol name from file content", async () => {
			const testFile = join(tmpDir, "test.ts");
			writeFileSync(testFile, "function testFunc() { return 42; }");

			mockLSPClient.getHover = vi.fn(async () => null);
			mockLSPClient.getDefinition = vi.fn(async () => []);
			mockLSPClient.getReferences = vi.fn(async () => []);

			const result = await getSymbolDetails(
				mockLSPClient,
				tmpDir,
				"test.ts:1:10",
			);

			expect(result.structuredContent?.name).toBe("testFunc");
		});

		it("should handle hover contents as array", async () => {
			const testFile = join(tmpDir, "test.ts");
			writeFileSync(testFile, "const myVar = 42;");

			mockLSPClient.getHover = vi.fn(async () => ({
				contents: [{ value: "const myVar: number" }, { value: "More info" }],
			}));

			mockLSPClient.getDefinition = vi.fn(async () => []);
			mockLSPClient.getReferences = vi.fn(async () => []);

			const result = await getSymbolDetails(
				mockLSPClient,
				tmpDir,
				"test.ts:1:7",
			);

			expect(result.content[0].text).toContain("Type Information");
		});

		it("should include definitions section", async () => {
			const testFile = join(tmpDir, "test.ts");
			writeFileSync(testFile, "const myVar = 42;");

			mockLSPClient.getHover = vi.fn(async () => null);

			mockLSPClient.getDefinition = vi.fn(async () => [
				{
					uri: `file://${testFile}`,
					range: {
						start: { line: 0, character: 6 },
						end: { line: 0, character: 11 },
					},
				},
			]);

			mockLSPClient.getReferences = vi.fn(async () => []);

			const result = await getSymbolDetails(
				mockLSPClient,
				tmpDir,
				"test.ts:1:7",
			);

			expect(result.content[0].text).toContain("Definitions (1)");
		});

		it("should include references section", async () => {
			const testFile = join(tmpDir, "test.ts");
			writeFileSync(testFile, "const myVar = 42;\nconsole.log(myVar);");

			mockLSPClient.getHover = vi.fn(async () => null);
			mockLSPClient.getDefinition = vi.fn(async () => []);

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
						start: { line: 1, character: 12 },
						end: { line: 1, character: 17 },
					},
				},
			]);

			const result = await getSymbolDetails(
				mockLSPClient,
				tmpDir,
				"test.ts:1:7",
			);

			expect(result.content[0].text).toContain("References (2)");
		});
	});
});
