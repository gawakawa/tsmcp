# TypeScript LSP MCP Server

A Model Context Protocol (MCP) server that integrates with TypeScript Language
Server to provide comprehensive TypeScript development tools.

## Features

### Core LSP Navigation

- **get_definitions** - Navigate to symbol definitions
- **find_references** - Find all references to symbols
- **get_hover_info** - Get type information and documentation

### Code Intelligence

- **get_completions** - Code completion suggestions
- **get_diagnostics** - Error checking and warnings

### Symbol Analysis

- **get_document_symbols** - List all symbols in a file
- **search_workspace_symbols** - Search symbols across the workspace

### Code Modification

- **format_document** - Format TypeScript files
- **rename_symbol** - Safe symbol renaming across the workspace

### Project Tools

- **get_project_overview** - Analyze project structure and configuration

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
get_definitions({
  file_path: "src/main.ts",
  line: 10,
  character: 15,
});

// Find all references to a symbol
find_references({
  file_path: "src/main.ts",
  line: 10,
  character: 15,
  include_declaration: true,
});

// Get hover information
get_hover_info({
  file_path: "src/main.ts",
  line: 10,
  character: 15,
});
```

### Code Intelligence

```typescript
// Get code completions
get_completions({
  file_path: "src/main.ts",
  line: 10,
  character: 15,
  limit: 20,
});

// Get diagnostics (errors/warnings)
get_diagnostics({
  file_path: "src/main.ts",
});
```

### Symbol Analysis

```typescript
// Get all symbols in a document
get_document_symbols({
  file_path: "src/main.ts",
});

// Search workspace symbols
search_workspace_symbols({
  query: "MyClass",
  limit: 50,
});
```

### Code Modification

```typescript
// Format a document
format_document({
  file_path: "src/main.ts",
  tab_size: 2,
  insert_spaces: true,
});

// Rename a symbol
rename_symbol({
  file_path: "src/main.ts",
  line: 10,
  character: 15,
  new_name: "newSymbolName",
});
```

### Project Analysis

```typescript
// Get project overview
get_project_overview({
  workspace_path: "/path/to/project",
  include_node_modules: false,
  max_depth: 3,
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
│   ├── main.ts          # MCP server entry point
│   ├── lsp/             # LSP client implementation
│   │   └── client.ts    # TypeScript LSP client
│   ├── tools/           # MCP tool implementations
│   │   ├── definitions.ts
│   │   ├── references.ts
│   │   ├── hover.ts
│   │   ├── completion.ts
│   │   ├── symbols.ts
│   │   ├── diagnostics.ts
│   │   ├── formatting.ts
│   │   ├── rename.ts
│   │   ├── project.ts
│   │   └── index.ts     # Tool factory
│   ├── config/          # Configuration management
│   │   └── config.ts
│   ├── utils/           # Utility functions
│   │   └── uri.ts
│   └── types.ts         # Type definitions
├── package.json        # pnpm configuration and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
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

## Troubleshooting

### TypeScript Language Server Not Found

```bash
# Install globally
npm install -g typescript-language-server typescript

# Or install locally in your project
pnpm add --save-dev typescript-language-server typescript
```

### Permission Errors

Ensure Node.js has the necessary file system permissions and that all dependencies are installed:

```bash
pnpm install
pnpm start
```

### LSP Communication Issues

Check the server logs (stderr) for detailed error messages:

```bash
pnpm start 2>debug.log
```

## Testing

This project provides multiple levels of testing to ensure the TypeScript LSP
MCP server works correctly.

### Unit Tests

Run the basic unit tests to verify core functionality:

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

The unit tests cover:

- URI conversion utilities (`filePathToUri`, `uriToFilePath`)
- TypeScript file identification
- Configuration loading and validation
- Tool schema validation

### Interactive Testing with Claude Code

The project includes 12 individual slash commands for testing specific LSP
features:

#### Basic Functionality Tests

```bash
# Test project overview and structure analysis
/tsmcp-overview

# Test LSP server connection status  
/tsmcp-connection
```

#### Navigation Feature Tests

```bash
# Test symbol definition lookup
/tsmcp-definitions [file_path] [line] [character]

# Test reference finding
/tsmcp-references [file_path] [line] [character]

# Test hover information
/tsmcp-hover [file_path] [line] [character]
```

#### Code Intelligence Tests

```bash
# Test code completion
/tsmcp-completions [file_path] [line] [character]

# Test diagnostic information (errors/warnings)
/tsmcp-diagnostics [file_path]
```

#### Symbol Analysis Tests

```bash
# Test document symbol extraction
/tsmcp-document-symbols [file_path]

# Test workspace symbol search
/tsmcp-workspace-symbols [query] [limit]
```

#### Code Modification Tests

```bash
# Test document formatting
/tsmcp-format [file_path]

# Test symbol rename analysis (analysis only, no actual changes)
/tsmcp-rename [file_path] [line] [character] [new_name]
```

#### Error Handling Tests

```bash
# Test handling of non-existent files
/tsmcp-error-file

# Test handling of invalid positions
/tsmcp-error-position
```

### Comprehensive Testing with Subagent

For systematic testing of all features, use the comprehensive test subagent:

```bash
# Launch comprehensive test suite
@tsmcp-comprehensive-test
```

This subagent will:

1. **Basic Function Tests** - Verify project overview and LSP connection
2. **Navigation Tests** - Test definitions, references, and hover info
3. **Code Analysis Tests** - Verify completions and diagnostics
4. **Symbol Analysis Tests** - Test document and workspace symbols
5. **Code Modification Tests** - Test formatting and rename analysis
6. **Error Handling Tests** - Verify proper error responses

Each test phase provides detailed reports with:

- ✅ Pass / ❌ Fail / ⚠️ Warning status
- Performance metrics (response times)
- Detailed results and issue identification
- Improvement recommendations

### Manual Testing Guide

#### Prerequisites for Manual Testing

1. Ensure TypeScript Language Server is installed:

```bash
npm install -g typescript-language-server typescript
```

2. Start the MCP server:

```bash
pnpm start
```

#### Testing Each Tool

**Project Overview**

```typescript
get_project_overview({
  workspace_path: ".",
  include_node_modules: false,
  max_depth: 3,
});
```

Expected: Project statistics, file counts, directory structure

**Symbol Navigation**

```typescript
get_definitions({
  file_path: "main.ts",
  line: 5,
  character: 10,
});
```

Expected: Definition locations with file paths and positions

**Code Intelligence**

```typescript
get_completions({
  file_path: "src/main.ts",
  line: 10,
  character: 5,
  limit: 20,
});
```

Expected: Code completion suggestions with details

**Error Detection**

```typescript
get_diagnostics({
  file_path: "src/main.ts",
});
```

Expected: TypeScript errors and warnings with severity levels

#### Performance Testing

Test with larger codebases to verify:

- Response times under 2 seconds for most operations
- Proper handling of large symbol searches
- Memory usage stability during extended sessions
- Graceful handling of LSP server restarts

#### Integration Testing

Test with real TypeScript projects:

1. **Small Project** (< 10 files): All features should work instantly
2. **Medium Project** (10-100 files): Features should work within 1-2 seconds
3. **Large Project** (100+ files): Features should work within 5 seconds

### Troubleshooting Tests

If tests fail, check:

1. **TypeScript Language Server Installation**:

```bash
which typescript-language-server
typescript-language-server --version
```

2. **Node.js and Dependencies**:

```bash
node --version
pnpm --version
pnpm install
pnpm start
```

3. **LSP Communication**:

```bash
# Check server logs
pnpm start 2>debug.log
cat debug.log
```

4. **File Permissions**: Ensure the workspace directory is readable and
   TypeScript files are accessible.

## Development

### Running Tests

```bash
pnpm test
```

### Type Checking

```bash
pnpm type-check
```

### Formatting

```bash
pnpm format
```

### Linting

```bash
pnpm lint
```

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation for new tools
4. Run formatting and type checking before committing

## License

This project is part of the larger MCP ecosystem. See the main project license
for details.
