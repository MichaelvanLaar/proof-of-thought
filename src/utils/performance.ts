/**
 * Performance profiling utilities for ProofOfThought
 *
 * Provides utilities for tracking and analyzing performance metrics,
 * particularly for LLM calls and Z3 solver execution.
 *
 * @packageDocumentation
 */

/**
 * Performance metrics for a single LLM call
 */
export interface LLMCallMetrics {
  /** Unique identifier for this call */
  callId: string;
  /** Model used */
  model: string;
  /** Call type (translation, explanation, critique, etc.) */
  type:
    | 'translation'
    | 'explanation'
    | 'critique'
    | 'improvement'
    | 'decomposition'
    | 'synthesis'
    | 'other';
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Prompt tokens used */
  promptTokens?: number;
  /** Completion tokens used */
  completionTokens?: number;
  /** Total tokens used */
  totalTokens?: number;
  /** Whether the call succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Response size in characters */
  responseSize?: number;
}

/**
 * Performance metrics for Z3 solver execution
 */
export interface Z3CallMetrics {
  /** Unique identifier for this call */
  callId: string;
  /** Backend type */
  backend: 'smt2' | 'json';
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Formula size in characters */
  formulaSize: number;
  /** Result (sat/unsat/unknown) */
  result: 'sat' | 'unsat' | 'unknown';
  /** Whether the call succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Aggregated performance metrics
 */
export interface AggregatedMetrics {
  /** Total LLM calls */
  totalLLMCalls: number;
  /** Successful LLM calls */
  successfulLLMCalls: number;
  /** Failed LLM calls */
  failedLLMCalls: number;
  /** Total LLM time in milliseconds */
  totalLLMTime: number;
  /** Average LLM call time */
  averageLLMTime: number;
  /** Min LLM call time */
  minLLMTime: number;
  /** Max LLM call time */
  maxLLMTime: number;
  /** Total tokens used */
  totalTokens: number;
  /** Total prompt tokens */
  totalPromptTokens: number;
  /** Total completion tokens */
  totalCompletionTokens: number;
  /** LLM calls by type */
  callsByType: Record<string, number>;
  /** Total Z3 calls */
  totalZ3Calls: number;
  /** Successful Z3 calls */
  successfulZ3Calls: number;
  /** Failed Z3 calls */
  failedZ3Calls: number;
  /** Total Z3 time in milliseconds */
  totalZ3Time: number;
  /** Average Z3 call time */
  averageZ3Time: number;
  /** Min Z3 call time */
  minZ3Time: number;
  /** Max Z3 call time */
  maxZ3Time: number;
}

/**
 * Performance profiler for tracking and analyzing metrics
 */
export class PerformanceProfiler {
  private llmCalls: LLMCallMetrics[] = [];
  private z3Calls: Z3CallMetrics[] = [];
  private enabled: boolean;
  private readonly maxMetrics: number;

  constructor(enabled: boolean = true, maxMetrics: number = 10000) {
    this.enabled = enabled;
    this.maxMetrics = maxMetrics;
  }

  /**
   * Record an LLM call
   */
  recordLLMCall(metrics: LLMCallMetrics): void {
    if (!this.enabled) return;
    this.llmCalls.push(metrics);

    // Implement circular buffer: remove oldest if limit exceeded
    if (this.llmCalls.length > this.maxMetrics) {
      this.llmCalls.shift();
    }
  }

  /**
   * Record a Z3 call
   */
  recordZ3Call(metrics: Z3CallMetrics): void {
    if (!this.enabled) return;
    this.z3Calls.push(metrics);

    // Implement circular buffer: remove oldest if limit exceeded
    if (this.z3Calls.length > this.maxMetrics) {
      this.z3Calls.shift();
    }
  }

  /**
   * Start timing an LLM call
   */
  startLLMCall(
    _model: string,
    _type: LLMCallMetrics['type']
  ): { callId: string; startTime: number } {
    const callId = `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    return { callId, startTime };
  }

  /**
   * End timing an LLM call
   */
  endLLMCall(
    callId: string,
    startTime: number,
    model: string,
    type: LLMCallMetrics['type'],
    options: {
      success: boolean;
      error?: string;
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      responseSize?: number;
    }
  ): void {
    if (!this.enabled) return;

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.recordLLMCall({
      callId,
      model,
      type,
      startTime,
      endTime,
      duration,
      ...options,
    });
  }

  /**
   * Start timing a Z3 call
   */
  startZ3Call(
    _backend: 'smt2' | 'json',
    _formulaSize: number
  ): { callId: string; startTime: number } {
    const callId = `z3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    return { callId, startTime };
  }

  /**
   * End timing a Z3 call
   */
  endZ3Call(
    callId: string,
    startTime: number,
    backend: 'smt2' | 'json',
    formulaSize: number,
    result: 'sat' | 'unsat' | 'unknown',
    success: boolean,
    error?: string
  ): void {
    if (!this.enabled) return;

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.recordZ3Call({
      callId,
      backend,
      startTime,
      endTime,
      duration,
      formulaSize,
      result,
      success,
      error,
    });
  }

  /**
   * Get all LLM call metrics
   */
  getLLMMetrics(): LLMCallMetrics[] {
    return [...this.llmCalls];
  }

  /**
   * Get all Z3 call metrics
   */
  getZ3Metrics(): Z3CallMetrics[] {
    return [...this.z3Calls];
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): AggregatedMetrics {
    const llmMetrics = this.llmCalls;
    const z3Metrics = this.z3Calls;

    // LLM metrics
    const successfulLLMCalls = llmMetrics.filter((m) => m.success).length;
    const failedLLMCalls = llmMetrics.length - successfulLLMCalls;
    const llmTimes = llmMetrics.map((m) => m.duration);
    const totalLLMTime = llmTimes.reduce((sum, t) => sum + t, 0);
    const averageLLMTime = llmTimes.length > 0 ? totalLLMTime / llmTimes.length : 0;
    const minLLMTime = llmTimes.length > 0 ? Math.min(...llmTimes) : 0;
    const maxLLMTime = llmTimes.length > 0 ? Math.max(...llmTimes) : 0;

    const totalTokens = llmMetrics.reduce((sum, m) => sum + (m.totalTokens || 0), 0);
    const totalPromptTokens = llmMetrics.reduce((sum, m) => sum + (m.promptTokens || 0), 0);
    const totalCompletionTokens = llmMetrics.reduce((sum, m) => sum + (m.completionTokens || 0), 0);

    const callsByType: Record<string, number> = {};
    llmMetrics.forEach((m) => {
      callsByType[m.type] = (callsByType[m.type] || 0) + 1;
    });

    // Z3 metrics
    const successfulZ3Calls = z3Metrics.filter((m) => m.success).length;
    const failedZ3Calls = z3Metrics.length - successfulZ3Calls;
    const z3Times = z3Metrics.map((m) => m.duration);
    const totalZ3Time = z3Times.reduce((sum, t) => sum + t, 0);
    const averageZ3Time = z3Times.length > 0 ? totalZ3Time / z3Times.length : 0;
    const minZ3Time = z3Times.length > 0 ? Math.min(...z3Times) : 0;
    const maxZ3Time = z3Times.length > 0 ? Math.max(...z3Times) : 0;

    return {
      totalLLMCalls: llmMetrics.length,
      successfulLLMCalls,
      failedLLMCalls,
      totalLLMTime,
      averageLLMTime,
      minLLMTime,
      maxLLMTime,
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
      callsByType,
      totalZ3Calls: z3Metrics.length,
      successfulZ3Calls,
      failedZ3Calls,
      totalZ3Time,
      averageZ3Time,
      minZ3Time,
      maxZ3Time,
    };
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const metrics = this.getAggregatedMetrics();

    const report = `
=== Performance Report ===

LLM Metrics:
  Total Calls: ${metrics.totalLLMCalls}
  Successful: ${metrics.successfulLLMCalls}
  Failed: ${metrics.failedLLMCalls}
  Total Time: ${metrics.totalLLMTime.toFixed(2)}ms
  Average Time: ${metrics.averageLLMTime.toFixed(2)}ms
  Min Time: ${metrics.minLLMTime.toFixed(2)}ms
  Max Time: ${metrics.maxLLMTime.toFixed(2)}ms

  Tokens:
    Total: ${metrics.totalTokens}
    Prompt: ${metrics.totalPromptTokens}
    Completion: ${metrics.totalCompletionTokens}

  Calls by Type:
${Object.entries(metrics.callsByType)
  .map(([type, count]) => `    ${type}: ${count}`)
  .join('\n')}

Z3 Metrics:
  Total Calls: ${metrics.totalZ3Calls}
  Successful: ${metrics.successfulZ3Calls}
  Failed: ${metrics.failedZ3Calls}
  Total Time: ${metrics.totalZ3Time.toFixed(2)}ms
  Average Time: ${metrics.averageZ3Time.toFixed(2)}ms
  Min Time: ${metrics.minZ3Time.toFixed(2)}ms
  Max Time: ${metrics.maxZ3Time.toFixed(2)}ms

Performance Breakdown:
  LLM Time: ${((metrics.totalLLMTime / (metrics.totalLLMTime + metrics.totalZ3Time)) * 100).toFixed(1)}%
  Z3 Time: ${((metrics.totalZ3Time / (metrics.totalLLMTime + metrics.totalZ3Time)) * 100).toFixed(1)}%
`;

    return report;
  }

  /**
   * Clear all recorded metrics
   */
  clear(): void {
    this.llmCalls = [];
    this.z3Calls = [];
  }

  /**
   * Clean up metrics older than specified age
   * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours)
   * @returns Number of metrics removed
   */
  cleanupOldMetrics(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    const initialCount = this.llmCalls.length + this.z3Calls.length;

    this.llmCalls = this.llmCalls.filter((m) => m.endTime > cutoff);
    this.z3Calls = this.z3Calls.filter((m) => m.endTime > cutoff);

    return initialCount - (this.llmCalls.length + this.z3Calls.length);
  }

  /**
   * Export metrics to JSON
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        llmCalls: this.llmCalls,
        z3Calls: this.z3Calls,
        aggregated: this.getAggregatedMetrics(),
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * Enable profiling
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable profiling
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if profiling is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Global profiler instance
 */
let globalProfiler: PerformanceProfiler | null = null;

/**
 * Get or create the global profiler instance
 */
export function getGlobalProfiler(): PerformanceProfiler {
  if (!globalProfiler) {
    globalProfiler = new PerformanceProfiler(false); // Disabled by default
  }
  return globalProfiler;
}

/**
 * Set the global profiler instance
 */
export function setGlobalProfiler(profiler: PerformanceProfiler | null): void {
  globalProfiler = profiler;
}

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (label) {
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * Measure sync function execution time
 */
export function measureSync<T>(fn: () => T, label?: string): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (label) {
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}
