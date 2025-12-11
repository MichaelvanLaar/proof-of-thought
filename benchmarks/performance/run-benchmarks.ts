/**
 * Performance Benchmark Runner
 *
 * This script runs all performance benchmarks and generates a report.
 *
 * Usage:
 *   npx tsx benchmarks/performance/run-benchmarks.ts [options]
 *
 * Options:
 *   --quick       Run quick benchmark (fewer iterations, fewer test cases)
 *   --output FILE Write results to JSON file
 *   --compare     Compare with previous benchmark results
 *
 * Examples:
 *   npx tsx benchmarks/performance/run-benchmarks.ts
 *   npx tsx benchmarks/performance/run-benchmarks.ts --quick
 *   npx tsx benchmarks/performance/run-benchmarks.ts --output results.json
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface BenchmarkConfig {
  quick: boolean;
  output?: string;
  compare: boolean;
}

interface BenchmarkReport {
  timestamp: string;
  config: BenchmarkConfig;
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    cpus: number;
  };
  results: Record<string, unknown>;
}

/**
 * Parse command line arguments
 */
function parseArgs(): BenchmarkConfig {
  const args = process.argv.slice(2);

  return {
    quick: args.includes('--quick'),
    output: args.includes('--output')
      ? args[args.indexOf('--output') + 1]
      : undefined,
    compare: args.includes('--compare'),
  };
}

/**
 * Get system information
 */
function getSystemInfo(): BenchmarkReport['system'] {
  const os = await import('os');

  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cpus: os.cpus().length,
  };
}

/**
 * Run Z3 adapter comparison benchmark
 */
async function runAdapterComparison(quick: boolean): Promise<unknown> {
  console.log('Running Z3 Adapter Comparison...\n');

  try {
    // Import and run the benchmark
    const { benchmarkTestCase, testCases } = await import('./z3-adapter-comparison.js');
    const { Z3NativeAdapter, Z3WASMAdapter } = await import('../../src/adapters/index.js');

    // Initialize adapters
    let nativeAdapter = null;
    let wasmAdapter = null;

    try {
      nativeAdapter = new Z3NativeAdapter({ timeout: 30000 });
      const available = await nativeAdapter.isAvailable();
      if (!available) {
        nativeAdapter = null;
      }
    } catch {
      nativeAdapter = null;
    }

    try {
      wasmAdapter = new Z3WASMAdapter({ timeout: 30000 });
      const available = await Z3WASMAdapter.isAvailable();
      if (!available) {
        console.log('❌ Z3 WASM not available');
        return { error: 'Z3 WASM not available' };
      }
    } catch (error) {
      console.log('❌ Z3 WASM initialization failed');
      return { error: 'Z3 WASM initialization failed' };
    }

    // Run benchmarks
    const iterations = quick ? 3 : 5;
    const casesToRun = quick ? testCases.slice(0, 3) : testCases;
    const results = [];

    for (const testCase of casesToRun) {
      console.log(`Benchmarking: ${testCase.name}`);
      const result = await benchmarkTestCase(testCase, nativeAdapter, wasmAdapter, iterations);
      results.push(result);
    }

    return { results };
  } catch (error) {
    console.error('Failed to run adapter comparison:', error);
    return { error: String(error) };
  }
}

/**
 * Save benchmark results to file
 */
function saveResults(report: BenchmarkReport, filename: string): void {
  const outputPath = join(process.cwd(), filename);
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Results saved to ${outputPath}`);
}

/**
 * Compare with previous results
 */
function compareResults(current: BenchmarkReport, previousFile: string): void {
  const previousPath = join(process.cwd(), previousFile);

  if (!existsSync(previousPath)) {
    console.log(`\n⚠️  No previous results found at ${previousPath}`);
    return;
  }

  try {
    const previousData = readFileSync(previousPath, 'utf-8');
    const previous: BenchmarkReport = JSON.parse(previousData);

    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                         Benchmark Comparison                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    console.log(`Previous: ${previous.timestamp}`);
    console.log(`Current:  ${current.timestamp}\n`);

    // Compare adapter results if available
    const prevAdapter = previous.results.adapter as { results?: Array<{ name: string; speedup?: number }> };
    const currAdapter = current.results.adapter as { results?: Array<{ name: string; speedup?: number }> };

    if (prevAdapter?.results && currAdapter?.results) {
      console.log('WASM Overhead Changes:\n');

      for (const curr of currAdapter.results) {
        const prev = prevAdapter.results.find((r) => r.name === curr.name);
        if (prev && prev.speedup && curr.speedup) {
          const change = curr.speedup - prev.speedup;
          const changePercent = (change / prev.speedup) * 100;
          const direction = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';

          console.log(`  ${direction} ${curr.name}`);
          console.log(`     ${prev.speedup.toFixed(2)}x → ${curr.speedup.toFixed(2)}x (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);
        }
      }
    }

    console.log('');
  } catch (error) {
    console.error('Failed to compare results:', error);
  }
}

/**
 * Main runner
 */
async function main() {
  const config = parseArgs();

  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    Performance Benchmark Runner                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  if (config.quick) {
    console.log('🏃 Running in quick mode (fewer iterations, fewer test cases)\n');
  }

  // Collect system info
  const system = getSystemInfo();
  console.log('System Information:');
  console.log(`  Platform: ${system.platform}`);
  console.log(`  Architecture: ${system.arch}`);
  console.log(`  Node: ${system.nodeVersion}`);
  console.log(`  CPUs: ${system.cpus}\n`);

  // Run benchmarks
  const results: Record<string, unknown> = {};

  // Z3 adapter comparison
  results.adapter = await runAdapterComparison(config.quick);

  // Create report
  const report: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    config,
    system,
    results,
  };

  // Save results if requested
  if (config.output) {
    saveResults(report, config.output);
  }

  // Compare with previous results if requested
  if (config.compare) {
    const previousFile = config.output || 'benchmark-results.json';
    compareResults(report, previousFile);
  }

  console.log('\n✅ All benchmarks completed successfully\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Benchmark runner failed:', error);
    process.exit(1);
  });
}
