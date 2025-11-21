# Project Context

## Purpose

This is a TypeScript port of [ProofOfThought](https://github.com/DebarghaG/proofofthought), a neurosymbolic program synthesis library that combines large language models with formal reasoning capabilities. The project implements the approach described in the paper "Proof of Thought: Neurosymbolic Program Synthesis allows Robust and Interpretable Reasoning."

### Goals

- Provide TypeScript/JavaScript developers with the same neurosymbolic reasoning capabilities available in the Python implementation
- Enable machines to answer complex logical questions by translating natural language into formal logical statements verified using automated theorem proving (Z3)
- Support both Node.js and browser environments where possible
- Maintain conceptual API compatibility with the original Python implementation while adopting TypeScript idioms and type safety

## Tech Stack

- **TypeScript** - Primary language for type-safe implementation
- **Node.js** - Primary runtime environment
- **Z3 Solver** - Theorem proving engine (via WASM or native bindings)
- **OpenAI SDK** - Integration with GPT models for LLM-based reasoning
- **Azure OpenAI** - Optional cloud platform support
- **ESLint/Prettier** - Code formatting and linting
- **Jest/Vitest** - Testing framework (TBD)
- **Package Manager** - npm/pnpm/yarn (TBD)

## Project Conventions

### Code Style

- Follow TypeScript best practices and strict type checking
- Use ESLint for linting and Prettier for code formatting
- Use descriptive variable and function names that reflect their purpose
- Prefer functional programming patterns where appropriate
- Use async/await for asynchronous operations
- Export types alongside implementations for library consumers
- Document public APIs with JSDoc comments including type information

### Architecture Patterns

The project follows a **two-layer architecture** based on the original Python implementation:

1. **High-level API Layer** (`reasoning` module)
   - Provides simple, user-friendly interfaces for reasoning operations
   - Abstracts away backend complexity
   - TypeScript-first API design

2. **Low-level Backend Layer** (`backends` module)
   - Handles backend selection (SMT2 vs JSON DSL)
   - Manages Z3 solver interaction and translation
   - Provides execution engine for logical reasoning

**Key Patterns:**
- Strategy pattern for backend selection (SMT2 vs JSON)
- Adapter pattern for Z3 solver integration
- Builder pattern for constructing complex reasoning queries
- Separation of concerns between LLM interaction and theorem proving

### Testing Strategy

- **Unit Tests**: Test individual components and functions in isolation
- **Integration Tests**: Test interaction between LLM and Z3 solver
- **Compatibility Tests**: Validate TypeScript port matches Python implementation behavior
- **Benchmark Tests**: Evaluate performance against reasoning benchmarks (ProntoQA, FOLIO, ProofWriter, ConditionalQA, StrategyQA)
- Test coverage should match or exceed the original Python implementation
- Test cases should verify both SMT2 and JSON backends
- Mock LLM responses for deterministic testing where appropriate

### Git Workflow

- **Branching Strategy**: Feature branches merged to `main` via pull requests
- **Commit Conventions**: Use [Conventional Commits](https://www.conventionalcommits.org/) with [gitmoji](https://gitmoji.dev/)
  - Format: `<gitmoji> <type>(<scope>): <description>`
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`
  - Example: `✨ feat(reasoning): add support for JSON DSL backend`
- **PR Reviews**: Automated Claude Code review via GitHub Actions
- **Main Branch**: Protected, requires PR approval

## Domain Context

### Neurosymbolic Reasoning

The project operates at the intersection of symbolic AI and neural networks:

- **Neural Component**: LLMs (GPT-4o, GPT-5) translate natural language into formal logic
- **Symbolic Component**: Z3 theorem prover verifies logical statements using SMT solving
- This combination enables robust, interpretable reasoning with formal guarantees

### Key Concepts

- **SMT (Satisfiability Modulo Theories)**: Framework for checking satisfiability of logical formulas
- **Z3 Solver**: Microsoft Research's theorem prover supporting SMT-LIB 2.0
- **Backend Types**:
  - **SMT2**: Standard SMT-LIB 2.0 format via Z3 CLI
  - **JSON DSL**: Custom domain-specific language via Z3 API
- **Reasoning Enhancement Techniques**:
  - Self-Refine: Iterative improvement of reasoning
  - Self-Consistency: Multiple reasoning paths for validation
  - Decomposed Prompting: Breaking complex problems into sub-problems
  - Least-to-Most Prompting: Progressive problem solving

### Performance Expectations

Based on the Python implementation, the system should achieve:
- ProntoQA: ~100% accuracy
- FOLIO: ~68-85% accuracy (varies by backend)
- ProofWriter: ~75-90% accuracy
- ConditionalQA: ~70-85% accuracy
- StrategyQA: ~75-80% accuracy

## Important Constraints

### Technical Constraints

- **Z3 Availability**: Must provide Z3 solver access in both Node.js and browser environments (may require WASM build for browsers)
- **TypeScript Compatibility**: Maintain strict TypeScript type safety throughout
- **API Compatibility**: While adapting to TypeScript conventions, maintain conceptual compatibility with Python API for easier migration
- **Runtime Support**: Minimum Node.js version TBD (likely v18+ for modern features)
- **Browser Support**: Modern browsers with ES2020+ support

### Development Constraints

- **Reference Implementation**: Must consult original Python implementation for algorithm design and expected behavior
- **Type Safety**: No use of `any` type except where absolutely necessary and documented
- **Testing**: All features must have corresponding tests before merging
- **Documentation**: Public APIs must be documented with JSDoc

### Business/Legal Constraints

- **License**: Must respect original project's license
- **Attribution**: Credit original author (DebarghaG) and reference paper
- **API Keys**: Users must provide their own OpenAI/Azure API keys

## External Dependencies

### Required Services

- **OpenAI API**: Primary LLM provider for reasoning translation
  - Models: GPT-4o, GPT-5 (when available)
  - Requires API key from users
  - Rate limiting considerations

- **Azure OpenAI** (Optional): Alternative cloud platform
  - Same model support as OpenAI
  - Enterprise deployment option

### Required Libraries

- **Z3 Solver**: Core theorem proving engine
  - Native bindings for Node.js (z3-solver npm package or similar)
  - WASM build for browser support
  - Must support SMT-LIB 2.0 format

### Development Dependencies

- **TypeScript Compiler**: Latest stable version
- **Testing Framework**: Jest or Vitest
- **Build Tools**: TypeScript compiler, bundler for browser builds (esbuild/rollup)
- **CI/CD**: GitHub Actions for automated testing and deployment

### Reference Resources

- **Original Implementation**: https://github.com/DebarghaG/proofofthought
- **Research Paper**: "Proof of Thought: Neurosymbolic Program Synthesis allows Robust and Interpretable Reasoning"
- **Z3 Documentation**: https://z3prover.github.io/
- **SMT-LIB Standard**: http://smtlib.cs.uiowa.edu/
