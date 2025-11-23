# Test Suite Documentation

This directory contains the comprehensive test suite for the ProofOfThought TypeScript port.

## Directory Structure

```
tests/
├── README.md                           # This file
├── helpers/                            # Test utilities and mocking infrastructure
│   ├── index.ts                        # Main export for all helpers
│   ├── mock-openai.ts                  # OpenAI client mocking utilities
│   ├── z3-mock.ts                      # Z3 adapter mocking utilities
│   ├── fixtures.ts                     # Common test data and fixtures
│   └── test-utils.ts                   # General test utilities
├── fixtures/                           # Test data derived from Python implementation
│   ├── README.md                       # Fixtures documentation
│   ├── reasoning/                      # Reasoning test cases
│   │   ├── simple.json                 # Simple logical reasoning cases
│   │   └── mathematical.json           # Mathematical reasoning cases
│   └── benchmarks/                     # Benchmark samples
│       └── samples.json                # Sample data from benchmarks
├── adapters/                           # Z3 adapter tests
│   ├── z3-native.test.ts               # Native Z3 adapter tests
│   └── utils.test.ts                   # Adapter utility tests
├── backends/                           # Backend implementation tests
│   ├── smt2-backend.test.ts            # SMT2 backend tests
│   ├── json-backend.test.ts            # JSON backend tests
│   └── json-validators.test.ts         # JSON DSL validators tests
├── postprocessing/                     # Postprocessing methods tests
│   ├── self-refine.test.ts             # Self-refine tests
│   ├── self-consistency.test.ts        # Self-consistency tests
│   ├── decomposed.test.ts              # Decomposed prompting tests
│   └── least-to-most.test.ts           # Least-to-most tests
├── reasoning/                          # High-level API tests
│   └── proof-of-thought.test.ts        # ProofOfThought class tests
├── types/                              # Type system tests
│   └── errors.test.ts                  # Custom error classes tests
├── integration/                        # Integration tests
│   ├── end-to-end.test.ts              # End-to-end integration tests
│   ├── backend-workflows.test.ts       # Backend workflow tests
│   └── postprocessing-pipeline.test.ts # Postprocessing pipeline tests
└── compatibility/                      # Python compatibility tests
    └── python-parity.test.ts           # Python behavior parity tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### With Coverage
```bash
npm run test:coverage
```

### Interactive UI
```bash
npm run test:ui
```

## Test Utilities

### Mock OpenAI Client

The `mock-openai.ts` module provides utilities for mocking OpenAI API calls:

```typescript
import { createMockOpenAIClient, createMockSMT2Client } from '@tests/helpers';

// Generic mock with custom responses
const mockClient = createMockOpenAIClient({
  responses: [
    { content: 'First response' },
    { content: 'Second response' },
  ],
});

// Pre-configured SMT2 mock
const smt2Client = createMockSMT2Client();

// Pre-configured JSON mock
const jsonClient = createMockJSONClient();
```

### Mock Z3 Adapter

The `z3-mock.ts` module provides utilities for mocking Z3 solver without requiring installation:

```typescript
import { createUnsatMock, createSatMock, createFailingMock } from '@tests/helpers';

// Mock that returns 'unsat'
const unsatZ3 = createUnsatMock();

// Mock that returns 'sat' with a model
const satZ3 = createSatMock('(model\n  (define-fun x () Int 15)\n)');

// Mock that throws an error
const failingZ3 = createFailingMock('Z3 error');
```

### Test Fixtures

Pre-defined test data for common scenarios:

```typescript
import { reasoningFixtures, smt2Fixtures, jsonDSLFixtures } from '@tests/helpers';

// Use reasoning fixtures
const { question, context } = reasoningFixtures.socrates;

// Use SMT2 formula fixtures
const formula = smt2Fixtures.simple;

// Use JSON DSL fixtures
const dsl = jsonDSLFixtures.socrates;
```

### Assertions Helpers

Common assertion patterns:

```typescript
import { assertions } from '@tests/helpers';

// Validate reasoning response structure
assertions.isValidReasoningResponse(response);

// Validate proof trace structure
assertions.isValidProofTrace(proof);

// Validate SMT2 formula
assertions.isValidSMT2Formula(formula);

// Validate JSON DSL
assertions.isValidJSONDSL(dsl);
```

## Test Categories

### Unit Tests

Test individual modules in isolation:
- `adapters/` - Z3 adapter implementations
- `backends/` - Backend translation and verification
- `postprocessing/` - Postprocessing methods
- `types/` - Type definitions and errors

### Integration Tests

Test component interactions:
- `integration/end-to-end.test.ts` - Full reasoning pipeline
- `integration/backend-workflows.test.ts` - Backend workflows
- `integration/postprocessing-pipeline.test.ts` - Postprocessing pipelines

### Compatibility Tests

Ensure TypeScript port matches Python behavior:
- `compatibility/python-parity.test.ts` - API compatibility, behavior matching

## Coverage Goals

The test suite aims for >80% coverage across:
- Line coverage
- Function coverage
- Branch coverage
- Statement coverage

Current coverage can be viewed by running:
```bash
npm run test:coverage
```

Coverage reports are generated in:
- `coverage/lcov.info` - LCOV format
- `coverage/index.html` - HTML report
- `coverage/coverage-final.json` - JSON format

## CI/CD Integration

Tests run automatically on:
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`

The CI pipeline:
1. Installs Z3 solver
2. Runs linter and type checks
3. Runs full test suite
4. Generates coverage report
5. Uploads coverage to Codecov
6. Tests on Node.js 18, 20, and 22

## Writing Tests

### Test Structure

Follow this structure for new tests:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockOpenAIClient } from '@tests/helpers';

describe('ModuleName', () => {
  describe('feature', () => {
    beforeEach(() => {
      // Setup code
    });

    it('should do something', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = doSomething(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Mocking External Dependencies

Always mock external dependencies to ensure tests are:
- **Fast** - No network calls or slow operations
- **Deterministic** - Same input always produces same output
- **Isolated** - Tests don't depend on external services

```typescript
// Good: Use mocks
const mockClient = createMockOpenAIClient();
const mockZ3 = createUnsatMock();

// Bad: Real API calls (slow, non-deterministic, requires credentials)
const realClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

### Test Naming

Use descriptive test names:

```typescript
// Good
it('should throw ValidationError for empty question', () => { ... });

// Bad
it('test1', () => { ... });
```

## Troubleshooting

### Tests Failing Due to Missing Z3

Some tests require Z3 to be installed. The test utilities include helper functions to skip tests when Z3 is not available:

```typescript
import { skipIfZ3NotAvailable } from '@tests/helpers';

it('should run with Z3', async () => {
  await skipIfZ3NotAvailable(async () => {
    // Test code that requires Z3
  });
});
```

### Mock Not Working

Ensure you're using the mock utilities correctly:

1. Import from `@tests/helpers`
2. Configure mocks before using them
3. Override private properties only in tests (use `@ts-expect-error`)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Python ProofOfThought](https://github.com/DebarghaG/proofofthought)
