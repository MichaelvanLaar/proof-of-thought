# Proof of Thought (TypeScript)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

TypeScript port of [ProofOfThought](https://github.com/DebarghaG/proofofthought) - A neurosymbolic reasoning library that combines Large Language Models with Z3 theorem proving for robust and interpretable reasoning.

## Features

- 🧠 **Neurosymbolic Reasoning**: Combines LLMs with formal theorem proving (Z3)
- 🔄 **Dual Backend Support**: SMT-LIB 2.0 and JSON DSL backends
- 🌐 **Cross-Platform**: Works in Node.js and browsers (via WASM)
- 🔧 **Postprocessing Pipeline**: Self-Refine, Self-Consistency, Decomposed Prompting, Least-to-Most
- 📊 **Benchmark Suite**: ProntoQA, FOLIO, ProofWriter, ConditionalQA, StrategyQA
- 💪 **Type-Safe**: Full TypeScript support with strict type checking
- ⚡ **Modern**: Async/await API, ESM/CJS dual package

## Installation

```bash
npm install @proof-of-thought/core
```

### Prerequisites

- Node.js 18+
- Z3 Solver (automatically installed with dependencies)
- OpenAI API key

## Quick Start

```typescript
import { ProofOfThought } from '@proof-of-thought/core';
import OpenAI from 'openai';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create ProofOfThought instance
const pot = new ProofOfThought({
  client,
  backend: 'smt2', // or 'json'
  model: 'gpt-4o',
});

// Query with reasoning
const response = await pot.query(
  'Is the conclusion valid?',
  `All humans are mortal. Socrates is a human.
   Therefore, Socrates is mortal.`
);

console.log('Answer:', response.answer);
console.log('Verified:', response.isVerified);
console.log('Proof:', response.proof);
```

### Choosing a Backend

ProofOfThought supports two backend types for theorem proving:

#### SMT2 Backend (Default)

Uses SMT-LIB 2.0 format with Z3 CLI:

```typescript
const pot = new ProofOfThought({
  client,
  backend: 'smt2', // Text-based SMT-LIB 2.0 format
});
```

**Pros:**
- Mature and well-tested format
- Direct Z3 CLI integration
- Human-readable formulas

**Cons:**
- CLI subprocess overhead
- Less flexible for extensions

#### JSON Backend

Uses structured JSON DSL with type system:

```typescript
const pot = new ProofOfThought({
  client,
  backend: 'json', // Structured JSON format
});
```

**Pros:**
- Structured and type-safe
- Schema validation with Zod
- More extensible
- Better for complex type systems

**Cons:**
- Newer implementation
- Requires JSON-to-SMT2 conversion

**JSON DSL Example:**

```json
{
  "sorts": {
    "Entity": "DeclareSort"
  },
  "functions": {
    "Human": {"domain": ["Entity"], "range": "Bool"},
    "Mortal": {"domain": ["Entity"], "range": "Bool"}
  },
  "constants": {
    "Socrates": "Entity"
  },
  "knowledge_base": [
    "ForAll(x, Implies(Human(x), Mortal(x)))",
    "Human(Socrates)"
  ],
  "verifications": {
    "is_socrates_mortal": "Mortal(Socrates)"
  }
}
```

## Advanced Usage

### Postprocessing with Self-Refine

Self-Refine iteratively improves reasoning answers through LLM critique and refinement:

```typescript
import { ProofOfThought } from '@proof-of-thought/core';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Enable Self-Refine postprocessing
const pot = new ProofOfThought({
  client,
  postprocessing: ['self-refine'],
  selfRefineConfig: {
    maxIterations: 3,
    convergenceThreshold: 0.95,
  },
});

// Query will automatically apply Self-Refine
const response = await pot.query(
  'Is Socrates mortal?',
  'All humans are mortal. Socrates is human.'
);

// The answer has been iteratively refined
console.log('Refined answer:', response.answer);
console.log('Refinement steps:', response.proof.length);
```

### Using Self-Refine Directly

You can also use Self-Refine as a standalone postprocessing step:

```typescript
import { ProofOfThought, SelfRefine } from '@proof-of-thought/core';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pot = new ProofOfThought({ client });

// Get initial reasoning result
const response = await pot.query('Is Socrates mortal?', 'All humans are mortal.');

// Apply Self-Refine manually
const selfRefine = new SelfRefine(client, {
  maxIterations: 5,
  convergenceThreshold: 0.90,
});

const refined = await selfRefine.refine(
  response,
  'Is Socrates mortal?',
  'All humans are mortal. Socrates is human.'
);

console.log('Original:', response.answer);
console.log('Refined:', refined.answer);
```

### Postprocessing with Self-Consistency

Self-Consistency improves answer reliability by generating multiple reasoning paths and using voting:

```typescript
import { ProofOfThought } from '@proof-of-thought/core';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Enable Self-Consistency postprocessing
const pot = new ProofOfThought({
  client,
  postprocessing: ['self-consistency'],
  selfConsistencyConfig: {
    numSamples: 5,
    temperature: 0.7,
    votingMethod: 'majority', // or 'weighted'
  },
});

// Query will automatically apply Self-Consistency
const response = await pot.query(
  'Is Socrates mortal?',
  'All humans are mortal. Socrates is human.'
);

// The answer is selected from multiple paths
console.log('Answer:', response.answer);
console.log('Confidence:', response.confidence); // 0.0 to 1.0
```

### Postprocessing with Decomposed Prompting

Decomposed Prompting breaks complex questions into simpler sub-questions solved sequentially:

```typescript
import { ProofOfThought } from '@proof-of-thought/core';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Enable Decomposed Prompting postprocessing
const pot = new ProofOfThought({
  client,
  postprocessing: ['decomposed'],
  decomposedConfig: {
    maxSubQuestions: 5, // Limit number of sub-questions
  },
});

// Query will automatically decompose complex questions
const response = await pot.query(
  'Alice has 12 apples. She gives 1/3 to Bob. Bob gives half to Carol. How many does Carol have?',
  'Word problem involving fractions and sequential operations.'
);

// The answer is from solving sub-questions sequentially
console.log('Answer:', response.answer);
console.log('Sub-questions solved:', response.proof.filter(p => p.description.includes('Sub-question')).length);
```

### Using Decomposed Prompting Directly

You can also use Decomposed Prompting as a standalone tool:

```typescript
import { ProofOfThought, DecomposedPrompting } from '@proof-of-thought/core';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pot = new ProofOfThought({ client });

// Create reasoning engine wrapper
const reasoningEngine = async (question: string, context: string) => {
  return pot.query(question, context);
};

// Initialize Decomposed Prompting
const decomposed = new DecomposedPrompting(client, reasoningEngine, {
  maxSubQuestions: 4,
});

// First, decompose to see the sub-questions
const subQuestions = await decomposed.decompose(
  'What is the perimeter, area, and diagonal of a rectangle with length 8 and width 5?',
  'Geometry problem.'
);

console.log('Sub-questions:');
subQuestions.forEach((sq, idx) => {
  console.log(`  ${idx + 1}. ${sq.question}`);
});

// Then apply to get the full solution
const result = await decomposed.apply(
  'What is the perimeter, area, and diagonal of a rectangle with length 8 and width 5?',
  'Geometry problem.'
);

console.log('Final answer:', result.answer);
```

### Combining Multiple Postprocessing Methods

You can chain multiple postprocessing methods together:

```typescript
const pot = new ProofOfThought({
  client,
  postprocessing: ['decomposed', 'self-refine'],
  decomposedConfig: { maxSubQuestions: 4 },
  selfRefineConfig: { maxIterations: 3 },
});

// Decomposed prompting breaks down the question, then self-refine improves each sub-answer
const response = await pot.query('Complex multi-part question?', 'Context');
```

You can also combine all three methods:

```typescript
const pot = new ProofOfThought({
  client,
  postprocessing: ['self-consistency', 'self-refine'],
  selfConsistencyConfig: { numSamples: 5 },
  selfRefineConfig: { maxIterations: 3 },
});

// Self-consistency generates multiple paths, then self-refine improves the selected answer
const response = await pot.query('Question requiring high confidence?', 'Context');
```

### Batch Processing

Process multiple queries efficiently:

```typescript
const queries = [
  ['Is Socrates mortal?', 'All humans are mortal. Socrates is human.'],
  ['Is 2+2=4?', 'Basic arithmetic.'],
  ['Is the sky blue?', 'Observable fact about Earth.'],
];

// Process sequentially
const results = await pot.batch(queries, false);

// Or process in parallel for better performance
const results = await pot.batch(queries, true);
```

## Documentation

- [Installation Guide](docs/installation.md) - Coming soon
- [API Reference](docs/api.md) - Coming soon
- [Examples](examples/) - Coming soon
- [Migration from Python](docs/migration.md) - Coming soon

## Project Status

🚧 **In Active Development** - This is a new TypeScript port. Implementation is in progress.

See the [OpenSpec proposal](openspec/changes/add-typescript-port-foundation/) for detailed planning and progress.

## Architecture

- **High-level API** (`src/reasoning/`) - User-facing ProofOfThought class
- **Backends** (`src/backends/`) - SMT2 and JSON DSL implementations
- **Adapters** (`src/adapters/`) - Z3 solver integration (native and WASM)
- **Postprocessing** (`src/postprocessing/`) - Reasoning enhancement methods

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Credits

Based on the paper **"Proof of Thought: Neurosymbolic Program Synthesis allows Robust and Interpretable Reasoning"** and the original [Python implementation](https://github.com/DebarghaG/proofofthought) by [DebarghaG](https://github.com/DebarghaG).

## License

MIT License - See [LICENSE](LICENSE) file for details
