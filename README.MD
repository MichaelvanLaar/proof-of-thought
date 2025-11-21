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
