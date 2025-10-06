/**
 * Tests for path utilities
 */

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	extractPathAndPosition,
	findSymbolInLine,
	getLanguageId,
	getRelativePath,
	isTypeScriptFile,
	normalizeUri,
	parseLineNumber,
	pathToUri,
	readFileContent,
	resolveRelativePath,
	uriToPath,
} from "../../src/utils/pathUtils.js";

describe("pathUtils", () => {
	describe("normalizeUri", () => {
		it("should normalize a path to a file URI", () => {
			const result = normalizeUri("/test/path.ts");
			expect(result).toMatch(/^file:\/\//);
			expect(result).toContain("/test/path.ts");
		});

		it("should leave a file URI unchanged", () => {
			const uri = "file:///test/path.ts";
			const result = normalizeUri(uri);
			expect(result).toBe(uri);
		});
	});

	describe("uriToPath", () => {
		it("should convert a file URI to a path", () => {
			const result = uriToPath("file:///test/path.ts");
			expect(result).toBe("/test/path.ts");
		});

		it("should leave a non-URI path unchanged", () => {
			const path = "/test/path.ts";
			const result = uriToPath(path);
			expect(result).toBe(path);
		});
	});

	describe("pathToUri", () => {
		it("should convert a path to a file URI", () => {
			const result = pathToUri("/test/path.ts");
			expect(result).toMatch(/^file:\/\//);
			expect(result).toContain("/test/path.ts");
		});
	});

	describe("resolveRelativePath", () => {
		it("should resolve a relative path from root", () => {
			const result = resolveRelativePath("/root", "src/test.ts");
			expect(result).toContain("/root/src/test.ts");
		});
	});

	describe("getRelativePath", () => {
		it("should get relative path from root to absolute path", () => {
			const result = getRelativePath("/root", "/root/src/test.ts");
			expect(result).toBe("src/test.ts");
		});
	});

	describe("isTypeScriptFile", () => {
		it("should return true for TypeScript files", () => {
			expect(isTypeScriptFile("test.ts")).toBe(true);
			expect(isTypeScriptFile("test.tsx")).toBe(true);
		});

		it("should return true for JavaScript files", () => {
			expect(isTypeScriptFile("test.js")).toBe(true);
			expect(isTypeScriptFile("test.jsx")).toBe(true);
		});

		it("should return false for other file types", () => {
			expect(isTypeScriptFile("test.py")).toBe(false);
			expect(isTypeScriptFile("test.txt")).toBe(false);
			expect(isTypeScriptFile("test.md")).toBe(false);
		});

		it("should be case insensitive", () => {
			expect(isTypeScriptFile("test.TS")).toBe(true);
			expect(isTypeScriptFile("test.TSX")).toBe(true);
			expect(isTypeScriptFile("test.JS")).toBe(true);
			expect(isTypeScriptFile("test.JSX")).toBe(true);
		});
	});

	describe("getLanguageId", () => {
		it("should return correct language ID for TypeScript files", () => {
			expect(getLanguageId("test.ts")).toBe("typescript");
			expect(getLanguageId("test.tsx")).toBe("typescriptreact");
		});

		it("should return correct language ID for JavaScript files", () => {
			expect(getLanguageId("test.js")).toBe("javascript");
			expect(getLanguageId("test.jsx")).toBe("javascriptreact");
		});

		it("should default to typescript for unknown extensions", () => {
			expect(getLanguageId("test.py")).toBe("typescript");
			expect(getLanguageId("test.txt")).toBe("typescript");
		});

		it("should be case insensitive", () => {
			expect(getLanguageId("test.TS")).toBe("typescript");
			expect(getLanguageId("test.TSX")).toBe("typescriptreact");
		});
	});

	describe("parseLineNumber", () => {
		it("should parse line and character from format :line:char", () => {
			const result = parseLineNumber(":10:5");
			expect(result).toEqual({ line: 9, character: 4 });
		});

		it("should parse line only from format :line", () => {
			const result = parseLineNumber(":10");
			expect(result).toEqual({ line: 9, character: 0 });
		});

		it("should parse from full path format file.ts:10:5", () => {
			const result = parseLineNumber("file.ts:10:5");
			expect(result).toEqual({ line: 9, character: 4 });
		});

		it("should return null for invalid format", () => {
			const result = parseLineNumber("invalid");
			expect(result).toBeNull();
		});
	});

	describe("extractPathAndPosition", () => {
		it("should extract path and position from file.ts:10:5", () => {
			const result = extractPathAndPosition("file.ts:10:5");
			expect(result.path).toBe("file.ts");
			expect(result.position).toEqual({ line: 9, character: 4 });
		});

		it("should extract path and position from file.ts:10", () => {
			const result = extractPathAndPosition("file.ts:10");
			expect(result.path).toBe("file.ts");
			expect(result.position).toEqual({ line: 9, character: 0 });
		});

		it("should extract path without position", () => {
			const result = extractPathAndPosition("file.ts");
			expect(result.path).toBe("file.ts");
			expect(result.position).toBeNull();
		});

		it("should handle absolute paths", () => {
			const result = extractPathAndPosition("/root/src/file.ts:10:5");
			expect(result.path).toBe("/root/src/file.ts");
			expect(result.position).toEqual({ line: 9, character: 4 });
		});
	});

	describe("readFileContent", () => {
		it("should read file content successfully", () => {
			const tmpFile = join(tmpdir(), `test-${Date.now()}.txt`);
			const content = "test content";
			writeFileSync(tmpFile, content);

			const result = readFileContent(tmpFile);
			expect(result).toBe(content);
		});

		it("should throw error for non-existent file", () => {
			const nonExistentFile = "/path/to/nonexistent/file.txt";
			expect(() => readFileContent(nonExistentFile)).toThrow(/Failed to read file/);
		});
	});

	describe("findSymbolInLine", () => {
		const testContent = "const foo = 42;\nfunction bar() {}\n  let baz = true;";

		it("should find symbol in line", () => {
			const result = findSymbolInLine(testContent, 0, "foo");
			expect(result).toEqual({ line: 0, character: 6 });
		});

		it("should return null for symbol not in line", () => {
			const result = findSymbolInLine(testContent, 0, "bar");
			expect(result).toBeNull();
		});

		it("should return first non-whitespace position when no symbol specified", () => {
			const result = findSymbolInLine(testContent, 2);
			expect(result).toEqual({ line: 2, character: 2 });
		});

		it("should return position 0 for empty line when no symbol specified", () => {
			const emptyLineContent = "\n\n";
			const result = findSymbolInLine(emptyLineContent, 0);
			expect(result).toEqual({ line: 0, character: 0 });
		});

		it("should return null for line out of bounds", () => {
			const result = findSymbolInLine(testContent, 100, "foo");
			expect(result).toBeNull();
		});

		it("should return null for negative line number", () => {
			const result = findSymbolInLine(testContent, -1, "foo");
			expect(result).toBeNull();
		});
	});
});
