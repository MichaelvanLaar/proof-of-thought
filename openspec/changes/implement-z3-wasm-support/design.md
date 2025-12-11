# Design: Z3 WASM Support Implementation

## Context

The z3-solver npm package provides Z3 theorem proving via WebAssembly with a JavaScript API. However, this API is fundamentally different from SMT-LIB 2.0 syntax:

- **SMT2 Format**: Text-based declarations and assertions like `(declare-const x Int)` and `(assert (> x 0))`
- **z3-solver API**: Programmatic JavaScript calls like `Int.const('x')` and `solver.add(gt(x, 0))`

The current implementation has placeholder code in `z3-wasm.ts:91-182` that parses SMT2 commands but doesn't execute them. We need a translation layer that converts SMT2 syntax into z3-solver API calls.

**Stakeholders:**
- Library users wanting browser support
- Developers without native Z3 installed
- Contributors maintaining the codebase

**Constraints:**
- Must maintain backward compatibility with existing native Z3 support
- Cannot break the existing Z3NativeAdapter behavior
- Should handle at least 80% of common SMT2 constructs used by the library
- Performance should be acceptable (within 2x of native Z3 for typical queries)

## Goals / Non-Goals

**Goals:**
- Parse common SMT2 declarations: `declare-const`, `declare-fun`
- Parse standard SMT2 assertions with supported theories (Int, Bool, Real, comparison operators, logical operators)
- Execute parsed formulas using z3-solver JavaScript API
- Return proper sat/unsat/unknown results with models
- Provide helpful error messages for unsupported SMT2 features
- Enable browser example to run without native Z3
- Implement automatic fallback from native to WASM in Node.js

**Non-Goals:**
- Supporting 100% of SMT-LIB 2.0 specification (focus on what the library actually generates)
- Custom SMT2 tactics or solver configurations (use defaults)
- Optimizing for large-scale formulas (focus on reasoning queries, not SAT solving)
- Supporting every Z3 theory (focus on QF_LIA, QF_LIRA, QF_BV, basic uninterpreted functions)

## Decisions

### Decision 1: Two-Stage Architecture (Parser + Executor)

**Choice:** Separate SMT2 parsing from execution

**Rationale:**
- **Testability**: Can unit test parser without Z3, executor with mocked parse trees
- **Maintainability**: Clear separation of concerns
- **Debuggability**: Can inspect parse tree before execution
- **Reusability**: Parser could be used for validation or other purposes

**Alternatives Considered:**
1. **Single-pass interpreter**: Simpler but harder to test and debug
2. **AST-based full compiler**: Over-engineered for our needs, adds complexity

**Implementation:**
```typescript
// src/adapters/smt2-parser.ts
export function parseSMT2(formula: string): SMT2Command[]

// src/adapters/smt2-executor.ts
export async function executeSMT2Commands(
  commands: SMT2Command[],
  z3Context: any
): Promise<VerificationResult>
```

### Decision 2: Incremental SMT2 Support

**Choice:** Start with core constructs, add more as needed

**Phase 1 (Minimum Viable):**
- Commands: `declare-const`, `assert`, `check-sat`, `get-model`
- Types: `Int`, `Bool`, `Real`
- Operations: `and`, `or`, `not`, `=>`, `=`, `<`, `<=`, `>`, `>=`, `+`, `-`, `*`

**Phase 2 (Extended):**
- Commands: `declare-fun`, `define-fun`, `set-logic`
- Types: `BitVec`, `Array` (if needed)
- Operations: Modulo, division, string operations

**Rationale:**
- Get working functionality faster
- Real-world testing reveals which features are actually needed
- Allows incremental complexity addition
- Phase 1 covers ~90% of library-generated SMT2

**Alternatives Considered:**
1. **Full SMT-LIB 2.0 support**: Too ambitious, diminishing returns
2. **Minimal support only**: Risk of missing critical constructs

### Decision 3: Error Handling Strategy

**Choice:** Fail gracefully with actionable error messages

**Behavior:**
- Unsupported SMT2 construct → Detailed error with suggestion to use native Z3
- Parse error → Show position and expected syntax
- Execution error → Z3 error with context

**Rationale:**
- Users understand limitations clearly
- Provides upgrade path (use native Z3 for complex cases)
- Maintains library usability even with partial WASM support

**Example Error:**
```
Z3 WASM Error: Unsupported SMT2 construct 'quantifier forall'
Suggestion: Install native Z3 for advanced SMT2 features:
  macOS: brew install z3
  Linux: sudo apt-get install z3
```

### Decision 4: Fallback Strategy in Node.js

**Choice:** Try native Z3 first, automatically fall back to WASM

**Implementation** (`src/adapters/utils.ts:56-99`):
```typescript
export async function createZ3Adapter(config?) {
  if (isBrowser()) return new Z3WASMAdapter(config);

  // Node.js: Try native first
  const nativeAdapter = new Z3NativeAdapter(config);
  if (await nativeAdapter.isAvailable()) {
    return nativeAdapter;
  }

  // Fallback to WASM
  const wasmAdapter = new Z3WASMAdapter(config);
  if (await wasmAdapter.isAvailable()) {
    return wasmAdapter;
  }

  throw new Error('No Z3 adapter available...');
}
```

**Rationale:**
- Native Z3 is faster when available
- WASM provides zero-install option
- Graceful degradation improves UX
- Existing code continues to work

**Alternatives Considered:**
1. **WASM-first**: Slower, ignores faster native option
2. **Require explicit choice**: Poor UX, decision fatigue

## Risks / Trade-offs

### Risk 1: Incomplete SMT2 Coverage

**Risk:** Some SMT2 formulas from LLMs may use unsupported constructs

**Mitigation:**
- Log telemetry of unsupported constructs encountered
- Provide clear error messages with workarounds
- Expand parser based on real-world usage patterns
- Document known limitations prominently

**Trade-off:** Accepting partial support for faster delivery

### Risk 2: Performance Degradation

**Risk:** WASM may be slower than native Z3 for complex queries

**Mitigation:**
- Benchmark WASM vs native performance
- Set realistic expectations in documentation
- Recommend native Z3 for performance-critical applications
- Optimize hot paths in executor

**Trade-off:** Convenience vs performance - let users choose

### Risk 3: Maintenance Burden

**Risk:** Custom parser adds complexity to maintain

**Mitigation:**
- Comprehensive test suite for parser
- Clear separation of parser and executor
- Document parser design and SMT2 subset
- Consider adopting existing SMT2 parser library if one emerges

**Trade-off:** Added complexity vs browser support value

### Risk 4: z3-solver Package Breaking Changes

**Risk:** z3-solver API may change in future versions

**Mitigation:**
- Pin z3-solver version in package.json
- Add integration tests for z3-solver API
- Monitor z3-solver releases
- Abstract z3-solver API calls for easier adaptation

**Trade-off:** Version lock-in vs stability

## Migration Plan

This is additive functionality with no breaking changes.

**Rollout Steps:**

1. **Phase 1: Implementation** (this change)
   - Implement SMT2 parser and executor
   - Add comprehensive tests
   - Update Z3WASMAdapter to use new components

2. **Phase 2: Testing** (part of this change)
   - Integration tests with real SMT2 formulas
   - Browser example validation
   - Performance benchmarking

3. **Phase 3: Documentation** (part of this change)
   - Update README with WASM support status
   - Modify TESTING_GUIDE browser section
   - Add WASM-specific troubleshooting

4. **Phase 4: Beta Release**
   - Release as v0.1.1 or v0.2.0
   - Gather user feedback
   - Monitor for unsupported SMT2 constructs

**Rollback:**
- No rollback needed (additive change)
- Users can continue using native Z3 if WASM has issues
- Can mark WASM as experimental if problems arise

## Open Questions

1. **Should we support custom SMT2 tactics?**
   - **Recommendation**: No for initial implementation, add if requested
   - **Rationale**: Complexity vs benefit unclear

2. **How to handle SMT2 features beyond phase 1?**
   - **Recommendation**: Incremental addition based on user feedback
   - **Tracking**: Log unsupported constructs with telemetry (opt-in)

3. **Should WASM be default in Node.js if both available?**
   - **Recommendation**: No, keep native as default (performance)
   - **Allow**: Configuration option to prefer WASM

4. **Performance target for WASM vs native?**
   - **Recommendation**: Within 2-3x for typical reasoning queries
   - **Acceptable**: Slower for browser use case, convenience over speed

5. **Error handling for partial models?**
   - **Recommendation**: Return partial models with warning
   - **Alternative**: Fail fast and return error

## Implementation Notes

**Key Files to Modify:**
- `src/adapters/z3-wasm.ts:91-182` - Replace placeholder with actual execution
- `src/adapters/utils.ts:68-82` - Already has fallback logic, may need tweaks
- `examples/browser/index.html:192-243` - Remove demo mode, enable real execution

**Key Files to Create:**
- `src/adapters/smt2-parser.ts` - ~300-400 lines
- `src/adapters/smt2-executor.ts` - ~200-300 lines
- `tests/adapters/smt2-parser.test.ts` - ~500+ lines
- `tests/adapters/z3-wasm-smt2.test.ts` - ~300+ lines

**Testing Strategy:**
- Unit tests for parser (100+ test cases)
- Unit tests for executor (50+ test cases)
- Integration tests with real SMT2 from backend (20+ test cases)
- Browser manual testing with example
- Performance benchmarks comparing native vs WASM

**Success Criteria:**
- ✅ All existing tests pass
- ✅ WASM adapter handles all SMT2 from library backends
- ✅ Browser example runs without native Z3
- ✅ Performance within acceptable range (2-3x native)
- ✅ Clear error messages for unsupported features
- ✅ Documentation reflects WASM support accurately
