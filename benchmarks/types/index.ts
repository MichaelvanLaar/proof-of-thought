/**
 * Type definitions for benchmark suite
 */

/**
 * Base interface for all benchmark tasks
 */
export interface BenchmarkTask {
  id: string;
  question: string;
  context?: string;
  answer: boolean | string;
  metadata?: Record<string, unknown>;
}

/**
 * Benchmark execution result
 */
export interface BenchmarkResult {
  taskId: string;
  question: string;
  expectedAnswer: boolean | string;
  predictedAnswer: string;
  isCorrect: boolean;
  executionTime: number;
  error?: string;
  formula?: string;
  proof?: Array<{ step: number; description: string }>;
}

/**
 * Aggregated benchmark metrics
 */
export interface BenchmarkMetrics {
  benchmarkName: string;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  backend: string;
  timestamp: string;
}

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  benchmarkName: string;
  backend: 'smt2' | 'json';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  z3Timeout?: number;
  verbose?: boolean;
  maxTasks?: number; // Limit number of tasks for testing
  shuffle?: boolean; // Shuffle tasks before running
}

/**
 * ProntoQA specific task format
 */
export interface ProntoQATask extends BenchmarkTask {
  facts: string[];
  rules: string[];
}

/**
 * FOLIO specific task format
 */
export interface FOLIOTask extends BenchmarkTask {
  premises: string[];
  conclusion: string;
  proof_required?: boolean;
}

/**
 * ProofWriter specific task format
 */
export interface ProofWriterTask extends BenchmarkTask {
  facts: string[];
  rules: string[];
  depth: number; // Reasoning depth required
}

/**
 * ConditionalQA specific task format
 */
export interface ConditionalQATask extends BenchmarkTask {
  scenario: string;
  conditions: string[];
  query: string;
}

/**
 * StrategyQA specific task format
 */
export interface StrategyQATask extends BenchmarkTask {
  decomposition?: string[]; // Multi-step reasoning decomposition
  facts?: string[];
}

/**
 * Benchmark runner interface
 */
export interface BenchmarkRunner {
  name: string;
  run(config: BenchmarkConfig): Promise<BenchmarkMetrics>;
  loadTasks(): Promise<BenchmarkTask[]>;
}

/**
 * Result reporter interface
 */
export interface ResultReporter {
  generateReport(metrics: BenchmarkMetrics, results: BenchmarkResult[]): string;
  saveReport(metrics: BenchmarkMetrics, results: BenchmarkResult[], outputPath: string): Promise<void>;
}
