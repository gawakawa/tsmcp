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

# Testing  
pnpm test                       # Run tests
pnpm test:watch                 # Run tests with watch mode

# Type Checking
pnpm type-check                 # Type check all TypeScript files
pnpm tsc                        # Run TypeScript compiler

# Formatting
pnpm format                     # Format all files
pnpm format:check              # Check formatting without changes

# Linting
pnpm lint                       # Lint all files
pnpm lint:fix                   # Fix linting issues
```

## Architecture Goals

Based on the reference implementations, this MCP should provide:

### Core LSP Features

- **Symbol Navigation**: Go to definition, find references, workspace symbols
- **Code Intelligence**: Hover information, completion, signature help
- **Code Quality**: Diagnostics, code actions, formatting
- **Code Modification**: Rename symbols, text edits, refactoring

### MCP Tools to Implement

Following lsmcp patterns:

- `get_project_overview` - Understand codebase structure
- `search_symbols` - Find TypeScript symbols by name/kind
- `get_symbol_details` - Comprehensive symbol information
- `lsp_get_definitions` - Navigate to definitions
- `lsp_find_references` - Find all references
- `lsp_get_hover` - Get type information
- `lsp_get_completion` - Code completion
- `lsp_get_diagnostics` - Error checking
- `lsp_rename_symbol` - Safe refactoring
- `lsp_format_document` - Code formatting

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

### File Structure (Planned)

```
tsmcp/
├── src/
│   ├── main.ts          # MCP server entry point
│   ├── lsp/             # LSP client implementation
│   ├── tools/           # MCP tool implementations
│   ├── config/          # Configuration handling
│   └── utils/           # Utility functions
├── tests/               # Test files
├── package.json        # pnpm configuration and scripts
├── tsconfig.json       # TypeScript configuration
└── CLAUDE.md           # This file
```

### Error Handling

- Use Result pattern or proper exception handling
- Provide meaningful error messages
- Graceful degradation when LSP features are unavailable
- Timeout handling for LSP requests

### Testing Strategy

- Unit tests for individual functions
- Integration tests for LSP communication
- End-to-end tests for MCP protocol
- Mock TypeScript projects for testing

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
pnpm format && pnpm type-check && pnpm test
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
