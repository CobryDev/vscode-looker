# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for continuous integration and testing.

## Workflows

### 🧪 Test Suite (`test.yml`)

- **Triggers**: Push and PR to `master`/`main` branches
- **Node.js versions**: 18.x, 20.x, 22.x
- **Steps**:
  1. Install dependencies with `npm ci`
  2. Run ESLint (warnings allowed for legacy code)
  3. Compile TypeScript
  4. Run Jest tests with coverage
  5. Upload coverage reports to Codecov (Node 20.x only)
  6. Upload coverage artifacts

### 🔗 Integration Tests (`integration.yml`)

- **Triggers**: Push and PR to `master`/`main` branches
- **Node.js version**: 20.x
- **Steps**:
  1. Install dependencies
  2. Compile TypeScript
  3. Run VSCode integration tests

## Coverage Reporting

Coverage reports are:

- Generated in the `coverage/` directory (gitignored)
- Uploaded to Codecov for analysis
- Available as GitHub artifacts for 30 days

## Status Badges

Add these badges to your README.md:

```markdown
[![Test Suite](https://github.com/Ladvien/vscode-looker/actions/workflows/test.yml/badge.svg)](https://github.com/Ladvien/vscode-looker/actions/workflows/test.yml)
[![Integration Tests](https://github.com/Ladvien/vscode-looker/actions/workflows/integration.yml/badge.svg)](https://github.com/Ladvien/vscode-looker/actions/workflows/integration.yml)
```

## Local Testing

Before pushing, run these commands locally:

```bash
# Install dependencies
npm ci

# Run linter (some warnings expected)
npm run lint

# Compile TypeScript
npm run compile

# Run unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run integration tests (requires VSCode)
npm run test:integration
```
