# Design Document: TypeScript Port of ProofOfThought

## Context

ProofOfThought is a neurosymbolic reasoning library that combines Large Language Models (LLMs) with formal theorem proving using Z3. The original implementation is in Python, targeting the Python ecosystem. This design covers the TypeScript port that will bring the same capabilities to JavaScript/TypeScript developers.

### Background
- Original: Python 3.12+ with Z3 Python bindings
- Target: TypeScript 5.0+ for Node.js v18+ and modern browsers
- Maintains conceptual API compatibility while adopting TypeScript idioms

### Constraints
- Must support both Node.js and browser environments
- Z3 solver must work in both contexts (native bindings + WASM)
- Type safety throughout - minimal use of `any` type
- Performance should match or exceed Python implementation
- API should feel natural to TypeScript/JavaScript developers

### Stakeholders
- JavaScript/TypeScript developers needing neurosymbolic reasoning
- Researchers porting Python-based reasoning systems to the web
- Full-stack developers integrating reasoning into Node.js/browser apps
- Original ProofOfThought users seeking cross-platform compatibility

## Goals / Non-Goals

### Goals
1. **Complete Feature Parity**: Implement all features from Python version (dual backends, postprocessing, benchmarks)
2. **Type Safety**: Leverage TypeScript's type system for compile-time safety and IDE support
3. **Cross-Platform**: Support Node.js and browser environments seamlessly
4. **Developer Experience**: Provide intuitive APIs, clear documentation, and helpful error messages
5. **Performance**: Match or exceed Python implementation's accuracy benchmarks
6. **Maintainability**: Clear architecture that's easy to extend and debug

### Non-Goals
1. **Python Compatibility Layer**: Not creating Python API bindings or syntax emulation
2. **CLI Tool**: Not porting any command-line interfaces from Python version (library only)
3. **Training Infrastructure**: Not porting model training or fine-tuning code
4. **Legacy Support**: No support for older Node.js versions (<18) or IE11
5. **Real-time Streaming**: Not implementing streaming responses in initial version

## Decisions

### Decision 1: Module Architecture - Two-Layer Design

**What**: Adopt the same two-layer architecture as Python implementation:
- **High-level API** (`src/reasoning/`): User-facing `ProofOfThought` class
- **Low-level Backend** (`src/backends/`): SMT2 and JSON backend implementations
- **Adapter Layer** (`src/adapters/`): Z3 solver integration abstractions

**Why**:
- Proven architecture from Python implementation
- Clear separation of concerns
- Easy to add new backends or postprocessing methods
- Users can choose between simple high-level API or direct backend access

**Alternatives Considered**:
- **Flat Architecture**: Single layer mixing API and backend logic - Rejected due to poor maintainability
- **Three-Layer with Service Layer**: Additional service layer between API and backend - Rejected as over-engineering for current scope

### Decision 2: Z3 Integration Strategy - Dual Adapter Pattern

**What**: Implement two Z3 adapters:
- **Native Adapter** (`src/adapters/z3-native.ts`): Uses `z3-solver` npm package for Node.js
- **WASM Adapter** (`src/adapters/z3-wasm.ts`): Uses Z3 WASM bindings for browsers
- **Unified Interface** (`src/adapters/z3-adapter.ts`): Abstract base class/interface

**Why**:
- Z3 has different integration points for Node.js vs browser
- Native bindings offer better performance in Node.js
- WASM is the only option for browsers
- Unified interface allows seamless environment switching

**Alternatives Considered**:
- **WASM Only**: Use WASM everywhere - Rejected due to performance loss in Node.js
- **Node.js Only**: Skip browser support - Rejected as it limits adoption
- **Child Process Only**: Shell out to Z3 CLI - Rejected as it doesn't work in browsers and complicates deployment

### Decision 3: Backend Selection - Runtime Strategy Pattern

**What**: Use Strategy Pattern for backend selection:
```typescript
type BackendType = 'smt2' | 'json';

interface Backend {
  translate(question: string, context: string): Promise<Formula>;
  verify(formula: Formula): Promise<VerificationResult>;
}

class SMT2Backend implements Backend { /* ... */ }
class JSONBackend implements Backend { /* ... */ }
```

**Why**:
- Matches Python implementation approach
- Easy to add new backends in the future
- Clear interface contract
- Users can switch backends via configuration

**Alternatives Considered**:
- **Plugin System**: Dynamic backend loading - Rejected as over-engineering
- **Hardcoded Backends**: No abstraction - Rejected due to poor extensibility

### Decision 4: Async/Await Throughout

**What**: All I/O operations use async/await, no callbacks or Promises directly exposed:
```typescript
async query(question: string, context?: string): Promise<ReasoningResponse>
```

**Why**:
- Modern JavaScript/TypeScript convention
- Better error handling with try/catch
- Cleaner code than Promise chains
- Aligns with OpenAI SDK which is async

**Alternatives Considered**:
- **Callback API**: Rejected as outdated pattern
- **Promise API**: Rejected in favor of async/await syntactic sugar
- **Observable/Stream**: Rejected as over-complication for initial version

### Decision 5: Testing Framework - Vitest

**What**: Use Vitest for unit and integration tests

**Why**:
- Fast execution with intelligent watch mode
- ESM and TypeScript support out of the box
- Compatible with Jest API (easy Python developer familiarity)
- Better performance than Jest
- Excellent TypeScript integration

**Alternatives Considered**:
- **Jest**: Slower, requires more configuration for ESM/TypeScript
- **Mocha/Chai**: Older, less TypeScript-friendly
- **Ava**: Less mainstream, smaller community

### Decision 6: Build System - TypeScript + esbuild

**What**:
- TypeScript compiler (`tsc`) for type checking and declaration files
- esbuild for fast bundling (CJS + ESM outputs)
- Separate browser bundle with WASM adapter

**Why**:
- `tsc` is canonical for `.d.ts` generation
- esbuild is extremely fast for production builds
- Need both CJS (Node.js compatibility) and ESM (modern bundlers)
- Browser bundle needs different entry point (WASM adapter)

**Alternatives Considered**:
- **Rollup**: Slower than esbuild, more configuration
- **Webpack**: Much slower, over-featured for library use
- **tsc Only**: Doesn't bundle, each file separate (poor DX)

### Decision 7: OpenAI SDK Integration - Official SDK

**What**: Use official `openai` npm package for all LLM interactions

**Why**:
- Official support from OpenAI
- Handles both OpenAI and Azure OpenAI
- Built-in retry logic and error handling
- TypeScript-first design
- Active maintenance

**Alternatives Considered**:
- **Custom HTTP Client**: Rejected due to maintenance burden
- **LangChain**: Too heavyweight, pulls in many dependencies
- **Generic AI SDK**: Less maintained, incomplete typing

### Decision 8: Error Handling - Custom Error Classes

**What**: Define custom error classes for different failure modes:
```typescript
class ProofOfThoughtError extends Error { /* ... */ }
class LLMError extends ProofOfThoughtError { /* ... */ }
class Z3Error extends ProofOfThoughtError { /* ... */ }
class ValidationError extends ProofOfThoughtError { /* ... */ }
```

**Why**:
- Allows consumers to catch specific error types
- Enables better error messages and diagnostics
- Follows TypeScript best practices
- Makes debugging easier

**Alternatives Considered**:
- **Generic Errors**: Less informative, harder to handle specifically
- **Error Codes**: More verbose, less TypeScript-idiomatic

### Decision 9: Configuration - Options Object Pattern

**What**: Use configuration objects with TypeScript interfaces:
```typescript
interface ProofOfThoughtConfig {
  backend: BackendType;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  z3Timeout?: number;
  postprocessing?: PostprocessingMethod[];
}
```

**Why**:
- Idiomatic TypeScript pattern
- Excellent IDE autocomplete
- Type-safe configuration
- Easy to extend with optional properties

**Alternatives Considered**:
- **Builder Pattern**: More verbose, less JavaScript-idiomatic
- **Fluent Interface**: Harder to type, less clear

### Decision 10: Package Structure - Single Package

**What**: Publish as single npm package `@proofofthought/typescript` (or similar) with multiple entry points:
- Main: `import { ProofOfThought } from '@proofofthought/typescript'`
- Browser: `import { ProofOfThought } from '@proofofthought/typescript/browser'`
- Backends: `import { SMT2Backend } from '@proofofthought/typescript/backends'`

**Why**:
- Simpler for users (single install)
- Easier to maintain version coherence
- Most common pattern for TypeScript libraries
- Tree-shaking handles unused code

**Alternatives Considered**:
- **Monorepo with Multiple Packages**: Over-engineering for current scope
- **Single Entry Point**: Forces users to import unused code

## Technical Decisions

### Type System Design
- **Strict Mode**: Enable all TypeScript strict checks
- **Exported Types**: Export all public interfaces and types for library consumers
- **Generic Types**: Use generics for extensible response types
- **Branded Types**: Use branded types for Z3 formulas to prevent mixing SMT2 and JSON

### File Organization
```
src/
├── reasoning/           # High-level API
│   ├── proof-of-thought.ts
│   └── types.ts
├── backends/            # Backend implementations
│   ├── smt2-backend.ts
│   ├── json-backend.ts
│   └── backend-interface.ts
├── adapters/            # Z3 integration
│   ├── z3-adapter.ts    # Abstract interface
│   ├── z3-native.ts     # Node.js native
│   └── z3-wasm.ts       # Browser WASM
├── postprocessing/      # Enhancement methods
│   ├── self-refine.ts
│   ├── self-consistency.ts
│   ├── decomposed.ts
│   └── least-to-most.ts
├── types/               # Shared type definitions
│   └── index.ts
└── index.ts             # Main entry point
```

### Dependency Management
- **Core Dependencies**: `openai`, `z3-solver` (Node), `zod` (validation)
- **Dev Dependencies**: `vitest`, `typescript`, `esbuild`, `eslint`, `prettier`
- **Peer Dependencies**: None (bundle everything for DX)

### Browser Bundle Strategy
- WASM file copied to `dist/wasm/` during build
- Browser entry point loads WASM from relative path or CDN
- Provide examples for webpack, vite, and vanilla HTML usage

## Risks / Trade-offs

### Risk 1: Z3 WASM Performance
**Risk**: Z3 WASM may be significantly slower than native bindings
**Impact**: High - affects browser usability
**Mitigation**:
- Benchmark early to validate performance
- Document performance characteristics
- Consider server-side API option for heavy workloads
- Provide worker thread option to avoid blocking UI

### Risk 2: OpenAI API Costs
**Risk**: Extensive LLM calls can be expensive for users
**Impact**: Medium - affects adoption
**Mitigation**:
- Document token usage for different operations
- Provide caching mechanisms for repeated queries
- Support local LLM models in future versions
- Clear documentation about cost implications

### Risk 3: Python API Divergence
**Risk**: Python implementation evolves, TypeScript port lags behind
**Impact**: Medium - feature parity concerns
**Mitigation**:
- Monitor Python repo for updates
- Maintain change log documenting differences
- Establish clear versioning to track Python version parity

### Risk 4: Z3 Version Incompatibilities
**Risk**: Different Z3 versions behave differently
**Impact**: Medium - affects reliability
**Mitigation**:
- Pin to specific Z3 version range
- Document supported versions
- Add version detection and warnings
- Extensive testing across versions

### Risk 5: Large Bundle Size
**Risk**: Browser bundle may be too large with Z3 WASM
**Impact**: Medium - affects web app performance
**Mitigation**:
- Lazy load WASM only when needed
- Provide lite version without browser support
- Clear documentation about bundle sizes
- Examples showing code splitting

## Migration Plan

### Phase 1: Core Infrastructure (Weeks 1-2)
1. Set up TypeScript project with build tooling
2. Implement Z3 adapters (native and WASM)
3. Create basic type definitions
4. Set up testing framework

### Phase 2: Backend Implementation (Weeks 3-4)
1. Implement SMT2 backend
2. Implement JSON backend
3. Add backend tests matching Python test suite
4. Validate against Python implementation outputs

### Phase 3: High-Level API (Week 5)
1. Implement ProofOfThought class
2. Add configuration management
3. Implement error handling
4. Create examples and documentation

### Phase 4: Postprocessing (Week 6)
1. Implement self-refine
2. Implement self-consistency
3. Implement decomposed prompting
4. Implement least-to-most prompting

### Phase 5: Testing & Benchmarks (Week 7)
1. Port all Python tests to TypeScript
2. Implement benchmark suite
3. Run accuracy validations
4. Performance profiling and optimization

### Phase 6: Documentation & Release (Week 8)
1. Complete API documentation
2. Write migration guide from Python
3. Create usage examples
4. Prepare npm package for release

### Rollback Strategy
- Each phase produces working, tested code
- Can release incrementally (e.g., SMT2 backend only initially)
- Git branches for each phase enable easy rollback
- Feature flags for experimental features

## Open Questions

1. **Q**: Should we support streaming responses for long-running queries?
   **Status**: Deferred to v2 - adds significant complexity

2. **Q**: Should we bundle Z3 WASM or expect users to provide it?
   **Status**: Bundle for better DX, document self-hosting option

3. **Q**: Should we support local LLM models (Ollama, etc.)?
   **Status**: Future consideration, focus on OpenAI initially

4. **Q**: Should we provide a React/Vue component library?
   **Status**: Out of scope, can be community contribution

5. **Q**: What's the package name and organization?
   **Status**: Decided - using `@michaelvanlaar/proof-of-thought`

6. **Q**: Should we implement caching for repeated queries?
   **Status**: Yes, but as opt-in feature with configurable cache backend

7. **Q**: Should browser bundle include Node.js-specific code?
   **Status**: No, use conditional exports to provide separate builds

## References

- Original Python Implementation: https://github.com/DebarghaG/proofofthought
- Z3 Documentation: https://z3prover.github.io/
- Z3 WASM: https://github.com/Z3Prover/z3/tree/master/src/api/js
- OpenAI SDK: https://github.com/openai/openai-node
- SMT-LIB Standard: http://smtlib.cs.uiowa.edu/
