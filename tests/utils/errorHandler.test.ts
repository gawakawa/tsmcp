/**
 * Tests for error handling utilities
 */

import { describe, expect, it } from "vitest";
import {
	createErrorResponse,
	formatError,
	isNotSupportedError,
	isTimeoutError,
	TSMCPError,
	withErrorHandling,
} from "../../src/utils/errorHandler.js";

describe("errorHandler", () => {
	describe("TSMCPError", () => {
		it("should create an error with message", () => {
			const error = new TSMCPError("Test error");
			expect(error.message).toBe("Test error");
			expect(error.name).toBe("TSMCPError");
		});

		it("should include context and original error", () => {
			const originalError = new Error("Original");
			const context = { operation: "test" };
			const error = new TSMCPError("Test error", context, originalError);
			expect(error.context).toBe(context);
			expect(error.originalError).toBe(originalError);
		});
	});

	describe("formatError", () => {
		it("should format an Error object", () => {
			const error = new Error("Test error");
			const result = formatError(error);
			expect(result).toBe("Test error");
		});

		it("should format a string error", () => {
			const result = formatError("String error");
			expect(result).toBe("String error");
		});

		it("should format unknown error types", () => {
			const result = formatError({ message: "Object error" });
			expect(result).toBe("[object Object]");
		});

		it("should include operation context", () => {
			const error = new Error("Test error");
			const context = { operation: "test_op" };
			const result = formatError(error, context);
			expect(result).toContain("Test error");
			expect(result).toContain("Operation: test_op");
		});

		it("should include file context", () => {
			const error = new Error("Test error");
			const context = { operation: "test_op", file: "test.ts" };
			const result = formatError(error, context);
			expect(result).toContain("File: test.ts");
		});

		it("should include position context", () => {
			const error = new Error("Test error");
			const context = {
				operation: "test_op",
				position: { line: 9, character: 4 },
			};
			const result = formatError(error, context);
			expect(result).toContain("Position: 10:5");
		});

		it("should include symbol name context", () => {
			const error = new Error("Test error");
			const context = { operation: "test_op", symbolName: "MyClass" };
			const result = formatError(error, context);
			expect(result).toContain("Symbol: MyClass");
		});

		it("should include all context fields", () => {
			const error = new Error("Test error");
			const context = {
				operation: "test_op",
				file: "test.ts",
				position: { line: 9, character: 4 },
				symbolName: "MyClass",
			};
			const result = formatError(error, context);
			expect(result).toContain("Operation: test_op");
			expect(result).toContain("File: test.ts");
			expect(result).toContain("Position: 10:5");
			expect(result).toContain("Symbol: MyClass");
		});
	});

	describe("createErrorResponse", () => {
		it("should create an error response", () => {
			const error = new Error("Test error");
			const result = createErrorResponse(error);
			expect(result.isError).toBe(true);
			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe("text");
			expect(result.content[0].text).toContain("Error: Test error");
		});

		it("should include context in error response", () => {
			const error = new Error("Test error");
			const context = { operation: "test_op", file: "test.ts" };
			const result = createErrorResponse(error, context);
			expect(result.content[0].text).toContain("test_op");
			expect(result.content[0].text).toContain("test.ts");
		});
	});

	describe("withErrorHandling", () => {
		it("should return the result on success", async () => {
			const operation = async () => "success";
			const context = { operation: "test_op" };
			const result = await withErrorHandling(operation, context);
			expect(result).toBe("success");
		});

		it("should throw TSMCPError on failure", async () => {
			const operation = async () => {
				throw new Error("Test error");
			};
			const context = { operation: "test_op" };

			await expect(withErrorHandling(operation, context)).rejects.toThrow(
				TSMCPError,
			);
		});

		it("should include context in thrown error", async () => {
			const operation = async () => {
				throw new Error("Test error");
			};
			const context = { operation: "test_op", file: "test.ts" };

			try {
				await withErrorHandling(operation, context);
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(TSMCPError);
				expect((error as TSMCPError).context).toBe(context);
			}
		});
	});

	describe("isTimeoutError", () => {
		it("should return true for timeout errors", () => {
			expect(isTimeoutError(new Error("Request timeout"))).toBe(true);
			expect(isTimeoutError(new Error("Operation timed out"))).toBe(true);
		});

		it("should be case insensitive", () => {
			expect(isTimeoutError(new Error("Request TIMEOUT"))).toBe(true);
			expect(isTimeoutError(new Error("Operation TIMED OUT"))).toBe(true);
		});

		it("should return false for non-timeout errors", () => {
			expect(isTimeoutError(new Error("Regular error"))).toBe(false);
		});

		it("should return false for non-Error types", () => {
			expect(isTimeoutError("timeout")).toBe(false);
			expect(isTimeoutError(null)).toBe(false);
			expect(isTimeoutError(undefined)).toBe(false);
		});
	});

	describe("isNotSupportedError", () => {
		it("should return true for not supported errors", () => {
			expect(isNotSupportedError(new Error("Feature not supported"))).toBe(
				true,
			);
			expect(isNotSupportedError(new Error("Method not found"))).toBe(true);
			expect(isNotSupportedError(new Error("Unhandled method test"))).toBe(
				true,
			);
		});

		it("should return false for other errors", () => {
			expect(isNotSupportedError(new Error("Regular error"))).toBe(false);
		});

		it("should return false for non-Error types", () => {
			expect(isNotSupportedError("not supported")).toBe(false);
			expect(isNotSupportedError(null)).toBe(false);
			expect(isNotSupportedError(undefined)).toBe(false);
		});
	});
});
