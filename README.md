# TypeScript LSP MCP Server

A Model Context Protocol (MCP) server that integrates with TypeScript Language
Server to provide comprehensive TypeScript development tools.

## Features

### Core LSP Navigation

- **lsp_get_definitions** - Navigate to symbol definitions
- **lsp_find_references** - Find all references to symbols
- **lsp_get_hover** - Get type information and documentation

### Code Intelligence

- **lsp_get_completion** - Code completion suggestions
- **lsp_get_diagnostics** - Error checking and warnings

### Symbol Analysis

- **search_symbols** - Search for symbols (classes, functions, variables, etc.)
- **get_symbol_details** - Get detailed information about a specific symbol

### Code Modification

- **lsp_format_document** - Format TypeScript files

### Project Tools

- **get_project_overview** - Analyze project structure and configuration
- **list_dir** - List files and directories in the workspace

## Prerequisites

1. **Node.js** - JavaScript/TypeScript runtime (version 18 or higher)
   ```bash
   # Install Node.js (if not already installed)
   # Visit https://nodejs.org/ or use a package manager like nvm
   ```

2. **pnpm** - Fast, disk space efficient package manager
   ```bash
   # Install pnpm globally
   npm install -g pnpm
   ```

3. **TypeScript Language Server**
   ```bash
   # Install globally via npm
   npm install -g typescript-language-server typescript

   # Or via pnpm
   pnpm add -g typescript-language-server typescript
   ```

## Installation

1. Clone or copy the tsmcp directory
2. Install dependencies:
   ```bash
   pnpm install
   ```

## Usage

### Running the Server

```bash
# Run with default settings
pnpm start

# Run with specific workspace
TSMCP_WORKSPACE_PATH=/path/to/your/project pnpm start

# Run with custom TypeScript Language Server path
TSMCP_TS_SERVER_PATH=/custom/path/typescript-language-server pnpm start
```

### Development Mode

```bash
# Run with file watching for development
pnpm dev
```

### Environment Variables

- `TSMCP_WORKSPACE_PATH` - Override workspace directory (default: current
  directory)
- `TSMCP_TS_SERVER_PATH` - Override TypeScript Language Server command path

## Tool Examples

### Navigation Tools

```typescript
// Get definitions for a symbol
lsp_get_definitions({
  location: "src/main.ts:10:15"
});

// Find all references to a symbol
lsp_find_references({
  location: "src/main.ts:10:15",
  includeDeclaration: true
});

// Get hover information
lsp_get_hover({
  location: "src/main.ts:10:15"
});
```

### Code Intelligence

```typescript
// Get code completions
lsp_get_completion({
  location: "src/main.ts:10:15",
  maxResults: 20
});

// Get diagnostics (errors/warnings)
lsp_get_diagnostics({
  file: "src/main.ts"
});
```

### Symbol Analysis

```typescript
// Search for symbols
search_symbols({
  query: "MyClass"
});

// Get detailed symbol information
get_symbol_details({
  location: "src/main.ts:10:15"
});
```

### Code Modification

```typescript
// Format a document
lsp_format_document({
  file: "src/main.ts",
  tabSize: 2,
  insertSpaces: true
});
```

### Project Analysis

```typescript
// Get project overview
get_project_overview({});

// List directory contents
list_dir({
  path: "src"
});
```

## Architecture

### Components

- **LSP Client** (`src/lsp/client.ts`) - TypeScript Language Server
  communication
- **Tools** (`src/tools/`) - MCP tool implementations for each LSP feature
- **Configuration** (`src/config/config.ts`) - Server and LSP configuration
  management
- **Types** (`src/types.ts`) - TypeScript interfaces for LSP and MCP integration
- **Utilities** (`src/utils/`) - Helper functions for URI handling and file
  operations

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
│   ├── config/                # Configuration management
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
└── README.md                 # This file
```

## Configuration

The server automatically detects TypeScript Language Server installation and
workspace configuration. It looks for:

1. **TypeScript Language Server** in these locations:
   - `./node_modules/.bin/typescript-language-server`
   - Global installation
   - Via npx

2. **Workspace Configuration**:
   - `tsconfig.json` for TypeScript configuration
   - `package.json` for project metadata
