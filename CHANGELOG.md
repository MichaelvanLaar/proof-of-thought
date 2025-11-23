# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial TypeScript port of the ProofOfThought Python library
- Core reasoning engine with neurosymbolic program synthesis
- SMT2 backend for first-order logic reasoning
- JSON DSL backend for structured reasoning
- Z3 theorem prover integration (native and WASM)
- OpenAI and Azure OpenAI support
- Postprocessing methods:
  - Self-Refine for iterative improvement
  - Self-Consistency for majority voting
  - Decomposed Prompting for sub-problem solving
  - Least-to-Most for incremental reasoning
- Browser support with WASM adapter
- Performance optimization utilities:
  - LLM call profiling
  - Request batching
  - LRU caching with TTL
  - Optimized Z3 configurations
  - Lazy loading for optional features
  - WASM bundle optimization
- Comprehensive benchmark suite:
  - ProntoQA
  - FOLIO
  - ProofWriter
  - ConditionalQA
  - StrategyQA
- Performance comparison tools
- Complete TypeScript type definitions
- Extensive documentation and examples
- Z3 adapter mocking support for testing via `z3Adapter` config parameter

### Changed
- Updated SMT2Backend and JSONBackend to use consistent configuration objects
- Improved ProofOfThought initialization to support custom Z3 adapters
- Enhanced test compatibility across integration and unit test suites

### Fixed
- Fixed backend constructor signatures for improved API consistency
- Resolved Z3 adapter integration issues in test environments
- Fixed test mocking patterns across 20+ test files
- Improved test pass rate from 80% to 94% (223/237 tests passing)
- Resolved Z3 package fallback to CLI execution when API unavailable
- Fixed missing type imports in reasoning module

### Security
- N/A (initial release)

## [0.1.0] - TBD

### Added
- Initial beta release of ProofOfThought TypeScript port
- Full feature parity with Python implementation
- Enhanced TypeScript type safety
- Browser compatibility
- Performance optimizations
- Comprehensive test coverage (>80%)
- Complete API documentation

### Notes
This is the first beta release of the TypeScript port. The implementation maintains API compatibility with the original Python version while following TypeScript and Node.js conventions.

Key features:
- **Neurosymbolic Reasoning**: Combines LLMs with Z3 theorem proving
- **Multiple Backends**: SMT2 and JSON DSL support
- **Postprocessing Methods**: Self-Refine, Self-Consistency, Decomposed Prompting, Least-to-Most
- **Cross-Platform**: Node.js and browser support
- **Type-Safe**: Full TypeScript type definitions
- **Optimized**: Caching, batching, and lazy loading
- **Well-Tested**: Comprehensive test suite and benchmarks

## Release History

### Version 0.1.x (Beta)
Initial development releases for testing and validation.

---

## Migration Guide

### From Python to TypeScript

See [docs/MIGRATION.md](./docs/MIGRATION.md) for a comprehensive migration guide.

Quick example:

**Python:**
```python
from proofofthought import ProofOfThought

pot = ProofOfThought(api_key="your-key")
result = pot.query(question, context)
print(result.is_verified)
```

**TypeScript:**
```typescript
import { ProofOfThought } from '@michaelvanlaar/proof-of-thought';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pot = new ProofOfThought({ client });
const result = await pot.query(question, context);
console.log(result.isVerified);
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on contributing to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

This is a TypeScript port of the original [ProofOfThought](https://github.com/DebarghaG/proofofthought) Python implementation.

Original paper:
```
Proof of Thought: Neurosymbolic Program Synthesis allows Robust and Interpretable Reasoning
```

---

[unreleased]: https://github.com/MichaelvanLaar/proof-of-thought/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/MichaelvanLaar/proof-of-thought/releases/tag/v0.1.0
