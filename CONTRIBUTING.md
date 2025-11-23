# Contributing to proof-of-thought - TypeScript Edition

Thank you for your interest in contributing to proof-of-thought - TypeScript Edition! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [OpenSpec Methodology](#openspec-methodology)
- [Release Process](#release-process)

## Code of Conduct

### Pledge

This project is committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or discriminatory language
- Personal attacks or insults
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Git
- Z3 solver (installed automatically with dependencies)
- OpenAI API key (for testing)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/proof-of-thought.git
   cd proof-of-thought
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/MichaelvanLaar/proof-of-thought.git
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Lint Code

```bash
# Check for linting errors
npm run lint

# Automatically fix linting errors
npm run lint:fix
```

### Type Checking

```bash
# Run TypeScript compiler checks
npx tsc --noEmit
```

### Environment Variables

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_API_KEY=your-azure-key-here  # Optional
```

**Important:** Never commit your `.env` file or API keys to the repository.

## Project Structure

```
proof-of-thought/
├── src/                    # Source code
│   ├── reasoning/          # Main ProofOfThought class
│   ├── backends/           # SMT2 and JSON DSL backends
│   ├── adapters/           # Z3 adapters (native, WASM)
│   ├── postprocessing/     # Enhancement methods
│   ├── types/              # TypeScript type definitions
│   ├── index.ts            # Main entry point (Node.js)
│   └── browser.ts          # Browser entry point
├── tests/                  # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── compatibility/      # Python parity tests
│   ├── helpers/            # Test utilities
│   └── fixtures/           # Test data
├── benchmarks/             # Benchmark suite
├── examples/               # Example code
├── docs/                   # Documentation
├── openspec/               # OpenSpec specifications
└── package.json            # Package configuration
```

## Development Workflow

### 1. Create a Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Changes

- Write code following the [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass
- Ensure linting passes

### 3. Commit Changes

Follow the [commit message guidelines](#commit-message-guidelines):

```bash
git add .
git commit -m "feat: add new feature"
```

### 4. Push Changes

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

- Go to the repository on GitHub
- Click "New Pull Request"
- Select your branch
- Fill out the PR template
- Wait for review

## Coding Standards

### TypeScript Style Guide

#### General Principles

- Write clear, readable code
- Prefer explicitness over cleverness
- Use meaningful variable and function names
- Keep functions small and focused
- Document complex logic

#### Naming Conventions

- **Files:** kebab-case (`proof-of-thought.ts`)
- **Classes:** PascalCase (`ProofOfThought`)
- **Interfaces:** PascalCase (`Backend`)
- **Types:** PascalCase (`ReasoningResponse`)
- **Functions:** camelCase (`translateFormula`)
- **Variables:** camelCase (`reasoningResult`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)

#### Code Formatting

This project uses ESLint and Prettier for code formatting:

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

**Key Rules:**

- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Max line length: 100 characters
- Trailing commas in multiline structures

#### Type Annotations

Always provide explicit type annotations:

```typescript
// Good
function processQuery(question: string, context: string): Promise<ReasoningResponse> {
  // ...
}

// Bad
function processQuery(question, context) {
  // ...
}
```

#### Error Handling

Use custom error classes:

```typescript
// Good
throw new ValidationError('Question cannot be empty', 'question');

// Bad
throw new Error('Question cannot be empty');
```

#### Async/Await

Prefer async/await over Promise chains:

```typescript
// Good
async function query() {
  const formula = await translate(question);
  const result = await verify(formula);
  return result;
}

// Bad
function query() {
  return translate(question)
    .then((formula) => verify(formula))
    .then((result) => result);
}
```

#### Comments and Documentation

- Use JSDoc for all public APIs
- Add inline comments for complex logic
- Explain "why" not "what"
- Keep comments up-to-date

```typescript
/**
 * Translates natural language to formal logic formula
 *
 * @param question - The question to translate
 * @param context - Additional context for translation
 * @returns Promise resolving to formal logic formula
 * @throws {TranslationError} If translation fails
 */
async translate(question: string, context: string): Promise<Formula> {
  // Complex regex explanation here if needed
}
```

## Testing Guidelines

### Test Organization

- **Unit Tests:** Test individual functions and classes
- **Integration Tests:** Test component interactions
- **Compatibility Tests:** Verify Python parity

### Writing Tests

Use Vitest for all tests:

```typescript
import { describe, it, expect } from 'vitest';
import { ProofOfThought } from '../src/reasoning/proof-of-thought';

describe('ProofOfThought', () => {
  it('should initialize with valid configuration', () => {
    const pot = new ProofOfThought({ client: mockClient });
    expect(pot.isInitialized()).toBe(false);
  });

  it('should throw error with invalid configuration', () => {
    expect(() => new ProofOfThought({} as any)).toThrow(ConfigurationError);
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test both success and error paths
- Test edge cases
- Mock external dependencies (OpenAI, Z3)

### Running Specific Tests

```bash
# Run specific test file
npm test -- tests/unit/proof-of-thought.test.ts

# Run tests matching pattern
npm test -- --grep="SMT2Backend"
```

## Documentation

### Documentation Types

1. **API Documentation:** In-code JSDoc comments
2. **User Guides:** Markdown files in `docs/`
3. **Examples:** Working code in `examples/`
4. **README:** High-level overview

### Documentation Standards

- Keep documentation up-to-date with code changes
- Provide code examples
- Explain concepts clearly
- Use proper markdown formatting

### Generating Documentation

```bash
# Generate TypeDoc documentation
npm run docs:generate

# View generated docs
open docs/generated/index.html
```

## Commit Message Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/) with gitmoji:

### Format

```
<emoji> <type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes (dependencies, etc.)

### Gitmoji

- ✨ `:sparkles:` - New feature
- 🐛 `:bug:` - Bug fix
- 📚 `:books:` - Documentation
- 🎨 `:art:` - Code style/structure
- ♻️ `:recycle:` - Refactoring
- ⚡️ `:zap:` - Performance
- ✅ `:white_check_mark:` - Tests
- 🔧 `:wrench:` - Configuration

### Examples

```bash
✨ feat(postprocessing): add self-refine method

Implement self-refine postprocessing method with iterative
improvement through LLM feedback loops.

Closes #123
```

```bash
🐛 fix(backend): handle empty SMT2 responses

Add validation to prevent crashes when Z3 returns empty output.

Fixes #456
```

```bash
📚 docs(api): add JSDoc to Backend interface

Add comprehensive JSDoc documentation to all Backend interface
methods with examples and parameter descriptions.
```

## Pull Request Process

### Before Submitting

1. ✅ All tests pass: `npm test`
2. ✅ Linting passes: `npm run lint`
3. ✅ Code is formatted: `npm run format`
4. ✅ Documentation is updated
5. ✅ Commit messages follow guidelines
6. ✅ Branch is up-to-date with main

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

Describe testing performed

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests passing
- [ ] Linting passing
- [ ] Commit messages follow guidelines
```

### Review Process

1. **Automated Checks:** CI/CD runs tests and linting
2. **Code Review:** Maintainer reviews code
3. **Feedback:** Address review comments
4. **Approval:** PR approved by maintainer
5. **Merge:** PR merged to main

### Addressing Feedback

```bash
# Make requested changes
git add .
git commit -m "fix: address review feedback"
git push origin feature/your-feature
```

## Issue Guidelines

### Creating Issues

Use appropriate issue templates:

- **Bug Report:** For reporting bugs
- **Feature Request:** For suggesting features
- **Question:** For asking questions

### Bug Reports Should Include

- Clear description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node.js version, etc.)
- Code examples (if applicable)

### Feature Requests Should Include

- Clear description of the feature
- Use case / motivation
- Proposed implementation (optional)
- Examples (optional)

## OpenSpec Methodology

proof-of-thought TypeScript Edition uses [OpenSpec](https://openspec.dev) for spec-driven development.

### OpenSpec Workflow

1. **Proposal:** Create spec in `openspec/changes/`
2. **Review:** Discuss and refine spec
3. **Approval:** Spec approved by maintainers
4. **Implementation:** Implement according to spec
5. **Verification:** Tests verify implementation matches spec
6. **Archival:** Archive completed spec

### Creating Proposals

```bash
# Use OpenSpec CLI or manual creation
# See openspec/AGENTS.md for details
```

### OpenSpec Commands

Available slash commands:

- `/openspec:proposal` - Create new proposal
- `/openspec:apply` - Implement approved proposal
- `/openspec:archive` - Archive completed proposal

## Release Process

### Version Numbering

This project follows [Semantic Versioning](https://semver.org/):

- **Major (1.0.0):** Breaking changes
- **Minor (0.1.0):** New features (backward compatible)
- **Patch (0.0.1):** Bug fixes (backward compatible)

### Release Checklist

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Run full test suite
4. Build and test package
5. Create git tag
6. Push tag to GitHub
7. Publish to npm
8. Create GitHub release

### Publishing

```bash
# Update version
npm version patch|minor|major

# Build package
npm run build

# Publish to npm
npm publish
```

## Getting Help

- **Documentation:** See `docs/` directory
- **Examples:** See `examples/` directory
- **Issues:** [GitHub Issues](https://github.com/MichaelvanLaar/proof-of-thought/issues)
- **Discussions:** [GitHub Discussions](https://github.com/MichaelvanLaar/proof-of-thought/discussions)

## Recognition

Contributors are recognized in:

- GitHub contributors page
- Release notes
- Project README

Thank you for contributing to proof-of-thought - TypeScript Edition! 🎉
