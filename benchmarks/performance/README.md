# Performance Benchmarks

This directory contains performance benchmarking tools for comparing Z3 adapter implementations and profiling execution characteristics.

## Overview

The benchmarks measure:

- **Native vs WASM Performance**: Compare execution times between native Z3 binary and Z3 WASM
- **Formula Complexity**: Test how performance scales with constraint complexity
- **Overhead Analysis**: Quantify the performance overhead of WASM vs native

## Quick Start

### Install Dependencies

```bash
# Install z3-solver (required for WASM adapter)
npm install z3-solver

# Optional: Install native Z3 for comparison
# macOS:
brew install z3

# Linux:
sudo apt-get install z3
```

### Run Benchmarks

```bash
# Full benchmark suite (5 iterations per test)
npx tsx benchmarks/performance/run-benchmarks.ts

# Quick benchmark (3 iterations, fewer test cases)
npx tsx benchmarks/performance/run-benchmarks.ts --quick

# Save results to JSON file
npx tsx benchmarks/performance/run-benchmarks.ts --output results.json

# Compare with previous results
npx tsx benchmarks/performance/run-benchmarks.ts --output results.json --compare
```

### Run Individual Benchmarks

```bash
# Z3 adapter comparison only
npx tsx benchmarks/performance/z3-adapter-comparison.ts
```

## Benchmark Suites

### 1. Z3 Adapter Comparison

**File:** `z3-adapter-comparison.ts`

Compares native Z3 and Z3 WASM adapters across various formula types:

- Simple arithmetic (2 variables)
- Boolean logic (3 variables)
- Mixed arithmetic and logic (4 variables)
- Complex nested expressions (5 variables)
- Real numbers (3 variables)
- Large constraint systems (10 variables)
- UNSAT constraints (contradictions)

**Metrics:**

- Execution time (milliseconds)
- WASM overhead (ratio of WASM time to native time)
- Average, minimum, and maximum overhead

**Expected Results:**

- WASM is typically **2-3x slower** than native Z3
- Simple formulas: 100-150ms (WASM) vs 50-75ms (native)
- Complex formulas: 300-500ms (WASM) vs 150-200ms (native)
- Overhead increases with formula complexity

## Understanding Results

### Sample Output

```
Test Case                          │ Native (ms) │ WASM (ms) │ Overhead
───────────────────────────────────┼─────────────┼───────────┼──────────
Simple arithmetic (2 variables)    │       52.3  │    145.2  │ 2.77x
Boolean logic (3 variables)        │       48.1  │    138.5  │ 2.88x
Mixed arithmetic and logic         │       61.2  │    182.4  │ 2.98x
Complex nested expressions         │       89.5  │    267.3  │ 2.99x
Real numbers (3 variables)         │       54.7  │    156.8  │ 2.87x
Large constraint system            │      142.8  │    423.6  │ 2.97x
UNSAT constraint                   │       38.2  │    112.4  │ 2.94x

Summary Statistics:
  Average WASM overhead: 2.91x
  Minimum overhead: 2.77x (best case)
  Maximum overhead: 2.99x (worst case)
```

### Interpreting Overhead

- **< 2.0x**: Excellent WASM performance (rarely achieved)
- **2.0x - 3.0x**: Good WASM performance (expected range)
- **3.0x - 4.0x**: Acceptable WASM performance
- **> 4.0x**: Poor performance, investigate bottlenecks

### Factors Affecting Performance

1. **Formula Complexity**: More variables and constraints = higher overhead
2. **Operation Types**: Some operations (e.g., division, modulo) have higher overhead
3. **Browser Environment**: Browser WASM may be slower than Node.js WASM
4. **Memory Usage**: Large formulas may hit memory limits in WASM
5. **Warmup**: First execution is slower due to JIT compilation

## Profiling Guidelines

### Best Practices

1. **Run with warmup**: First execution excluded from timing
2. **Multiple iterations**: Average of 5+ runs for reliable results
3. **Controlled environment**: Close unnecessary applications
4. **Consistent formulas**: Use same test cases for comparison
5. **Document system**: Record CPU, memory, OS for reproducibility

### Benchmark Considerations

- Results vary by system (CPU, memory, OS)
- Browser results differ from Node.js results
- Native Z3 performance depends on binary version and compilation flags
- WASM performance improves with browser/runtime updates

## Custom Benchmarks

### Adding New Test Cases

Edit `z3-adapter-comparison.ts`:

```typescript
const testCases = [
  // ... existing cases
  {
    name: 'Your custom test',
    formula: `
      (declare-const x Int)
      (assert (> x 0))
      (check-sat)
    `,
  },
];
```

### Creating New Benchmark Scripts

Use the existing scripts as templates:

```typescript
import { Z3NativeAdapter, Z3WASMAdapter } from '../../src/adapters/index.js';

async function benchmarkCustom() {
  const adapter = new Z3WASMAdapter({ timeout: 30000 });

  // Your benchmark logic here
}
```

## Interpreting Performance Data

### When to Use Native Z3

Use native Z3 when:

- ✅ Performance is critical (< 100ms required)
- ✅ Server-side only (no browser requirement)
- ✅ Native Z3 installation is feasible
- ✅ Advanced SMT2 features needed (quantifiers, theories)

### When to Use Z3 WASM

Use Z3 WASM when:

- ✅ Browser support required
- ✅ Zero-install deployment preferred
- ✅ 200-400ms latency acceptable
- ✅ Basic SMT2 features sufficient (no quantifiers)
- ✅ Consistent behavior across environments desired

## Troubleshooting

### z3-solver Not Found

```bash
npm install z3-solver
```

### Native Z3 Not Found

The benchmark will run WASM-only mode. Install native Z3:

```bash
# macOS:
brew install z3

# Linux:
sudo apt-get install z3

# Windows:
# Download from https://github.com/Z3Prover/z3/releases
```

### Benchmark Times Out

Increase timeout in benchmark scripts:

```typescript
const adapter = new Z3WASMAdapter({ timeout: 60000 }); // 60 seconds
```

### Memory Issues

Some formulas may exhaust WASM memory. Try:

1. Simplify test formulas
2. Reduce number of variables
3. Use native Z3 for complex cases

## Performance Goals

### Current Status (v0.1.0)

- ✅ WASM overhead: 2-3x (target met)
- ✅ Simple queries: < 200ms (target met)
- ✅ Complex queries: < 500ms (target met)
- ✅ Parse caching: < 1ms for cached formulas (target met)

### Future Improvements (v0.2.0+)

- [ ] Reduce WASM overhead to 1.5-2x
- [ ] Optimize parser for large formulas
- [ ] Add incremental solving support
- [ ] Implement parallel query execution

## Contributing

To add new benchmarks:

1. Create a new `.ts` file in `benchmarks/performance/`
2. Follow the existing benchmark structure
3. Update this README with usage instructions
4. Add to `run-benchmarks.ts` if appropriate

## References

- [Z3 Theorem Prover](https://github.com/Z3Prover/z3)
- [z3-solver npm package](https://www.npmjs.com/package/z3-solver)
- [SMT-LIB 2.0 Standard](http://smtlib.cs.uiowa.edu/)
- [WebAssembly Performance](https://webassembly.org/docs/faq/#performance)

## License

MIT - See [LICENSE](../../LICENSE)
