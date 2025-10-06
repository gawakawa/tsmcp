/**
 * Error handling utilities for TypeScript MCP server
 */

import type { ErrorContext } from "../types.js";

export class TSMCPError extends Error {
	constructor(
		message: string,
		public context?: ErrorContext,
		public originalError?: Error,
	) {
		super(message);
		this.name = "TSMCPError";
	}
}

export function formatError(error: unknown, context?: ErrorContext): string {
	let message = "Unknown error";

	if (error instanceof Error) {
		message = error.message;
	} else if (typeof error === "string") {
		message = error;
	} else {
		message = String(error);
	}

	if (context) {
		const contextParts = [`Operation: ${context.operation}`];
		if (context.file) contextParts.push(`File: ${context.file}`);
		if (context.position)
			contextParts.push(
				`Position: ${context.position.line + 1}:${context.position.character + 1}`,
			);
		if (context.symbolName) contextParts.push(`Symbol: ${context.symbolName}`);

		message = `${message} (${contextParts.join(", ")})`;
	}

	return message;
}

export function createErrorResponse(error: unknown, context?: ErrorContext) {
	const message = formatError(error, context);
	return {
		content: [
			{
				type: "text" as const,
				text: `Error: ${message}`,
			},
		],
		isError: true,
	};
}

export async function withErrorHandling<T>(
	operation: () => Promise<T>,
	context: ErrorContext,
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		throw new TSMCPError(
			formatError(error, context),
			context,
			error instanceof Error ? error : undefined,
		);
	}
}

export function isTimeoutError(error: unknown): boolean {
	if (error instanceof Error) {
		return (
			error.message.toLowerCase().includes("timeout") ||
			error.message.toLowerCase().includes("timed out")
		);
	}
	return false;
}

export function isNotSupportedError(error: unknown): boolean {
	if (error instanceof Error) {
		return (
			error.message.includes("not supported") ||
			error.message.includes("Method not found") ||
			error.message.includes("Unhandled method")
		);
	}
	return false;
}
