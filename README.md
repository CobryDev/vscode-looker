# Looker Visual Studio Code Extension

## Overview

A Visual Studio Code extension designed to enhance the development experience for LookML -- [Looker's](https://looker.com/product/business-intelligence) custom markup language for data modeling and business intelligence.

- [What is LookML?](https://docs.looker.com/data-modeling/learning-lookml/what-is-lookml)

## Table of Contents

- [Features](#features)
- [Installation & Setup](#installation--setup)
- [Project Status](#project-status)
- [Development & Testing](#development--testing)
- [Known Issues](#known-issues)
- [Changelog](#changelog)

## Features

### Current Features

- Syntax highlighting with embedded SQL

![](https://raw.githubusercontent.com/Ladvien/vscode-looker/master/docs/lookml-example.png)

- Storing and retrieval of Looker API credentials.
- Auto suggest view and field name lookups.

![Image](./docs/vscode-looker-auto-complete.gif)

#### Snippets

Useful templated code shortcuts.

![](./docs/vscode-looker-snippet-example.gif)

`dim` + Tab

```
dimension: name {
    label: "Readable Dimension Name"
    description: "Description of the dimension"
    type: type
    sql: SQL string ;;
}
```

`mes` + Tab

```
measure: name {
    label: "Readable Dimension Name"
    description: "Description of the dimension"
    type: type
    sql: SQL string ;;
}
```

`fil` + Tab

```
filter: name {
    label: "Readable Filter Name"
    description: "Description of the filter"
    type: string
    suggest_dimension: id
    suggest_persist_for: "24 hours"
}
```

### Planned Features

- Use of API. For example, running SQL queries directly from Visual Studio Code using [Run SQL Runner Query](https://docs.looker.com/reference/api-and-integration/api-reference/v3.1/sql-query#run_sql_runner_query). SQL can be selected, sent to this endpoint, and the result saved to a temporary folder, where it could be viewed with a tabular data viewer like the VScode [Excel Viewer](https://marketplace.visualstudio.com/items?itemName=GrapeCity.gc-excelviewer) extension.
- LookML validation (with use of API endpoint [Validate Project](https://docs.looker.com/reference/api-and-integration/api-reference/v3.1/project#validate_project))
- LookML and SQL auto-formatting.
- Check if referencing a field from parallel view.
- Alphabetize `include:` statements.
- Auto include view files needed.

## Installation & Setup

### Requirements

- Visual Studio Code

### Extension Settings

- None yet

## Project Status

**Note**: This project was originally created by GitHub user [Ladvien](https://github.com/Ladvien). We have now forked this project and are actively working to improve it.

While the original project's LookML grammar implementation faced challenges and was not fully functional, we are committed to enhancing this extension to better serve the LookML development community. The core challenge remains the LookML language grammar implementation, which requires [TextMate](https://macromates.com/manual/en/language_grammars) grammar definition using regex in a VSCode-compatible format.

We welcome contributions from the community, especially from developers with experience in TextMate grammars, regex, and VSCode extension development, to help improve the LookML language support.

## Development & Testing

This project uses Jest for comprehensive testing with snapshot testing capabilities.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode (for development)
npm test -- --watch

# Run integration tests (VSCode extension tests)
npm run test:integration
```

### Test Structure

- **Unit Tests**: Located in `src/workspace-tools/__tests__/`
- **Test Fixtures**: LookML test files in `src/workspace-tools/__tests__/fixtures/`
- **Snapshots**: Auto-generated expected outputs in `src/workspace-tools/__tests__/__snapshots__/`

### Adding New Tests

1. Create LookML fixture files in the `fixtures/` directory
2. Add test cases in `parse-lookml.test.ts`
3. Run tests to generate snapshots
4. Commit both test files and generated snapshots

### Continuous Integration

GitHub Actions automatically run:

- **Unit Tests**: Jest tests with coverage reporting
- **Integration Tests**: VSCode extension integration tests
- **Linting**: ESLint code quality checks
- **Compilation**: TypeScript compilation verification

Tests run on multiple Node.js versions (18.x, 20.x, 22.x) to ensure compatibility.

## Known Issues

- None yet

## Changelog

### Version 0.3

- Syntax highlighting with embedded SQL
- Storing and retrieval of Looker API credentials
- Looker API Login
- Parse workspace for field names
- Completion items for views and their relevant fields
