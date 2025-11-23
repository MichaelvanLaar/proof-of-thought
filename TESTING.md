# Testing Guide

This document describes the testing infrastructure and best practices for the **proof-of-thought** TypeScript library.

## Test Setup

### Prerequisites

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Z3 solver** (required for integration tests):
   - macOS: `brew install z3`
   - Ubuntu/Debian: `sudo apt-get install z3`
   - Windows: Download from https://github.com/Z3Prover/z3/releases
   - Or: `npm install z3-solver`

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (browser-based interface)
npm run test:ui

# Run only unit tests (fast)
npm test -- tests/adapters tests/backends

# Run only integration tests
npm test -- tests/reasoning
```

## Test Structure

```
tests/
├── adapters/               # Z3 adapter tests
│   ├── z3-native.test.ts  # Native adapter unit tests
│   └── utils.test.ts      # Environment detection tests
├── backends/               # Backend implementation tests
│   └── smt2-backend.test.ts # SMT2 backend tests
└── reasoning/              # High-level API tests
    └── proof-of-thought.test.ts # Integration tests
```

## Test Categories

### Unit Tests

Focus on individual components in isolation:
- Type system validation
- Error handling
- Configuration management
- Formula validation
- Environment detection

**Example**:
```typescript
describe('SMT2Backend', () => {
  it('should reject empty questions', async () => {
    await expect(backend.translate('', 'context')).rejects.toThrow(ValidationError);
  });
});
```

### Integration Tests

Test interaction between components:
- Z3 adapter with solver
- Backend with Z3 adapter
- ProofOfThought end-to-end pipeline
- LLM integration (mocked)

**Example**:
```typescript
describe('ProofOfThought', () => {
  it('should execute complete reasoning pipeline', async () => {
    const response = await pot.query('Is Socrates mortal?', 'All humans are mortal.');
    expect(response.answer).toBeTruthy();
    expect(response.isVerified).toBe(true);
  });
});
```

### Mocking Strategy

We mock external dependencies for reliable, fast tests:

1. **OpenAI Client**: Mock LLM responses for deterministic tests
2. **Z3 Solver**: Tests check if Z3 is available and skip if not
3. **File System**: Use in-memory operations where possible

**Example Mock**:
```typescript
const createMockOpenAIClient = (): OpenAI => {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'mock response' } }]
        })
      }
    }
  } as unknown as OpenAI;
};
```

## Coverage Requirements

We aim for high test coverage:

- **Lines**: > 80%
- **Functions**: > 80%
- **Branches**: > 80%
- **Statements**: > 80%

Current exclusions from coverage:
- Configuration files
- Type definition files
- Build scripts
- Examples
- Benchmarks

## CI/CD Integration

Tests run automatically on:

### Pull Requests
- All tests on Node.js 18.x, 20.x, 22.x
- Linting and type checking
- Coverage reporting
- Build verification

### Main Branch
- Full test suite
- Coverage upload to Codecov
- Build artifact creation
- Release preparation (on tags)

## Pre-commit Hooks

Husky runs these checks before each commit:
1. ESLint (code quality)
2. TypeScript type check
3. Test suite (fast tests only)

**Skip hooks** (when needed):
```bash
git commit --no-verify -m "message"
```

## Writing Tests

### Best Practices

1. **Descriptive Names**: Use clear, descriptive test names
   ```typescript
   it('should reject formula with unbalanced parentheses', async () => {
     // test code
   });
   ```

2. **Arrange-Act-Assert**: Follow AAA pattern
   ```typescript
   // Arrange
   const backend = new SMT2Backend(config);

   // Act
   const formula = await backend.translate(question, context);

   // Assert
   expect(formula).toContain('check-sat');
   ```

3. **Test One Thing**: Each test should verify one behavior
   ```typescript
   // Good: Tests one thing
   it('should validate parentheses balance', () => {
     expect(() => validateFormula('(invalid')).toThrow();
   });

   // Bad: Tests multiple things
   it('should validate formula', () => {
     expect(() => validateFormula('(invalid')).toThrow();
     expect(() => validateFormula('no-check-sat')).toThrow();
     expect(validateFormula('(valid)')).not.toThrow();
   });
   ```

4. **Handle Async Properly**: Use async/await consistently
   ```typescript
   it('should handle async operations', async () => {
     await expect(asyncFunction()).resolves.toBe(expected);
   });
   ```

5. **Clean Up Resources**: Use beforeEach/afterEach
   ```typescript
   afterEach(async () => {
     await adapter.dispose();
   });
   ```

### Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('ComponentName', () => {
  let component: ComponentType;

  beforeEach(() => {
    // Setup
    component = new ComponentType();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName', () => {
    it('should do something when condition is met', () => {
      // Arrange
      const input = 'test input';

      // Act
      const result = component.methodName(input);

      // Assert
      expect(result).toBe('expected output');
    });

    it('should throw error when condition is not met', () => {
      expect(() => component.methodName(null)).toThrow(ValidationError);
    });
  });
});
```

## Debugging Tests

### Run Single Test
```bash
npm test -- -t "specific test name"
```

### Run Single File
```bash
npm test -- tests/adapters/z3-native.test.ts
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:watch"],
  "console": "integratedTerminal"
}
```

### Verbose Output
```bash
npm test -- --reporter=verbose
```

## Continuous Improvement

### Adding New Tests

1. Create test file next to source: `feature.test.ts`
2. Follow naming convention: `describe('ClassName', () => {})`
3. Add to appropriate test category
4. Ensure tests pass locally before committing
5. Check coverage impact: `npm run test:coverage`

### Test Maintenance

- Update tests when changing APIs
- Remove obsolete tests
- Refactor duplicate test code into utilities
- Keep mocks up to date with actual APIs
- Document complex test scenarios

## Troubleshooting

### Z3 Not Available
If integration tests fail with "Z3 not available":
1. Install Z3: See prerequisites above
2. Verify installation: `z3 --version`
3. Tests will skip automatically if Z3 is not found

### OpenAI API Errors
Mock tests don't need actual API keys. Real integration tests will require:
```bash
export OPENAI_API_KEY=your-key
```

### Timeout Errors
Increase timeout in test configuration:
```typescript
it('long running test', async () => {
  // test code
}, 60000); // 60 second timeout
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Z3 Theorem Prover](https://z3prover.github.io/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
