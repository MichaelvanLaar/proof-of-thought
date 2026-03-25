# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (Empty — ready for next version's changes)

## [0.1.1] - 2026-03-25

### Changed
- Upgraded z3-solver from 4.12.5 to 4.16.0 (resolves medium supply chain risk, eval() usage)
- CI badge in README now correctly links to test.yml workflow

### Fixed
- GitHub Actions release workflow no longer fails if a version was already published manually

## [0.1.0] - 2026-03-25

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
- Improved test pass rate to 97.6% (367/376 tests passing, 9 skipped by design)
- Resolved Z3 package fallback to CLI execution when API unavailable
- Fixed missing type imports in reasoning module

[unreleased]: https://github.com/MichaelvanLaar/proof-of-thought/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/MichaelvanLaar/proof-of-thought/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MichaelvanLaar/proof-of-thought/releases/tag/v0.1.0
