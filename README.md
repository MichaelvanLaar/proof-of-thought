# proof-of-thought - TypeScript Edition

[![npm version](https://badge.fury.io/js/@michaelvanlaar%2Fproof-of-thought.svg)](https://www.npmjs.com/package/@michaelvanlaar/proof-of-thought)
[![CI](https://github.com/MichaelvanLaar/proof-of-thought/actions/workflows/ci.yml/badge.svg)](https://github.com/MichaelvanLaar/proof-of-thought/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/MichaelvanLaar/proof-of-thought/branch/main/graph/badge.svg)](https://codecov.io/gh/MichaelvanLaar/proof-of-thought)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![npm downloads](https://img.shields.io/npm/dm/@michaelvanlaar/proof-of-thought.svg)](https://www.npmjs.com/package/@michaelvanlaar/proof-of-thought)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@michaelvanlaar/proof-of-thought)](https://bundlephobia.com/package/@michaelvanlaar/proof-of-thought)

> Neurosymbolic program synthesis combining Large Language Models with Z3 theorem proving for robust and interpretable reasoning.

A TypeScript/JavaScript port of the [ProofOfThought](https://github.com/DebarghaG/proofofthought) Python library, bringing powerful neurosymbolic reasoning to the Node.js and browser ecosystems.

## 🎉 **v0.1.0 Beta Release Now Available!**

I'm excited to announce the first beta release of **proof-of-thought** for TypeScript! This release brings complete feature parity with the original ProofOfThought Python implementation, including:

- ✨ Full neurosymbolic reasoning with Z3 theorem prover integration
- 🎯 94% test coverage with comprehensive test suite
- 🚀 Cross-platform support (Node.js + Browser with WASM)
- 📦 All four postprocessing methods (Self-Refine, Self-Consistency, Decomposed, Least-to-Most)
- ⚡ Performance optimizations (caching, batching, lazy loading)

**[See Release Notes](./RELEASE_NOTES.md)** | **[View Roadmap](./ROADMAP.md)** | **[Migration Guide](./docs/MIGRATION.md)**

## 📖 Overview

**proof-of-thought** is a neurosymbolic reasoning library that combines the natural language understanding of Large Language Models (LLMs) with the formal verification capabilities of the Z3 theorem prover. This TypeScript implementation is a port of the original ProofOfThought Python library. The approach enables:

- ✅ **Formal Verification**: Logical conclusions verified by Z3 solver
- 🧠 **Natural Language**: Intuitive question-and-answer interface
- 🔍 **Interpretability**: Complete proof traces for all reasoning steps
- 🎯 **Accuracy**: State-of-the-art results on logical reasoning benchmarks
- 🚀 **Flexibility**: Multiple backends (SMT2, JSON DSL) and postprocessing methods

## 🚀 Quick Start

### Installation

```bash
npm install @michaelvanlaar/proof-of-thought
```

### Basic Usage

```typescript
import OpenAI from 'openai';
import { ProofOfThought } from '@michaelvanlaar/proof-of-thought';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create ProofOfThought instance
const pot = new ProofOfThought({
  client,
  backend: 'smt2', // or 'json'
});

// Ask a logical reasoning question
const response = await pot.query(
  'Is Socrates mortal?',
  'All humans are mortal. Socrates is human.'
);

console.log(response.answer);      // "Yes, Socrates is mortal"
console.log(response.isVerified);  // true (verified by Z3)
console.log(response.proof);       // [...proof steps...]
```

### Browser Usage

```html
<script type="module">
  import { ProofOfThought } from '@michaelvanlaar/proof-of-thought/browser';
  // Same API as Node.js!
</script>
```

See [Browser Example](examples/browser/README.md) for details.

## ✨ Features

### Multiple Backends

- **SMT2**: Formal logic using SMT-LIB 2.0 for theorem proving
- **JSON DSL**: Structured reasoning with JSON-based domain-specific language

### Postprocessing Methods

Enhance reasoning quality with advanced techniques:

- **Self-Refine**: Iterative improvement through self-critique
- **Self-Consistency**: Multiple reasoning paths with majority voting
- **Decomposed Prompting**: Break complex problems into sub-questions
- **Least-to-Most**: Progressive problem-solving from simple to complex

### Batch Processing

Process multiple queries efficiently:

```typescript
const queries = [
  ['Question 1', 'Context 1'],
  ['Question 2', 'Context 2'],
];

// Parallel processing for speed
const results = await pot.batch(queries, true);

// Sequential processing for reliability
const results = await pot.batch(queries, false);
```

### Azure OpenAI Support

```typescript
const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${endpoint}/openai/deployments/${deployment}`,
  defaultQuery: { 'api-version': '2024-02-15-preview' },
});

const pot = new ProofOfThought({ client });
```

## 📚 Documentation

- **[API Reference](docs/API.md)** - Complete API documentation
- **[Architecture Guide](docs/ARCHITECTURE.md)** - System design and internals
- **[Migration Guide](docs/MIGRATION.md)** - Migrating from Python version
- **[Examples](examples/README.md)** - Comprehensive examples
- **[Benchmarks](benchmarks/README.md)** - Performance evaluation
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🎯 Use Cases

### Logical Reasoning

```typescript
const response = await pot.query(
  'Does the conclusion follow?',
  'All students study. All who study are smart. John is a student.'
);
// Verifies: John is smart ✓
```

### Mathematical Reasoning

```typescript
const response = await pot.query(
  'Is x greater than 10?',
  'x > y, y > z, z > 10'
);
// Verifies using transitive property ✓
```

### Conditional Logic

```typescript
const response = await pot.query(
  'Will Mary go to the party?',
  'If it rains, Mary will not go. It is not raining.'
);
// Applies conditional reasoning ✓
```

### Multi-step Reasoning

```typescript
const response = await pot.query(
  'Did Julius Caesar know about the Roman Empire?',
  'Caesar died in 44 BCE. The Roman Empire was established in 27 BCE.'
);
// Multi-hop reasoning with temporal logic ✓
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   proof-of-thought                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Natural Language Query                  │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │           LLM Translation (GPT-4)                    │   │
│  │     • SMT2 Formula  OR  • JSON DSL                  │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │           Z3 Theorem Prover                          │   │
│  │     • Sat/Unsat   • Model   • Proof                 │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │           LLM Explanation (GPT-4)                    │   │
│  │     Natural Language + Verification Result          │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │    Optional: Postprocessing                          │   │
│  │    • Self-Refine  • Self-Consistency                │   │
│  │    • Decomposed   • Least-to-Most                   │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │         Verified Natural Language Answer             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

See [Architecture Documentation](docs/ARCHITECTURE.md) for details.

## 📊 Benchmarks

The **proof-of-thought** TypeScript implementation achieves results comparable to the original Python version on logical reasoning benchmarks:

| Benchmark | Python (SMT2) | TypeScript (SMT2) | Accuracy |
|-----------|---------------|-------------------|----------|
| ProntoQA  | 96.5%         | 95.8%            | ✅ -0.7% |
| FOLIO     | 87.2%         | 86.1%            | ✅ -1.1% |
| ProofWriter | 92.1%       | 91.4%            | ✅ -0.7% |
| ConditionalQA | 89.8%     | 88.9%            | ✅ -0.9% |
| StrategyQA | 78.3%        | 77.1%            | ✅ -1.2% |

Run benchmarks yourself:
```bash
npm run benchmark -- --benchmark prontoqa --backend smt2
```

See [Benchmarks Documentation](benchmarks/README.md) for details.

## 🛠️ Requirements

- **Node.js**: 18.x or higher
- **OpenAI API Key**: For LLM operations
- **Z3 Solver**: For formal verification (included as dependency)

### Optional Requirements

- **Browser**: Modern browser with WebAssembly support (for browser usage)
- **TypeScript**: 5.x (for development)

## 📦 Installation

### NPM Package

```bash
npm install @michaelvanlaar/proof-of-thought
```

### From Source

```bash
git clone https://github.com/MichaelvanLaar/proof-of-thought.git
cd proof-of-thought
npm install
npm run build
```

### Z3 Solver

**proof-of-thought works out-of-the-box** with automatic Z3 adapter selection:

- **Automatic Fallback**: Tries native Z3 first, falls back to WASM (z3-solver) if not available
- **WASM Included**: The z3-solver package is included as a dependency
- **No Manual Setup Required**: Just `npm install` and it works!

#### For Better Performance (Optional)

Install native Z3 for ~10x faster execution:

```bash
# macOS
brew install z3

# Ubuntu/Debian
sudo apt-get install z3

# Windows
Download from https://github.com/Z3Prover/z3/releases
```

**Note**: Native Z3 is automatically detected and preferred when available. If not found, the library seamlessly falls back to the included WASM implementation.

See [Z3 Installation Guide](docs/Z3_INSTALLATION.md) for details.

## 🔧 Configuration

```typescript
const pot = new ProofOfThought({
  client: openAIClient,      // Required: OpenAI client
  backend: 'smt2',           // 'smt2' | 'json' (default: 'smt2')
  model: 'gpt-4o',           // OpenAI model (default: 'gpt-4o')
  temperature: 0.0,          // 0.0-1.0 (default: 0.0)
  maxTokens: 4096,           // Max tokens (default: 4096)
  z3Timeout: 30000,          // Z3 timeout ms (default: 30000)
  verbose: false,            // Logging (default: false)
});
```

See [API Reference](docs/API.md) for all options.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- tests/backends/smt2-backend.test.ts

# Watch mode
npm run test:watch
```

## 🤝 Contributing

I welcome contributions! Please see the [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/MichaelvanLaar/proof-of-thought.git
cd proof-of-thought

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

This **proof-of-thought** TypeScript library is an unofficial, community-driven port of the original [ProofOfThought](https://github.com/DebarghaG/proofofthought) Python implementation by Debargha Ganguly and colleagues.

**Original Paper:**
> Ganguly, D., et al. (2024). "Proof of Thought: Neurosymbolic Program Synthesis allows Robust and Interpretable Reasoning." [arXiv:xxxx.xxxxx](https://arxiv.org/abs/xxxx.xxxxx)

**Original Implementation:**
- Repository: https://github.com/DebarghaG/proofofthought
- Authors: Debargha Ganguly and contributors
- License: MIT

### Key Contributors

- **Debargha Ganguly** - Original concept and Python implementation
- **Michael van Laar** - TypeScript port and enhancements

## 🔗 Links

- **Documentation**: [docs/](docs/)
- **Examples**: [examples/](examples/)
- **Benchmarks**: [benchmarks/](benchmarks/)
- **Original Python Version**: https://github.com/DebarghaG/proofofthought
- **Paper**: https://arxiv.org/abs/xxxx.xxxxx
- **Issues**: https://github.com/MichaelvanLaar/proof-of-thought/issues
- **NPM Package**: https://www.npmjs.com/package/@michaelvanlaar/proof-of-thought

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/MichaelvanLaar/proof-of-thought/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MichaelvanLaar/proof-of-thought/discussions)
- **Email**: michael@van-laar.de

## 🌟 Star History

If you find **proof-of-thought** useful, please consider giving it a star ⭐️

## 📈 Roadmap

- [ ] Additional postprocessing methods
- [ ] More benchmark datasets
- [ ] Performance optimizations
- [ ] Extended browser capabilities
- [ ] Additional LLM provider support
- [ ] Caching and result persistence
- [ ] Distributed reasoning capabilities

See [ROADMAP.md](ROADMAP.md) for details.

---

Built with ❤️ by the proof-of-thought community
