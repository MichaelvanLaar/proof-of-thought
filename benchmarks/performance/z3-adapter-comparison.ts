/**
 * Z3 Adapter Performance Comparison Benchmark
 *
 * This script benchmarks the performance difference between native Z3 and Z3 WASM adapters.
 * It tests various formula complexities and provides detailed performance metrics.
 *
 * Usage:
 *   npx tsx benchmarks/performance/z3-adapter-comparison.ts
 *
 * Requirements:
 *   - z3-solver package must be installed
 *   - Native Z3 binary optional (will be compared if available)
 */

import { Z3NativeAdapter, Z3WASMAdapter } from '../../src/adapters/index.js';

interface BenchmarkResult {
  name: string;
  native?: {
    executionTime: number;
    result: string;
  };
  wasm?: {
    executionTime: number;
    result: string;
  };
  speedup?: number;
}

/**
 * Test cases with varying complexity
 */
const testCases = [
  {
    name: 'Simple arithmetic (2 variables)',
    formula: `
      (declare-const x Int)
      (declare-const y Int)
      (assert (> x 5))
      (assert (< y 10))
      (assert (= (+ x y) 100))
      (check-sat)
      (get-model)
    `,
  },
  {
    name: 'Boolean logic (3 variables)',
    formula: `
      (declare-const p Bool)
      (declare-const q Bool)
      (declare-const r Bool)
      (assert (or p q))
      (assert (=> p (not r)))
      (assert (and q r))
      (check-sat)
      (get-model)
    `,
  },
  {
    name: 'Mixed arithmetic and logic (4 variables)',
    formula: `
      (declare-const x Int)
      (declare-const y Int)
      (declare-const p Bool)
      (declare-const q Bool)
      (assert (> x 0))
      (assert (< y 100))
      (assert (=> p (> (+ x y) 50)))
      (assert (and q (< x y)))
      (check-sat)
      (get-model)
    `,
  },
  {
    name: 'Complex nested expressions (5 variables)',
    formula: `
      (declare-const a Int)
      (declare-const b Int)
      (declare-const c Int)
      (declare-const d Int)
      (declare-const e Int)
      (assert (> a 0))
      (assert (< b 100))
      (assert (= c (+ a b)))
      (assert (= d (* a b)))
      (assert (= e (+ (* a 2) (* b 3))))
      (assert (> (+ c d e) 1000))
      (check-sat)
      (get-model)
    `,
  },
  {
    name: 'Real numbers (3 variables)',
    formula: `
      (declare-const x Real)
      (declare-const y Real)
      (declare-const z Real)
      (assert (> x 0.5))
      (assert (< y 10.5))
      (assert (= z (+ x y)))
      (assert (> z 5.0))
      (check-sat)
      (get-model)
    `,
  },
  {
    name: 'Large constraint system (10 variables)',
    formula: `
      (declare-const x1 Int)
      (declare-const x2 Int)
      (declare-const x3 Int)
      (declare-const x4 Int)
      (declare-const x5 Int)
      (declare-const x6 Int)
      (declare-const x7 Int)
      (declare-const x8 Int)
      (declare-const x9 Int)
      (declare-const x10 Int)
      (assert (> x1 0))
      (assert (< x2 100))
      (assert (= x3 (+ x1 x2)))
      (assert (> x4 x3))
      (assert (< x5 x4))
      (assert (= x6 (+ x1 x5)))
      (assert (distinct x1 x2 x3 x4 x5))
      (assert (> (+ x1 x2 x3 x4 x5) 100))
      (assert (< (+ x6 x7 x8 x9 x10) 1000))
      (assert (= x10 (+ x1 x9)))
      (check-sat)
      (get-model)
    `,
  },
  {
    name: 'UNSAT constraint (contradiction)',
    formula: `
      (declare-const x Int)
      (declare-const y Int)
      (assert (> x 10))
      (assert (< x 5))
      (assert (= y x))
      (check-sat)
    `,
  },
];

/**
 * Run benchmark for a single formula with an adapter
 */
async function runSingle(
  adapter: Z3NativeAdapter | Z3WASMAdapter,
  formula: string,
  warmup = false
): Promise<{ executionTime: number; result: string }> {
  // Initialize adapter if needed
  await adapter.initialize();

  // Execute SMT2 formula
  const result = await adapter.executeSMT2(formula);

  return {
    executionTime: result.executionTime,
    result: result.result,
  };
}

/**
 * Run benchmark for a single test case
 */
async function benchmarkTestCase(
  testCase: { name: string; formula: string },
  nativeAdapter: Z3NativeAdapter | null,
  wasmAdapter: Z3WASMAdapter | null,
  iterations = 5
): Promise<BenchmarkResult> {
  const result: BenchmarkResult = {
    name: testCase.name,
  };

  // Warmup and benchmark native
  if (nativeAdapter) {
    // Warmup
    await runSingle(nativeAdapter, testCase.formula, true);

    // Benchmark
    const times: number[] = [];
    let lastResult = 'unknown';

    for (let i = 0; i < iterations; i++) {
      const singleResult = await runSingle(nativeAdapter, testCase.formula);
      times.push(singleResult.executionTime);
      lastResult = singleResult.result;
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    result.native = {
      executionTime: avgTime,
      result: lastResult,
    };
  }

  // Warmup and benchmark WASM
  if (wasmAdapter) {
    // Warmup
    await runSingle(wasmAdapter, testCase.formula, true);

    // Benchmark
    const times: number[] = [];
    let lastResult = 'unknown';

    for (let i = 0; i < iterations; i++) {
      const singleResult = await runSingle(wasmAdapter, testCase.formula);
      times.push(singleResult.executionTime);
      lastResult = singleResult.result;
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    result.wasm = {
      executionTime: avgTime,
      result: lastResult,
    };
  }

  // Calculate speedup
  if (result.native && result.wasm) {
    result.speedup = result.wasm.executionTime / result.native.executionTime;
  }

  return result;
}

/**
 * Print benchmark results in a nice table
 */
function printResults(results: BenchmarkResult[]): void {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    Z3 Adapter Performance Comparison                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  // Print header
  console.log('Test Case                          │ Native (ms) │ WASM (ms) │ Overhead');
  console.log('───────────────────────────────────┼─────────────┼───────────┼──────────');

  // Print results
  for (const result of results) {
    const name = result.name.padEnd(34);
    const native = result.native ? result.native.executionTime.toFixed(1).padStart(10) : 'N/A'.padStart(10);
    const wasm = result.wasm ? result.wasm.executionTime.toFixed(1).padStart(8) : 'N/A'.padStart(8);
    const speedup = result.speedup ? `${result.speedup.toFixed(2)}x` : 'N/A';

    console.log(`${name} │ ${native} │ ${wasm} │ ${speedup}`);
  }

  console.log('\n');

  // Print summary statistics
  const validResults = results.filter((r) => r.speedup !== undefined);
  if (validResults.length > 0) {
    const speedups = validResults.map((r) => r.speedup as number);
    const avgSpeedup = speedups.reduce((a, b) => a + b, 0) / speedups.length;
    const minSpeedup = Math.min(...speedups);
    const maxSpeedup = Math.max(...speedups);

    console.log('Summary Statistics:');
    console.log(`  Average WASM overhead: ${avgSpeedup.toFixed(2)}x`);
    console.log(`  Minimum overhead: ${minSpeedup.toFixed(2)}x (best case)`);
    console.log(`  Maximum overhead: ${maxSpeedup.toFixed(2)}x (worst case)`);
    console.log('');
  }

  // Print notes
  console.log('Notes:');
  console.log('  - Overhead = WASM time / Native time');
  console.log('  - Each test case run 5 times, average reported');
  console.log('  - First run (warmup) excluded from timing');
  console.log('  - Lower overhead is better (1.0x = same performance)');
  console.log('');
}

/**
 * Main benchmark runner
 */
async function main() {
  console.log('Initializing Z3 adapters...\n');

  // Try to create native adapter
  let nativeAdapter: Z3NativeAdapter | null = null;
  try {
    nativeAdapter = new Z3NativeAdapter({ timeout: 30000 });
    const available = await nativeAdapter.isAvailable();
    if (!available) {
      console.log('⚠️  Native Z3 not available (will benchmark WASM only)');
      nativeAdapter = null;
    } else {
      console.log('✅ Native Z3 adapter available');
    }
  } catch (error) {
    console.log('⚠️  Native Z3 initialization failed (will benchmark WASM only)');
    nativeAdapter = null;
  }

  // Try to create WASM adapter
  let wasmAdapter: Z3WASMAdapter | null = null;
  try {
    wasmAdapter = new Z3WASMAdapter({
      timeout: 30000,
    });
    await wasmAdapter.initialize();
    const available = await wasmAdapter.isAvailable();
    if (!available) {
      console.log('❌ Z3 WASM not available');
      console.log('   Install z3-solver: npm install z3-solver');
      process.exit(1);
    } else {
      console.log('✅ Z3 WASM adapter available');
    }
  } catch (error) {
    console.log('❌ Z3 WASM initialization failed');
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Run benchmarks
  console.log('\nRunning benchmarks...\n');
  const results: BenchmarkResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`[${i + 1}/${testCases.length}] ${testCase.name}...`);

    const result = await benchmarkTestCase(testCase, nativeAdapter, wasmAdapter);
    results.push(result);
  }

  // Print results
  printResults(results);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

export { benchmarkTestCase, testCases };
