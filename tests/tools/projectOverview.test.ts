/**
 * Tests for project overview tool
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getProjectOverview } from "../../src/tools/projectOverview.js";

describe("projectOverview", () => {
	describe("getProjectOverview", () => {
		it("should analyze a simple project", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			writeFileSync(join(tmpDir, "file1.ts"), "const x = 1;\nconst y = 2;");
			writeFileSync(join(tmpDir, "file2.js"), "console.log('hello');");

			const result = await getProjectOverview(tmpDir);

			expect(result.content[0].type).toBe("text");
			expect(result.content[0].text).toContain("Project Overview");
			expect(result.content[0].text).toContain("Total Files");
			expect(result.structuredContent).toBeDefined();
			expect(result.structuredContent?.totalFiles).toBe(2);
		});

		it("should count files by extension", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			writeFileSync(join(tmpDir, "file1.ts"), "");
			writeFileSync(join(tmpDir, "file2.ts"), "");
			writeFileSync(join(tmpDir, "file3.js"), "");

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.filesByExtension[".ts"]).toBe(2);
			expect(result.structuredContent?.filesByExtension[".js"]).toBe(1);
		});

		it("should count lines in TypeScript files", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			writeFileSync(
				join(tmpDir, "file1.ts"),
				"line1\nline2\nline3\nline4\nline5",
			);
			writeFileSync(join(tmpDir, "file2.ts"), "line1\nline2");

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.totalLines).toBe(7);
		});

		it("should list top level directories", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			mkdirSync(join(tmpDir, "src"));
			mkdirSync(join(tmpDir, "tests"));
			mkdirSync(join(tmpDir, "docs"));

			writeFileSync(join(tmpDir, "src", "index.ts"), "");

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.topLevelDirectories).toContain("src");
			expect(result.structuredContent?.topLevelDirectories).toContain("tests");
			expect(result.structuredContent?.topLevelDirectories).toContain("docs");
		});

		it("should exclude node_modules directory", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			mkdirSync(join(tmpDir, "node_modules"));
			writeFileSync(join(tmpDir, "node_modules", "package.js"), "");
			writeFileSync(join(tmpDir, "index.ts"), "");

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.totalFiles).toBe(1);
			expect(result.structuredContent?.topLevelDirectories).not.toContain(
				"node_modules",
			);
		});

		it("should exclude common build directories", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			mkdirSync(join(tmpDir, "dist"));
			mkdirSync(join(tmpDir, "build"));
			mkdirSync(join(tmpDir, ".next"));
			mkdirSync(join(tmpDir, "coverage"));

			writeFileSync(join(tmpDir, "dist", "output.js"), "");
			writeFileSync(join(tmpDir, "build", "output.js"), "");

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.totalFiles).toBe(0);
			expect(result.structuredContent?.topLevelDirectories).not.toContain(
				"dist",
			);
			expect(result.structuredContent?.topLevelDirectories).not.toContain(
				"build",
			);
		});

		it("should exclude hidden directories", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			mkdirSync(join(tmpDir, ".git"));
			mkdirSync(join(tmpDir, ".vscode"));
			mkdirSync(join(tmpDir, ".idea"));

			writeFileSync(join(tmpDir, ".git", "config"), "");

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.topLevelDirectories).not.toContain(
				".git",
			);
			expect(result.structuredContent?.topLevelDirectories).not.toContain(
				".vscode",
			);
		});

		it("should count files without extension", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			writeFileSync(join(tmpDir, "README"), "content");
			writeFileSync(join(tmpDir, "Makefile"), "content");

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.filesByExtension["[no extension]"]).toBe(
				2,
			);
		});

		it("should handle nested directory structures", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			mkdirSync(join(tmpDir, "src"));
			mkdirSync(join(tmpDir, "src", "utils"));
			mkdirSync(join(tmpDir, "src", "components"));

			writeFileSync(join(tmpDir, "src", "index.ts"), "");
			writeFileSync(join(tmpDir, "src", "utils", "helper.ts"), "");
			writeFileSync(join(tmpDir, "src", "components", "App.tsx"), "");

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.totalFiles).toBe(3);
			expect(result.structuredContent?.filesByExtension[".ts"]).toBe(2);
			expect(result.structuredContent?.filesByExtension[".tsx"]).toBe(1);
		});

		it("should count lines in various text files", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			writeFileSync(join(tmpDir, "file.ts"), "line1\nline2");
			writeFileSync(join(tmpDir, "file.md"), "line1\nline2\nline3");
			writeFileSync(join(tmpDir, "file.json"), '{"key": "value"}');

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.totalLines).toBeGreaterThan(0);
		});

		it("should handle empty project", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.totalFiles).toBe(0);
			expect(result.structuredContent?.totalLines).toBe(0);
			expect(result.structuredContent?.topLevelDirectories).toHaveLength(0);
		});

		it("should format overview text correctly", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			mkdirSync(join(tmpDir, "src"));
			writeFileSync(join(tmpDir, "src", "index.ts"), "");

			const result = await getProjectOverview(tmpDir);

			expect(result.content[0].text).toContain("# Project Overview");
			expect(result.content[0].text).toContain("## Summary");
			expect(result.content[0].text).toContain("## Files by Extension");
			expect(result.content[0].text).toContain("## Project Structure");
		});

		it("should handle non-existent directory gracefully", async () => {
			const result = await getProjectOverview("/nonexistent/directory");

			// The function logs a warning but returns empty stats
			expect(result.structuredContent?.totalFiles).toBe(0);
			expect(result.content[0].text).toContain("Project Overview");
		});

		it("should handle unreadable files gracefully", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "tsmcp-test-"));

			writeFileSync(join(tmpDir, "good.ts"), "const x = 1;");
			// Create a file that might cause read issues (binary file)
			writeFileSync(join(tmpDir, "data.bin"), Buffer.from([0, 1, 2, 3]));

			const result = await getProjectOverview(tmpDir);

			expect(result.structuredContent?.totalFiles).toBeGreaterThanOrEqual(1);
		});
	});
});
