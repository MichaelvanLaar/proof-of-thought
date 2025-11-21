/**
 * Benchmark result reporting utilities
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { BenchmarkMetrics, BenchmarkResult, ResultReporter } from '../types/index.js';

/**
 * Console reporter for benchmark results
 */
export class ConsoleReporter implements ResultReporter {
  generateReport(metrics: BenchmarkMetrics, results: BenchmarkResult[]): string {
    const lines: string[] = [];

    lines.push('═'.repeat(80));
    lines.push(`  ${metrics.benchmarkName} Benchmark Results`);
    lines.push('═'.repeat(80));
    lines.push('');

    // Summary statistics
    lines.push('Summary:');
    lines.push(`  Total Tasks:      ${metrics.totalTasks}`);
    lines.push(`  Successful:       ${metrics.successfulTasks}`);
    lines.push(`  Failed:           ${metrics.failedTasks}`);
    lines.push(`  Backend:          ${metrics.backend.toUpperCase()}`);
    lines.push('');

    // Performance metrics
    lines.push('Performance:');
    lines.push(`  Accuracy:         ${(metrics.accuracy * 100).toFixed(2)}%`);
    lines.push(`  Precision:        ${(metrics.precision * 100).toFixed(2)}%`);
    lines.push(`  Recall:           ${(metrics.recall * 100).toFixed(2)}%`);
    lines.push(`  F1 Score:         ${(metrics.f1Score * 100).toFixed(2)}%`);
    lines.push('');

    // Timing metrics
    lines.push('Timing:');
    lines.push(`  Avg Time/Task:    ${metrics.averageExecutionTime.toFixed(0)}ms`);
    lines.push(`  Total Time:       ${(metrics.totalExecutionTime / 1000).toFixed(2)}s`);
    lines.push('');

    // Error summary
    if (metrics.failedTasks > 0) {
      lines.push('Errors:');
      const errors = results.filter((r) => r.error);
      const errorCounts = new Map<string, number>();

      for (const result of errors) {
        const errorType = result.error?.split(':')[0] || 'Unknown';
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      }

      for (const [errorType, count] of errorCounts.entries()) {
        lines.push(`  ${errorType}: ${count}`);
      }
      lines.push('');
    }

    lines.push('═'.repeat(80));
    lines.push(`  Completed at ${metrics.timestamp}`);
    lines.push('═'.repeat(80));

    return lines.join('\n');
  }

  async saveReport(
    metrics: BenchmarkMetrics,
    results: BenchmarkResult[],
    outputPath: string
  ): Promise<void> {
    const report = this.generateReport(metrics, results);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, report, 'utf-8');
  }
}

/**
 * JSON reporter for benchmark results
 */
export class JSONReporter implements ResultReporter {
  generateReport(metrics: BenchmarkMetrics, results: BenchmarkResult[]): string {
    const report = {
      metrics,
      results,
      summary: {
        totalTasks: metrics.totalTasks,
        successfulTasks: metrics.successfulTasks,
        failedTasks: metrics.failedTasks,
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1Score: metrics.f1Score,
      },
    };

    return JSON.stringify(report, null, 2);
  }

  async saveReport(
    metrics: BenchmarkMetrics,
    results: BenchmarkResult[],
    outputPath: string
  ): Promise<void> {
    const report = this.generateReport(metrics, results);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, report, 'utf-8');
  }
}

/**
 * Markdown reporter for benchmark results
 */
export class MarkdownReporter implements ResultReporter {
  generateReport(metrics: BenchmarkMetrics, results: BenchmarkResult[]): string {
    const lines: string[] = [];

    lines.push(`# ${metrics.benchmarkName} Benchmark Results`);
    lines.push('');
    lines.push(`**Backend:** ${metrics.backend.toUpperCase()}`);
    lines.push(`**Timestamp:** ${metrics.timestamp}`);
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Tasks | ${metrics.totalTasks} |`);
    lines.push(`| Successful | ${metrics.successfulTasks} |`);
    lines.push(`| Failed | ${metrics.failedTasks} |`);
    lines.push(`| Accuracy | ${(metrics.accuracy * 100).toFixed(2)}% |`);
    lines.push(`| Precision | ${(metrics.precision * 100).toFixed(2)}% |`);
    lines.push(`| Recall | ${(metrics.recall * 100).toFixed(2)}% |`);
    lines.push(`| F1 Score | ${(metrics.f1Score * 100).toFixed(2)}% |`);
    lines.push(`| Avg Time/Task | ${metrics.averageExecutionTime.toFixed(0)}ms |`);
    lines.push(`| Total Time | ${(metrics.totalExecutionTime / 1000).toFixed(2)}s |`);
    lines.push('');

    // Error breakdown
    if (metrics.failedTasks > 0) {
      lines.push('## Errors');
      lines.push('');
      const errors = results.filter((r) => r.error);
      const errorCounts = new Map<string, number>();

      for (const result of errors) {
        const errorType = result.error?.split(':')[0] || 'Unknown';
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      }

      lines.push('| Error Type | Count |');
      lines.push('|------------|-------|');
      for (const [errorType, count] of errorCounts.entries()) {
        lines.push(`| ${errorType} | ${count} |`);
      }
      lines.push('');
    }

    // Sample results
    lines.push('## Sample Results');
    lines.push('');
    const sampleSize = Math.min(5, results.length);
    const samples = results.slice(0, sampleSize);

    for (const sample of samples) {
      lines.push(`### Task: ${sample.taskId}`);
      lines.push('');
      lines.push(`**Question:** ${sample.question}`);
      lines.push(`**Expected:** ${sample.expectedAnswer}`);
      lines.push(`**Predicted:** ${sample.predictedAnswer}`);
      lines.push(`**Correct:** ${sample.isCorrect ? '✅' : '❌'}`);
      lines.push(`**Time:** ${sample.executionTime}ms`);
      if (sample.error) {
        lines.push(`**Error:** ${sample.error}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  async saveReport(
    metrics: BenchmarkMetrics,
    results: BenchmarkResult[],
    outputPath: string
  ): Promise<void> {
    const report = this.generateReport(metrics, results);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, report, 'utf-8');
  }
}

/**
 * CSV reporter for benchmark results
 */
export class CSVReporter implements ResultReporter {
  generateReport(metrics: BenchmarkMetrics, results: BenchmarkResult[]): string {
    const lines: string[] = [];

    // Header
    lines.push('task_id,question,expected,predicted,correct,execution_time_ms,error');

    // Results
    for (const result of results) {
      const fields = [
        this.escapeCSV(result.taskId),
        this.escapeCSV(result.question),
        this.escapeCSV(String(result.expectedAnswer)),
        this.escapeCSV(result.predictedAnswer),
        result.isCorrect ? '1' : '0',
        result.executionTime.toString(),
        this.escapeCSV(result.error || ''),
      ];
      lines.push(fields.join(','));
    }

    return lines.join('\n');
  }

  private escapeCSV(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  async saveReport(
    metrics: BenchmarkMetrics,
    results: BenchmarkResult[],
    outputPath: string
  ): Promise<void> {
    const report = this.generateReport(metrics, results);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, report, 'utf-8');
  }
}
