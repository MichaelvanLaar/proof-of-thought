/**
 * Utility functions for calculating benchmark metrics
 */

import type { BenchmarkResult, BenchmarkMetrics } from '../types/index.js';

/**
 * Calculate accuracy from benchmark results
 */
export function calculateAccuracy(results: BenchmarkResult[]): number {
  if (results.length === 0) return 0;
  const correct = results.filter((r) => r.isCorrect).length;
  return correct / results.length;
}

/**
 * Calculate precision, recall, and F1 score for binary classification
 */
export function calculateClassificationMetrics(results: BenchmarkResult[]): {
  precision: number;
  recall: number;
  f1Score: number;
} {
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  for (const result of results) {
    const expected = normalizeAnswer(result.expectedAnswer);
    const predicted = normalizeAnswer(result.predictedAnswer);

    if (expected === true && predicted === true) {
      truePositives++;
    } else if (expected === false && predicted === true) {
      falsePositives++;
    } else if (expected === false && predicted === false) {
      trueNegatives++;
    } else if (expected === true && predicted === false) {
      falseNegatives++;
    }
  }

  const precision =
    truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;

  const recall =
    truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;

  const f1Score =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { precision, recall, f1Score };
}

/**
 * Normalize answer to boolean for classification metrics
 */
function normalizeAnswer(answer: boolean | string): boolean {
  if (typeof answer === 'boolean') {
    return answer;
  }

  const normalized = answer.toLowerCase().trim();
  return (
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === '1' ||
    normalized.startsWith('true') ||
    normalized.startsWith('yes')
  );
}

/**
 * Calculate average execution time
 */
export function calculateAverageExecutionTime(results: BenchmarkResult[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + r.executionTime, 0);
  return total / results.length;
}

/**
 * Generate comprehensive metrics from results
 */
export function generateMetrics(
  benchmarkName: string,
  backend: string,
  results: BenchmarkResult[]
): BenchmarkMetrics {
  const successfulTasks = results.filter((r) => !r.error).length;
  const failedTasks = results.filter((r) => r.error).length;
  const accuracy = calculateAccuracy(results.filter((r) => !r.error));
  const { precision, recall, f1Score } = calculateClassificationMetrics(
    results.filter((r) => !r.error)
  );
  const averageExecutionTime = calculateAverageExecutionTime(results);
  const totalExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0);

  return {
    benchmarkName,
    totalTasks: results.length,
    successfulTasks,
    failedTasks,
    accuracy,
    precision,
    recall,
    f1Score,
    averageExecutionTime,
    totalExecutionTime,
    backend,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Compare two benchmark runs
 */
export function compareMetrics(
  baseline: BenchmarkMetrics,
  current: BenchmarkMetrics
): {
  accuracyDelta: number;
  f1ScoreDelta: number;
  speedup: number;
  improvements: string[];
  regressions: string[];
} {
  const accuracyDelta = current.accuracy - baseline.accuracy;
  const f1ScoreDelta = current.f1Score - baseline.f1Score;
  const speedup = baseline.averageExecutionTime / current.averageExecutionTime;

  const improvements: string[] = [];
  const regressions: string[] = [];

  if (accuracyDelta > 0.01) {
    improvements.push(`Accuracy improved by ${(accuracyDelta * 100).toFixed(2)}%`);
  } else if (accuracyDelta < -0.01) {
    regressions.push(`Accuracy decreased by ${(Math.abs(accuracyDelta) * 100).toFixed(2)}%`);
  }

  if (f1ScoreDelta > 0.01) {
    improvements.push(`F1 score improved by ${(f1ScoreDelta * 100).toFixed(2)}%`);
  } else if (f1ScoreDelta < -0.01) {
    regressions.push(`F1 score decreased by ${(Math.abs(f1ScoreDelta) * 100).toFixed(2)}%`);
  }

  if (speedup > 1.1) {
    improvements.push(`Execution ${speedup.toFixed(2)}x faster`);
  } else if (speedup < 0.9) {
    regressions.push(`Execution ${(1 / speedup).toFixed(2)}x slower`);
  }

  return { accuracyDelta, f1ScoreDelta, speedup, improvements, regressions };
}
