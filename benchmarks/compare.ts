#!/usr/bin/env node
/**
 * Performance comparison tool
 *
 * Compares TypeScript implementation performance with Python baseline
 * or previous TypeScript results.
 *
 * Usage:
 *   npm run benchmark:compare -- --ts-results ./results/ts.json --python-results ./results/python.json
 *   npm run benchmark:compare -- --baseline ./results/baseline.json --current ./results/current.json
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Benchmark result for comparison
 */
interface ComparisonResult {
  benchmarkName: string;
  backend: string;
  model: string;
  totalTasks: number;
  correctTasks: number;
  accuracy: number;
  totalTime: number;
  averageTime: number;
  llmTime: number;
  z3Time: number;
  tokenUsage?: {
    total: number;
    prompt: number;
    completion: number;
  };
}

/**
 * Comparison metrics
 */
interface ComparisonMetrics {
  metric: string;
  typescript: number;
  python: number;
  difference: number;
  percentChange: number;
  better: 'typescript' | 'python' | 'equal';
}

/**
 * Comparison report
 */
interface ComparisonReport {
  timestamp: string;
  typescriptVersion: string;
  pythonVersion?: string;
  benchmarks: {
    name: string;
    metrics: ComparisonMetrics[];
  }[];
  summary: {
    avgSpeedup: number;
    avgAccuracyDiff: number;
    avgTokenDiff: number;
    betterMetrics: number;
    worseMetrics: number;
    equalMetrics: number;
  };
}

const program = new Command();

program
  .name('benchmark-compare')
  .description('Compare TypeScript and Python benchmark results')
  .version('0.1.0');

program
  .option('--ts-results <path>', 'Path to TypeScript benchmark results (JSON)')
  .option('--python-results <path>', 'Path to Python benchmark results (JSON)')
  .option('--baseline <path>', 'Path to baseline results (JSON)')
  .option('--current <path>', 'Path to current results (JSON)')
  .option('--output <path>', 'Save comparison report to file')
  .option('--format <type>', 'Output format (console, json, markdown)', 'console');

program.parse();

const options = program.opts();

/**
 * Load benchmark results from file
 */
function loadResults(path: string): ComparisonResult {
  if (!existsSync(path)) {
    throw new Error(`Results file not found: ${path}`);
  }

  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

/**
 * Calculate comparison metrics
 */
function calculateMetrics(
  ts: ComparisonResult,
  py: ComparisonResult
): ComparisonMetrics[] {
  const metrics: ComparisonMetrics[] = [];

  // Accuracy comparison
  const accuracyDiff = ts.accuracy - py.accuracy;
  metrics.push({
    metric: 'Accuracy',
    typescript: ts.accuracy,
    python: py.accuracy,
    difference: accuracyDiff,
    percentChange: (accuracyDiff / py.accuracy) * 100,
    better:
      Math.abs(accuracyDiff) < 0.001
        ? 'equal'
        : accuracyDiff > 0
          ? 'typescript'
          : 'python',
  });

  // Total time comparison (lower is better)
  const timeDiff = ts.totalTime - py.totalTime;
  const speedup = py.totalTime / ts.totalTime;
  metrics.push({
    metric: 'Total Time (ms)',
    typescript: ts.totalTime,
    python: py.totalTime,
    difference: timeDiff,
    percentChange: ((speedup - 1) * 100),
    better:
      Math.abs(timeDiff) < 100 ? 'equal' : timeDiff < 0 ? 'typescript' : 'python',
  });

  // Average time comparison
  const avgTimeDiff = ts.averageTime - py.averageTime;
  const avgSpeedup = py.averageTime / ts.averageTime;
  metrics.push({
    metric: 'Average Time (ms)',
    typescript: ts.averageTime,
    python: py.averageTime,
    difference: avgTimeDiff,
    percentChange: ((avgSpeedup - 1) * 100),
    better:
      Math.abs(avgTimeDiff) < 10
        ? 'equal'
        : avgTimeDiff < 0
          ? 'typescript'
          : 'python',
  });

  // LLM time comparison
  const llmTimeDiff = ts.llmTime - py.llmTime;
  metrics.push({
    metric: 'LLM Time (ms)',
    typescript: ts.llmTime,
    python: py.llmTime,
    difference: llmTimeDiff,
    percentChange: (llmTimeDiff / py.llmTime) * 100,
    better:
      Math.abs(llmTimeDiff) < 100
        ? 'equal'
        : llmTimeDiff < 0
          ? 'typescript'
          : 'python',
  });

  // Z3 time comparison
  const z3TimeDiff = ts.z3Time - py.z3Time;
  metrics.push({
    metric: 'Z3 Time (ms)',
    typescript: ts.z3Time,
    python: py.z3Time,
    difference: z3TimeDiff,
    percentChange: (z3TimeDiff / py.z3Time) * 100,
    better:
      Math.abs(z3TimeDiff) < 50 ? 'equal' : z3TimeDiff < 0 ? 'typescript' : 'python',
  });

  // Token usage comparison (if available)
  if (ts.tokenUsage && py.tokenUsage) {
    const tokenDiff = ts.tokenUsage.total - py.tokenUsage.total;
    metrics.push({
      metric: 'Total Tokens',
      typescript: ts.tokenUsage.total,
      python: py.tokenUsage.total,
      difference: tokenDiff,
      percentChange: (tokenDiff / py.tokenUsage.total) * 100,
      better:
        Math.abs(tokenDiff) < 100
          ? 'equal'
          : tokenDiff < 0
            ? 'typescript'
            : 'python',
    });
  }

  return metrics;
}

/**
 * Generate comparison report
 */
function generateReport(
  tsResults: ComparisonResult[],
  pyResults: ComparisonResult[]
): ComparisonReport {
  const benchmarks: ComparisonReport['benchmarks'] = [];
  let totalSpeedup = 0;
  let totalAccuracyDiff = 0;
  let totalTokenDiff = 0;
  let betterMetrics = 0;
  let worseMetrics = 0;
  let equalMetrics = 0;

  // Compare each benchmark
  for (const tsResult of tsResults) {
    const pyResult = pyResults.find(
      (r) =>
        r.benchmarkName === tsResult.benchmarkName &&
        r.backend === tsResult.backend
    );

    if (!pyResult) {
      console.warn(
        `Warning: No Python results found for ${tsResult.benchmarkName} (${tsResult.backend})`
      );
      continue;
    }

    const metrics = calculateMetrics(tsResult, pyResult);

    benchmarks.push({
      name: tsResult.benchmarkName,
      metrics,
    });

    // Accumulate summary stats
    const timeMetric = metrics.find((m) => m.metric === 'Average Time (ms)');
    if (timeMetric) {
      totalSpeedup += timeMetric.percentChange / 100 + 1;
    }

    const accuracyMetric = metrics.find((m) => m.metric === 'Accuracy');
    if (accuracyMetric) {
      totalAccuracyDiff += accuracyMetric.difference;
    }

    const tokenMetric = metrics.find((m) => m.metric === 'Total Tokens');
    if (tokenMetric) {
      totalTokenDiff += tokenMetric.percentChange;
    }

    // Count better/worse/equal metrics
    metrics.forEach((m) => {
      if (m.better === 'typescript') betterMetrics++;
      else if (m.better === 'python') worseMetrics++;
      else equalMetrics++;
    });
  }

  const numBenchmarks = benchmarks.length;

  return {
    timestamp: new Date().toISOString(),
    typescriptVersion: '0.1.0',
    pythonVersion: 'unknown',
    benchmarks,
    summary: {
      avgSpeedup: totalSpeedup / numBenchmarks,
      avgAccuracyDiff: totalAccuracyDiff / numBenchmarks,
      avgTokenDiff: totalTokenDiff / numBenchmarks,
      betterMetrics,
      worseMetrics,
      equalMetrics,
    },
  };
}

/**
 * Format report as console output
 */
function formatConsoleReport(report: ComparisonReport): string {
  let output = '';

  output += '═'.repeat(100) + '\n';
  output += '  TypeScript vs Python Performance Comparison\n';
  output += '═'.repeat(100) + '\n\n';

  output += `Generated: ${new Date(report.timestamp).toLocaleString()}\n`;
  output += `TypeScript Version: ${report.typescriptVersion}\n`;
  if (report.pythonVersion) {
    output += `Python Version: ${report.pythonVersion}\n`;
  }
  output += '\n';

  // Individual benchmarks
  for (const benchmark of report.benchmarks) {
    output += `\n${'─'.repeat(100)}\n`;
    output += `  ${benchmark.name}\n`;
    output += `${'─'.repeat(100)}\n\n`;

    output += `${'Metric'.padEnd(25)} ${'TypeScript'.padStart(15)} ${'Python'.padStart(15)} ${'Diff'.padStart(15)} ${'% Change'.padStart(12)} ${'Better'.padStart(12)}\n`;
    output += '─'.repeat(100) + '\n';

    for (const metric of benchmark.metrics) {
      const tsValue =
        metric.metric.includes('Accuracy')
          ? `${(metric.typescript * 100).toFixed(2)}%`
          : metric.typescript.toFixed(2);
      const pyValue =
        metric.metric.includes('Accuracy')
          ? `${(metric.python * 100).toFixed(2)}%`
          : metric.python.toFixed(2);
      const diff =
        metric.metric.includes('Accuracy')
          ? `${(metric.difference * 100).toFixed(2)}%`
          : metric.difference.toFixed(2);
      const change =
        metric.percentChange > 0
          ? `+${metric.percentChange.toFixed(1)}%`
          : `${metric.percentChange.toFixed(1)}%`;
      const better =
        metric.better === 'typescript'
          ? '✓ TS'
          : metric.better === 'python'
            ? '✓ PY'
            : '≈';

      output += `${metric.metric.padEnd(25)} ${tsValue.padStart(15)} ${pyValue.padStart(15)} ${diff.padStart(15)} ${change.padStart(12)} ${better.padStart(12)}\n`;
    }
  }

  // Summary
  output += '\n' + '═'.repeat(100) + '\n';
  output += '  Summary\n';
  output += '═'.repeat(100) + '\n\n';

  output += `Average Speedup: ${report.summary.avgSpeedup.toFixed(2)}x\n`;
  output += `Average Accuracy Diff: ${(report.summary.avgAccuracyDiff * 100).toFixed(2)}%\n`;
  if (report.summary.avgTokenDiff !== 0) {
    output += `Average Token Diff: ${report.summary.avgTokenDiff.toFixed(1)}%\n`;
  }
  output += `\n`;
  output += `Metrics Better in TypeScript: ${report.summary.betterMetrics}\n`;
  output += `Metrics Better in Python: ${report.summary.worseMetrics}\n`;
  output += `Metrics Equal: ${report.summary.equalMetrics}\n`;

  output += '\n' + '═'.repeat(100) + '\n';

  return output;
}

/**
 * Format report as Markdown
 */
function formatMarkdownReport(report: ComparisonReport): string {
  let output = '';

  output += '# TypeScript vs Python Performance Comparison\n\n';
  output += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`;
  output += `**TypeScript Version:** ${report.typescriptVersion}\n\n`;
  if (report.pythonVersion) {
    output += `**Python Version:** ${report.pythonVersion}\n\n`;
  }

  // Summary
  output += '## Summary\n\n';
  output += `- **Average Speedup:** ${report.summary.avgSpeedup.toFixed(2)}x\n`;
  output += `- **Average Accuracy Diff:** ${(report.summary.avgAccuracyDiff * 100).toFixed(2)}%\n`;
  if (report.summary.avgTokenDiff !== 0) {
    output += `- **Average Token Diff:** ${report.summary.avgTokenDiff.toFixed(1)}%\n`;
  }
  output += `- **Metrics Better in TypeScript:** ${report.summary.betterMetrics}\n`;
  output += `- **Metrics Better in Python:** ${report.summary.worseMetrics}\n`;
  output += `- **Metrics Equal:** ${report.summary.equalMetrics}\n\n`;

  // Individual benchmarks
  output += '## Benchmark Results\n\n';

  for (const benchmark of report.benchmarks) {
    output += `### ${benchmark.name}\n\n`;
    output += '| Metric | TypeScript | Python | Difference | % Change | Better |\n';
    output += '|--------|------------|--------|------------|----------|--------|\n';

    for (const metric of benchmark.metrics) {
      const tsValue =
        metric.metric.includes('Accuracy')
          ? `${(metric.typescript * 100).toFixed(2)}%`
          : metric.typescript.toFixed(2);
      const pyValue =
        metric.metric.includes('Accuracy')
          ? `${(metric.python * 100).toFixed(2)}%`
          : metric.python.toFixed(2);
      const diff =
        metric.metric.includes('Accuracy')
          ? `${(metric.difference * 100).toFixed(2)}%`
          : metric.difference.toFixed(2);
      const change =
        metric.percentChange > 0
          ? `+${metric.percentChange.toFixed(1)}%`
          : `${metric.percentChange.toFixed(1)}%`;
      const better =
        metric.better === 'typescript'
          ? '✓ TS'
          : metric.better === 'python'
            ? '✓ PY'
            : '≈';

      output += `| ${metric.metric} | ${tsValue} | ${pyValue} | ${diff} | ${change} | ${better} |\n`;
    }

    output += '\n';
  }

  return output;
}

/**
 * Main function
 */
async function main() {
  try {
    // Load results
    let tsResults: ComparisonResult[];
    let pyResults: ComparisonResult[];

    if (options.tsResults && options.pythonResults) {
      // Compare TypeScript vs Python
      tsResults = [loadResults(options.tsResults)];
      pyResults = [loadResults(options.pythonResults)];
    } else if (options.baseline && options.current) {
      // Compare baseline vs current
      tsResults = [loadResults(options.current)];
      pyResults = [loadResults(options.baseline)];
    } else {
      console.error('❌ Error: Must provide either:');
      console.error('   --ts-results and --python-results, OR');
      console.error('   --baseline and --current');
      process.exit(1);
    }

    // Generate comparison report
    const report = generateReport(tsResults, pyResults);

    // Format output
    let formattedReport: string;
    if (options.format === 'json') {
      formattedReport = JSON.stringify(report, null, 2);
    } else if (options.format === 'markdown' || options.format === 'md') {
      formattedReport = formatMarkdownReport(report);
    } else {
      formattedReport = formatConsoleReport(report);
    }

    // Output to console
    console.log(formattedReport);

    // Save to file if requested
    if (options.output) {
      writeFileSync(options.output, formattedReport, 'utf-8');
      console.log(`\n💾 Comparison report saved to: ${options.output}`);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
