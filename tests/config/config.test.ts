/**
 * Tests for configuration
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDefaultConfig, loadConfig } from "../../src/config/config.js";

describe("config", () => {
	describe("getDefaultConfig", () => {
		it("should return default configuration", () => {
			const config = getDefaultConfig();

			expect(config).toMatchObject({
				workspaceRoot: expect.any(String),
				timeout: 5000,
				maxResults: 50,
				filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
			});

			expect(config.excludePatterns).toContain("node_modules/**");
			expect(config.excludePatterns).toContain(".git/**");
		});

		it("should use process.cwd() as workspaceRoot", () => {
			const config = getDefaultConfig();
			expect(config.workspaceRoot).toBe(process.cwd());
		});

		it("should include test files in exclude patterns", () => {
			const config = getDefaultConfig();
			expect(config.excludePatterns).toContain("**/*.test.ts");
			expect(config.excludePatterns).toContain("**/*.test.tsx");
			expect(config.excludePatterns).toContain("**/*.spec.ts");
			expect(config.excludePatterns).toContain("**/*.spec.tsx");
		});

		it("should include common build directories in exclude patterns", () => {
			const config = getDefaultConfig();
			expect(config.excludePatterns).toContain("dist/**");
			expect(config.excludePatterns).toContain("build/**");
			expect(config.excludePatterns).toContain(".next/**");
			expect(config.excludePatterns).toContain("coverage/**");
		});
	});

	describe("loadConfig", () => {
		const originalEnv = process.env;

		beforeEach(() => {
			// Reset environment variables
			process.env = { ...originalEnv };
		});

		afterEach(() => {
			// Restore original environment
			process.env = originalEnv;
		});

		it("should return default config when no environment variables are set", () => {
			delete process.env.TSMCP_ROOT;
			delete process.env.TSMCP_TIMEOUT;
			delete process.env.TSMCP_MAX_RESULTS;

			const config = loadConfig();
			const defaultConfig = getDefaultConfig();

			expect(config).toEqual(defaultConfig);
		});

		it("should override workspaceRoot with TSMCP_ROOT env variable", () => {
			const customRoot = "/custom/workspace";
			process.env.TSMCP_ROOT = customRoot;

			const config = loadConfig();
			expect(config.workspaceRoot).toBe(customRoot);
		});

		it("should override timeout with TSMCP_TIMEOUT env variable", () => {
			process.env.TSMCP_TIMEOUT = "10000";

			const config = loadConfig();
			expect(config.timeout).toBe(10000);
		});

		it("should override maxResults with TSMCP_MAX_RESULTS env variable", () => {
			process.env.TSMCP_MAX_RESULTS = "100";

			const config = loadConfig();
			expect(config.maxResults).toBe(100);
		});

		it("should override multiple settings at once", () => {
			process.env.TSMCP_ROOT = "/test/root";
			process.env.TSMCP_TIMEOUT = "15000";
			process.env.TSMCP_MAX_RESULTS = "200";

			const config = loadConfig();

			expect(config.workspaceRoot).toBe("/test/root");
			expect(config.timeout).toBe(15000);
			expect(config.maxResults).toBe(200);
		});
	});
});
