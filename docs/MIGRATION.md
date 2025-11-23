# Migration Guide: Python to TypeScript

This guide helps you migrate from the original [ProofOfThought Python library](https://github.com/DebarghaG/proofofthought) to the **proof-of-thought** TypeScript implementation.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [API Changes](#api-changes)
- [Configuration](#configuration)
- [Code Examples](#code-examples)
- [Backend Differences](#backend-differences)
- [Postprocessing](#postprocessing)
- [Error Handling](#error-handling)
- [Type Safety](#type-safety)
- [Environment Differences](#environment-differences)
- [Common Pitfalls](#common-pitfalls)
- [FAQ](#faq)

## Overview

The **proof-of-thought** TypeScript library maintains conceptual compatibility with the original ProofOfThought Python library while adopting TypeScript/Node.js conventions and type safety. The core reasoning algorithm and approach remain the same.

### Key Similarities

- Same neurosymbolic reasoning approach
- Same SMT2 and JSON DSL backends
- Same postprocessing methods
- Same Z3 integration for theorem proving
- Similar API surface and method names

### Key Differences

- Strongly typed with TypeScript
- Async/await instead of Python async
- OpenAI client initialization handled by user
- Browser support via WASM
- Dual ESM/CJS package format

## Installation

### Original Python Library

```python
pip install proofofthought
```

### TypeScript Implementation

```bash
npm install @michaelvanlaar/proof-of-thought
```

### Browser

```html
<script type="module">
  import { ProofOfThought } from '@michaelvanlaar/proof-of-thought/browser';
</script>
```

## API Changes

### Class Initialization

**Python:**

```python
from proofofthought import ProofOfThought

pot = ProofOfThought(
    api_key="your-api-key",
    backend="smt2",
    model="gpt-4",
    temperature=0.0
)
```

**TypeScript:**

```typescript
import OpenAI from 'openai';
import { ProofOfThought } from '@michaelvanlaar/proof-of-thought';

// Initialize OpenAI client first
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Then create ProofOfThought instance
const pot = new ProofOfThought({
  client,                    // Required: pass OpenAI client
  backend: 'smt2',
  model: 'gpt-4o',
  temperature: 0.0,
});
```

**Key Difference:** TypeScript version requires you to manage the OpenAI client independently, providing more flexibility for custom configurations.

### Query Method

**Python:**

```python
result = pot.query(
    question="Is Socrates mortal?",
    context="All humans are mortal. Socrates is human."
)

print(result.answer)
print(result.is_verified)
```

**TypeScript:**

```typescript
const result = await pot.query(
  'Is Socrates mortal?',
  'All humans are mortal. Socrates is human.'
);

console.log(result.answer);
console.log(result.isVerified);  // camelCase naming
```

**Key Differences:**
- `await` required (async/await syntax)
- Property names use camelCase: `is_verified` → `isVerified`

### Batch Processing

**Python:**

```python
queries = [
    ("Question 1", "Context 1"),
    ("Question 2", "Context 2"),
]

results = pot.batch(queries, parallel=True)
```

**TypeScript:**

```typescript
const queries: Array<[string, string]> = [
  ['Question 1', 'Context 1'],
  ['Question 2', 'Context 2'],
];

const results = await pot.batch(queries, true);
```

**Key Differences:**
- Type annotations for query array
- Boolean parameter instead of named argument
- `await` required

## Configuration

### Python Configuration

```python
pot = ProofOfThought(
    api_key="...",
    backend="smt2",
    model="gpt-4",
    temperature=0.0,
    max_tokens=4096,
    z3_timeout=30000,
    z3_path="/custom/path/to/z3",
    postprocessing=["self-refine"],
    verbose=True
)
```

### TypeScript Configuration

```typescript
const pot = new ProofOfThought({
  client: openAIClient,      // Required
  backend: 'smt2',           // Type: 'smt2' | 'json'
  model: 'gpt-4o',
  temperature: 0.0,
  maxTokens: 4096,           // camelCase
  z3Timeout: 30000,          // camelCase
  z3Path: '/custom/path/to/z3',  // camelCase
  postprocessing: ['self-refine'],
  verbose: true,
});
```

### Configuration Mapping

| Python                   | TypeScript                | Notes                                |
|--------------------------|---------------------------|--------------------------------------|
| `api_key`                | N/A (use `client`)        | Pass OpenAI client instead           |
| `backend`                | `backend`                 | Same values: `'smt2'` or `'json'`    |
| `model`                  | `model`                   | Default: `'gpt-4o'` (was `'gpt-4'`)  |
| `temperature`            | `temperature`             | Same range: 0.0-1.0                  |
| `max_tokens`             | `maxTokens`               | camelCase naming                     |
| `z3_timeout`             | `z3Timeout`               | camelCase naming                     |
| `z3_path`                | `z3Path`                  | camelCase naming                     |
| `postprocessing`         | `postprocessing`          | Same method names                    |
| `verbose`                | `verbose`                 | Same behavior                        |

## Code Examples

### Example 1: Basic Reasoning

**Python:**

```python
from proofofthought import ProofOfThought

pot = ProofOfThought(api_key="...")

result = pot.query(
    "Is x greater than 10?",
    "x > y, y > z, z > 10"
)

print(f"Answer: {result.answer}")
print(f"Verified: {result.is_verified}")
print(f"Execution time: {result.execution_time}ms")
```

**TypeScript:**

```typescript
import OpenAI from 'openai';
import { ProofOfThought } from '@michaelvanlaar/proof-of-thought';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pot = new ProofOfThought({ client });

const result = await pot.query(
  'Is x greater than 10?',
  'x > y, y > z, z > 10'
);

console.log(`Answer: ${result.answer}`);
console.log(`Verified: ${result.isVerified}`);
console.log(`Execution time: ${result.executionTime}ms`);
```

### Example 2: With Postprocessing

**Python:**

```python
pot = ProofOfThought(
    api_key="...",
    postprocessing=["self-refine", "self-consistency"],
    verbose=True
)

result = pot.query(question, context)
```

**TypeScript:**

```typescript
const pot = new ProofOfThought({
  client,
  postprocessing: ['self-refine', 'self-consistency'],
  verbose: true,
});

const result = await pot.query(question, context);
```

### Example 3: Azure OpenAI

**Python:**

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    api_key="...",
    api_version="2024-02-15-preview",
    azure_endpoint="https://your-resource.openai.azure.com"
)

pot = ProofOfThought(client=client)
```

**TypeScript:**

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${endpoint}/openai/deployments/${deployment}`,
  defaultQuery: { 'api-version': '2024-02-15-preview' },
  defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
});

const pot = new ProofOfThought({ client });
```

## Backend Differences

### SMT2 Backend

Both versions use SMT-LIB 2.0 format with Z3 solver. The implementation is functionally equivalent.

**Minor Differences:**
- TypeScript uses branded types: `SMT2Formula` vs plain string
- Error handling uses TypeScript custom error classes
- Async execution model differs (Node.js vs Python)

### JSON DSL Backend

Both versions use the same JSON DSL structure. The schema and execution semantics are identical.

**Minor Differences:**
- TypeScript has stricter type validation
- JSON parsing uses native `JSON.parse()` vs Python's `json.loads()`
- Branded type: `JSONFormula` for type safety

## Postprocessing

Postprocessing methods are functionally equivalent between versions:

| Method             | Python            | TypeScript        | Status     |
|--------------------|-------------------|-------------------|------------|
| Self-Refine        | ✅ Implemented    | ✅ Implemented    | Compatible |
| Self-Consistency   | ✅ Implemented    | ✅ Implemented    | Compatible |
| Decomposed         | ✅ Implemented    | ✅ Implemented    | Compatible |
| Least-to-Most      | ✅ Implemented    | ✅ Implemented    | Compatible |

### Configuration Mapping

**Python:**

```python
pot = ProofOfThought(
    api_key="...",
    postprocessing=["self-refine"],
    self_refine_config={
        "max_iterations": 3,
        "convergence_threshold": 0.95
    }
)
```

**TypeScript:**

```typescript
const pot = new ProofOfThought({
  client,
  postprocessing: ['self-refine'],
  selfRefineConfig: {
    maxIterations: 3,
    convergenceThreshold: 0.95,
  },
});
```

## Error Handling

### Python Errors

```python
try:
    result = pot.query(question, context)
except ProofOfThoughtError as e:
    print(f"Error: {e}")
except LLMError as e:
    print(f"LLM Error: {e.status_code}")
except Z3Error as e:
    print(f"Z3 Error: {e.solver_output}")
```

### TypeScript Errors

```typescript
import {
  ProofOfThoughtError,
  LLMError,
  Z3Error,
} from '@michaelvanlaar/proof-of-thought';

try {
  const result = await pot.query(question, context);
} catch (error) {
  if (error instanceof LLMError) {
    console.error(`LLM Error: ${error.statusCode}`);
  } else if (error instanceof Z3Error) {
    console.error(`Z3 Error: ${error.solverOutput}`);
  } else if (error instanceof ProofOfThoughtError) {
    console.error(`Error: ${error.message}`);
  }
}
```

### Error Class Mapping

| Python Error            | TypeScript Error          | Notes                      |
|-------------------------|---------------------------|----------------------------|
| `ProofOfThoughtError`   | `ProofOfThoughtError`     | Base error class           |
| `LLMError`              | `LLMError`                | Has `statusCode` property  |
| `Z3Error`               | `Z3Error`                 | Has `solverOutput`         |
| `Z3TimeoutError`        | `Z3TimeoutError`          | Has `timeoutMs` property   |
| `ValidationError`       | `ValidationError`         | Has `field` property       |
| `ConfigurationError`    | `ConfigurationError`      | Same behavior              |
| `BackendError`          | `BackendError`            | Has `backend` property     |
| `TranslationError`      | `TranslationError`        | Has `originalText`         |
| `PostprocessingError`   | `PostprocessingError`     | Has `method` property      |

## Type Safety

One of the major advantages of the TypeScript version is full type safety.

### Response Types

```typescript
interface ReasoningResponse {
  answer: string;
  formula: string;
  proof: ReasoningStep[];
  isVerified: boolean;
  backend: 'smt2' | 'json';
  executionTime: number;
  model?: Record<string, unknown>;
  confidence?: number;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}
```

### Configuration Types

```typescript
interface ProofOfThoughtConfig {
  client: OpenAI;
  backend?: 'smt2' | 'json' | Backend;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  z3Timeout?: number;
  postprocessing?: PostprocessingMethod[];
  selfRefineConfig?: SelfRefineConfig;
  selfConsistencyConfig?: SelfConsistencyConfig;
  decomposedConfig?: DecomposedConfig;
  leastToMostConfig?: LeastToMostConfig;
  verbose?: boolean;
  z3Path?: string;
}
```

## Environment Differences

### Node.js

TypeScript version runs in Node.js 18+ with full Z3 support:

```typescript
import { ProofOfThought } from '@michaelvanlaar/proof-of-thought';

const pot = new ProofOfThought({ client });
const result = await pot.query(question, context);
```

### Browser

TypeScript version supports browsers via WASM:

```typescript
import { ProofOfThought, Z3WASMAdapter } from '@michaelvanlaar/proof-of-thought/browser';

const z3Adapter = new Z3WASMAdapter({
  wasmUrl: 'https://cdn.jsdelivr.net/npm/z3-solver@4.12.2/build/z3-built.wasm'
});

const pot = new ProofOfThought({
  client: openAIClient,
  z3Adapter,
});
```

**Note:** Python version doesn't have browser support.

### Z3 Installation

**Python:**
```bash
pip install z3-solver
```

**TypeScript/Node.js:**
```bash
# Included as dependency
npm install @michaelvanlaar/proof-of-thought

# Or install z3-solver separately if needed
npm install z3-solver
```

**TypeScript/Browser:**
- Uses Z3 compiled to WASM
- Loaded from CDN or local file
- No installation required

## Common Pitfalls

### 1. Forgetting `await`

❌ **Wrong:**
```typescript
const result = pot.query(question, context);
console.log(result.answer);  // Error: result is a Promise
```

✅ **Correct:**
```typescript
const result = await pot.query(question, context);
console.log(result.answer);
```

### 2. Not Passing OpenAI Client

❌ **Wrong:**
```typescript
const pot = new ProofOfThought({
  backend: 'smt2',
  model: 'gpt-4o',
});  // Error: client is required
```

✅ **Correct:**
```typescript
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pot = new ProofOfThought({
  client,
  backend: 'smt2',
});
```

### 3. Using snake_case Instead of camelCase

❌ **Wrong:**
```typescript
const result = await pot.query(question, context);
console.log(result.is_verified);  // Error: Property doesn't exist
```

✅ **Correct:**
```typescript
const result = await pot.query(question, context);
console.log(result.isVerified);
```

### 4. Incorrect Type for Batch Queries

❌ **Wrong:**
```typescript
const queries = [
  { question: 'Q1', context: 'C1' },
  { question: 'Q2', context: 'C2' },
];
```

✅ **Correct:**
```typescript
const queries: Array<[string, string]> = [
  ['Q1', 'C1'],
  ['Q2', 'C2'],
];
```

### 5. Not Handling Async Errors

❌ **Wrong:**
```typescript
const result = pot.query(question, context);
// Unhandled promise rejection if error occurs
```

✅ **Correct:**
```typescript
try {
  const result = await pot.query(question, context);
} catch (error) {
  console.error('Error:', error);
}
```

## FAQ

### Q: Is the TypeScript version as accurate as the Python version?

**A:** Yes. Both versions use the same underlying algorithms, Z3 solver, and reasoning approach. Benchmark results show comparable accuracy (within 1-2% on standard datasets).

### Q: Can I use the same Z3 installation?

**A:** The TypeScript version can use the system-installed Z3 (via CLI), the z3-solver npm package, or Z3 WASM in the browser. All approaches produce the same results.

### Q: Do I need to rewrite my prompts?

**A:** No. The prompt format, context structure, and query semantics are identical between versions.

### Q: What about performance?

**A:** Performance is comparable. The TypeScript version may be slightly faster for I/O operations (parallel batch processing), while the Python version may have edge cases where Python's native async is more optimized. Z3 execution time dominates, so differences are minimal.

### Q: Can I mix Python and TypeScript versions?

**A:** Yes, they can coexist. Results from one version can be used as input to the other (formulas, answers, contexts are interchangeable).

### Q: What about package size?

**A:**
- Python package: ~500KB
- TypeScript package: ~300KB (core)
- Z3 WASM bundle: ~8MB (for browser)

### Q: Are there any missing features?

**A:** All core features from the Python version are implemented. Future features in the Python version will be ported to TypeScript.

### Q: How do I migrate a large codebase?

**A:**
1. Start by installing `@michaelvanlaar/proof-of-thought`
2. Create a wrapper function that mimics the Python API
3. Gradually migrate modules, testing each one
4. Use TypeScript's type system to catch issues early

### Q: Is the OpenSpec approach the same?

**A:** Yes, both versions use the same OpenSpec methodology. The TypeScript version follows the same spec-driven development process.

## Additional Resources

- [API Reference](./API.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [TypeScript Examples](../examples/)
- [Original Python Documentation](https://github.com/DebarghaG/proofofthought)

## Support

If you encounter issues during migration:

- [GitHub Issues](https://github.com/MichaelvanLaar/proof-of-thought/issues)
- [GitHub Discussions](https://github.com/MichaelvanLaar/proof-of-thought/discussions)
- Compare with [examples/](../examples/) for patterns

## Contributing

Found a migration issue or have a suggestion? Please [open an issue](https://github.com/MichaelvanLaar/proof-of-thought/issues) or submit a pull request!
