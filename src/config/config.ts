/**
 * Configuration for TypeScript MCP server
 */

import type { TSMCPConfig } from "../types.js";

export function getDefaultConfig(): TSMCPConfig {
	return {
		workspaceRoot: process.cwd(),
		timeout: 5000,
		maxResults: 50,
		filePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		excludePatterns: [
			"node_modules/**",
			".git/**",
			"dist/**",
			"build/**",
			".next/**",
			"coverage/**",
			"**/*.test.ts",
			"**/*.test.tsx",
			"**/*.spec.ts",
			"**/*.spec.tsx",
		],
	};
}

export function loadConfig(): TSMCPConfig {
	const config = getDefaultConfig();

	// Override with environment variables if present
	if (process.env.TSMCP_ROOT) {
		config.workspaceRoot = process.env.TSMCP_ROOT;
	}

	if (process.env.TSMCP_TIMEOUT) {
		config.timeout = parseInt(process.env.TSMCP_TIMEOUT, 10);
	}

	if (process.env.TSMCP_MAX_RESULTS) {
		config.maxResults = parseInt(process.env.TSMCP_MAX_RESULTS, 10);
	}

	return config;
}
