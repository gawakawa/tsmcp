/**
 * Tests for file system tools
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listDirectory } from "../../src/tools/fileSystem.js";

describe("fileSystem", () => {
	describe("listDirectory", () => {
		it("should list files and directories", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			// Create test files and directories
			writeFileSync(join(tmpDir, "file1.ts"), "content1");
			writeFileSync(join(tmpDir, "file2.js"), "content2");
			mkdirSync(join(tmpDir, "subdir1"));
			mkdirSync(join(tmpDir, "subdir2"));

			const result = await listDirectory(tmpDir);

			expect(result.content).toBeDefined();
			expect(result.content[0].type).toBe("text");
			expect(result.content[0].text).toContain("Found 4 items");
			expect(result.content[0].text).toContain("file1.ts");
			expect(result.content[0].text).toContain("file2.js");
			expect(result.content[0].text).toContain("subdir1");
			expect(result.content[0].text).toContain("subdir2");

			expect(result.structuredContent).toBeDefined();
			expect(result.structuredContent?.entries).toHaveLength(4);
			expect(result.structuredContent?.path).toBe(".");
		});

		it("should sort directories before files", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			writeFileSync(join(tmpDir, "zzz.ts"), "content");
			mkdirSync(join(tmpDir, "aaa"));

			const result = await listDirectory(tmpDir);

			expect(result.structuredContent?.entries[0].name).toBe("aaa");
			expect(result.structuredContent?.entries[0].type).toBe("directory");
			expect(result.structuredContent?.entries[1].name).toBe("zzz.ts");
			expect(result.structuredContent?.entries[1].type).toBe("file");
		});

		it("should sort entries alphabetically within type", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			writeFileSync(join(tmpDir, "zebra.ts"), "content");
			writeFileSync(join(tmpDir, "apple.ts"), "content");
			mkdirSync(join(tmpDir, "xyz"));
			mkdirSync(join(tmpDir, "abc"));

			const result = await listDirectory(tmpDir);

			const entries = result.structuredContent?.entries ?? [];
			expect(entries[0].name).toBe("abc");
			expect(entries[1].name).toBe("xyz");
			expect(entries[2].name).toBe("apple.ts");
			expect(entries[3].name).toBe("zebra.ts");
		});

		it("should exclude node_modules directory", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			mkdirSync(join(tmpDir, "node_modules"));
			writeFileSync(join(tmpDir, "file.ts"), "content");

			const result = await listDirectory(tmpDir);

			expect(result.structuredContent?.entries).toHaveLength(1);
			expect(result.structuredContent?.entries[0].name).toBe("file.ts");
		});

		it("should exclude common build directories", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			mkdirSync(join(tmpDir, "dist"));
			mkdirSync(join(tmpDir, "build"));
			mkdirSync(join(tmpDir, ".next"));
			mkdirSync(join(tmpDir, "coverage"));
			writeFileSync(join(tmpDir, "file.ts"), "content");

			const result = await listDirectory(tmpDir);

			expect(result.structuredContent?.entries).toHaveLength(1);
			expect(result.structuredContent?.entries[0].name).toBe("file.ts");
		});

		it("should exclude hidden files and directories", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			writeFileSync(join(tmpDir, ".hidden"), "content");
			mkdirSync(join(tmpDir, ".hiddendir"));
			writeFileSync(join(tmpDir, "visible.ts"), "content");

			const result = await listDirectory(tmpDir);

			expect(result.structuredContent?.entries).toHaveLength(1);
			expect(result.structuredContent?.entries[0].name).toBe("visible.ts");
		});

		it("should handle subdirectories", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));
			const subDir = join(tmpDir, "subdir");

			mkdirSync(subDir);
			writeFileSync(join(subDir, "nested.ts"), "content");

			const result = await listDirectory(tmpDir, "subdir");

			expect(result.content[0].text).toContain("Directory: subdir");
			expect(result.content[0].text).toContain("nested.ts");
			expect(result.structuredContent?.path).toBe("subdir");
		});

		it("should display Root Directory for current directory", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));
			writeFileSync(join(tmpDir, "file.ts"), "content");

			const result = await listDirectory(tmpDir);

			expect(result.content[0].text).toContain("Root Directory");
		});

		it("should include directory and file icons", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			mkdirSync(join(tmpDir, "folder"));
			writeFileSync(join(tmpDir, "file.ts"), "content");

			const result = await listDirectory(tmpDir);

			expect(result.content[0].text).toContain("📁 folder");
			expect(result.content[0].text).toContain("📄 file.ts");
		});

		it("should return error response for non-existent directory", async () => {
			const result = await listDirectory("/nonexistent/directory");

			expect(result.content[0].type).toBe("text");
			expect(result.content[0].text).toContain("Error");
		});

		it("should handle empty directories", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			const result = await listDirectory(tmpDir);

			expect(result.content[0].text).toContain("Found 0 items");
		});
	});
});
