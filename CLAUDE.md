# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
the TypeScript MCP project.

## Project Overview

This is a TypeScript-based Model Context Protocol (MCP) server that provides
Language Server Protocol (LSP) functionality for TypeScript development. The
project is inspired by the implementation patterns from `../lsmcp/` and
`../serena/`.

## Development Environment

**Runtime**: Node.js with TypeScript **Package Manager**: pnpm **Configuration**: `package.json` and `tsconfig.json`

## Essential Commands

```bash
# Development
pnpm dev                        # Run development task with hot reload
pnpm start                      # Run production build
pnpm build                      # Build for production

# Type Checking
pnpm type-check                 # Type check all TypeScript files

# Testing (using Vitest)
pnpm test                       # Run tests once
pnpm test:watch                 # Run tests in watch mode
pnpm test:ui                    # Run tests with UI
pnpm test:coverage              # Run tests with coverage report

# Formatting and Linting (using Biome)
pnpm format                     # Format all files
pnpm format:check              # Check formatting without changes
pnpm lint                       # Lint all files
pnpm lint:fix                   # Fix linting issues
pnpm check                      # Check and fix everything
```

## Architecture Goals

Based on the reference implementations, this MCP should provide:

### Core LSP Features

- **Symbol Navigation**: Go to definition, find references, workspace symbols
- **Code Intelligence**: Hover information, completion, signature help
- **Code Quality**: Diagnostics, code actions, formatting
- **Code Modification**: Rename symbols, text edits, refactoring

### MCP Tools (Implemented)

Following lsmcp patterns:

- `get_project_overview` - Understand codebase structure ✓
- `list_dir` - List files and directories ✓
- `search_symbols` - Find TypeScript symbols by name/kind ✓
- `get_symbol_details` - Comprehensive symbol information ✓
- `lsp_get_definitions` - Navigate to definitions ✓
- `lsp_find_references` - Find all references ✓
- `lsp_get_hover` - Get type information ✓
- `lsp_get_completion` - Code completion ✓
- `lsp_get_diagnostics` - Error checking ✓
- `lsp_format_document` - Code formatting ✓

### TypeScript-Specific Features

- Support for `.ts`, `.tsx`, `.js`, `.jsx` files
- Integration with `tsconfig.json` configurations
- Type checking and inference
- Import/export analysis
- JSDoc support

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Prefer explicit types for public APIs
- Use async/await for asynchronous operations
- Follow Node.js/TypeScript conventions
- Use interface over type for object definitions

### File Structure

```
tsmcp/
├── src/
│   ├── main.ts                # MCP server entry point
│   ├── lsp/                   # LSP client implementation
│   │   └── client.ts          # TypeScript LSP client
│   ├── tools/                 # MCP tool implementations
│   │   ├── lspTools.ts        # LSP-specific tools (hover, definitions, etc.)
│   │   ├── symbolTools.ts     # Symbol search and details
│   │   ├── projectOverview.ts # Project analysis
│   │   └── fileSystem.ts      # File system operations
│   ├── config/                # Configuration handling
│   │   └── config.ts          # Server configuration
│   ├── utils/                 # Utility functions
│   │   ├── pathUtils.ts       # Path and URI utilities
│   │   └── errorHandler.ts    # Error handling utilities
│   └── types.ts               # Type definitions
├── tests/                    # Test files (mirrors src/ structure)
│   └── utils/
│       ├── pathUtils.test.ts
│       └── errorHandler.test.ts
├── package.json              # pnpm configuration and scripts
├── tsconfig.json             # TypeScript configuration
├── biome.json                # Biome formatter/linter config
├── CLAUDE.md                 # This file (guidance for Claude Code)
└── README.md                 # Project documentation
```

### Error Handling

- Use Result pattern or proper exception handling
- Provide meaningful error messages
- Graceful degradation when LSP features are unavailable
- Timeout handling for LSP requests

### Testing Strategy

**Automated Testing with Vitest:**

- Test files use `.test.ts` extension and are located in `/tests/` directory
- Directory structure in `/tests/` mirrors `/src/` structure
- Unit tests for utility functions (pathUtils, errorHandler)
- Integration tests for MCP tools and LSP client
- Run `pnpm test` to execute all tests
- Use `pnpm test:watch` during development for immediate feedback
- Coverage reports available via `pnpm test:coverage`

**Manual Testing:**

- Test with MCP clients (e.g., Claude Desktop, Claude Code)
- Test with real TypeScript projects of various sizes
- Verify LSP features work correctly across different scenarios

## LSP Integration

### TypeScript Language Server

The project should integrate with the official TypeScript Language Server:

- `typescript-language-server` as the LSP implementation
- Handle server lifecycle (start, stop, restart)
- Manage multiple workspace folders
- Cache symbol information for performance

### Protocol Implementation

- Use `vscode-languageserver-protocol` types
- Implement proper request/response handling
- Support incremental text synchronization
- Handle LSP notifications and requests

## Configuration

### TypeScript Config Support

- Respect `tsconfig.json` settings
- Support project references
- Handle different module systems (ES, CommonJS)
- Work with monorepos and workspaces

### MCP Server Config

- Configurable LSP server path
- Timeout settings
- Debug logging options
- Tool selection and filtering

## Implementation Notes

**Always run formatting and type checking before completing tasks:**

```bash
pnpm check && pnpm type-check
```

**Key Considerations:**

- TypeScript LSP can be resource-intensive - implement proper caching
- Handle large codebases with streaming/pagination
- Support both JavaScript and TypeScript projects
- Maintain compatibility with various TypeScript versions
- Provide fallback behavior when LSP is unavailable

**Security:**

- Validate file paths to prevent directory traversal
- Sanitize user inputs in tool parameters
- Handle file system permissions appropriately
- Never execute untrusted code

## References

- **lsmcp**: Multi-language LSP MCP with extensive tool set
- **serena**: Python-based agent toolkit with symbol-aware editing
- **TypeScript LSP**: Official language server implementation
- **MCP Protocol**: Model Context Protocol specification
