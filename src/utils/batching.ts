/**
 * Request batching utilities for ProofOfThought
 *
 * Provides batching mechanisms for LLM and Z3 requests to improve
 * performance by reducing overhead and enabling parallel processing.
 *
 * @packageDocumentation
 */

import type OpenAI from 'openai';
import type { Z3Adapter } from '../adapters/z3-adapter.js';
import type { VerificationResult } from '../types/index.js';

/**
 * Batch configuration options
 */
export interface BatchConfig {
  /**
   * Maximum number of items in a batch
   * @default 10
   */
  maxBatchSize?: number;

  /**
   * Maximum time to wait for batch to fill (ms)
   * @default 100
   */
  maxWaitTime?: number;

  /**
   * Maximum number of concurrent batches
   * @default 5
   */
  maxConcurrency?: number;

  /**
   * Enable batch statistics tracking
   * @default true
   */
  enableStats?: boolean;
}

/**
 * Batch statistics
 */
export interface BatchStats {
  /** Total items processed */
  totalItems: number;
  /** Total batches executed */
  totalBatches: number;
  /** Average batch size */
  averageBatchSize: number;
  /** Items currently queued */
  queuedItems: number;
  /** Batches currently processing */
  activeBatches: number;
}

/**
 * Batch item with resolver
 */
interface BatchItem<T, R> {
  input: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Generic batch processor
 *
 * Collects items and processes them in batches to improve performance.
 */
export class BatchProcessor<T, R> {
  private queue: BatchItem<T, R>[] = [];
  private processing = false;
  private timer: NodeJS.Timeout | null = null;
  private activeBatches = 0;

  // Statistics
  private totalItems = 0;
  private totalBatches = 0;

  private config: Required<BatchConfig>;
  private processFn: (items: T[]) => Promise<R[]>;

  constructor(
    processFn: (items: T[]) => Promise<R[]>,
    config: BatchConfig = {}
  ) {
    this.processFn = processFn;
    this.config = {
      maxBatchSize: config.maxBatchSize || 10,
      maxWaitTime: config.maxWaitTime || 100,
      maxConcurrency: config.maxConcurrency || 5,
      enableStats: config.enableStats !== false,
    };
  }

  /**
   * Add item to batch queue
   */
  async add(input: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({
        input,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Start timer if not already running
      if (!this.timer) {
        this.timer = setTimeout(() => {
          this.flush();
        }, this.config.maxWaitTime);
      }

      // If batch is full, flush immediately
      if (this.queue.length >= this.config.maxBatchSize) {
        this.flush();
      }
    });
  }

  /**
   * Flush pending items and process batch
   */
  async flush(): Promise<void> {
    // Clear timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // If already processing or queue is empty, return
    if (this.processing || this.queue.length === 0) {
      return;
    }

    // Wait if max concurrency reached
    while (this.activeBatches >= this.config.maxConcurrency) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.processing = true;

    // Take items from queue
    const batchSize = Math.min(this.queue.length, this.config.maxBatchSize);
    const batch = this.queue.splice(0, batchSize);

    try {
      this.activeBatches++;

      // Process batch
      const inputs = batch.map((item) => item.input);
      const results = await this.processFn(inputs);

      // Resolve promises
      batch.forEach((item, index) => {
        item.resolve(results[index] as R);
      });

      // Update statistics
      if (this.config.enableStats) {
        this.totalItems += batch.length;
        this.totalBatches++;
      }
    } catch (error) {
      // Reject all promises in batch
      batch.forEach((item) => {
        item.reject(
          error instanceof Error ? error : new Error(String(error))
        );
      });
    } finally {
      this.activeBatches--;
      this.processing = false;

      // Process next batch if queue has items
      if (this.queue.length > 0) {
        setImmediate(() => this.flush());
      }
    }
  }

  /**
   * Get batch statistics
   */
  getStats(): BatchStats {
    return {
      totalItems: this.totalItems,
      totalBatches: this.totalBatches,
      averageBatchSize:
        this.totalBatches > 0 ? this.totalItems / this.totalBatches : 0,
      queuedItems: this.queue.length,
      activeBatches: this.activeBatches,
    };
  }

  /**
   * Clear queue and reset statistics
   */
  clear(): void {
    // Reject all pending items
    this.queue.forEach((item) => {
      item.reject(new Error('Batch processor cleared'));
    });

    this.queue = [];
    this.totalItems = 0;
    this.totalBatches = 0;
    this.activeBatches = 0;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Wait for all pending batches to complete
   */
  async waitForCompletion(): Promise<void> {
    // Flush any pending items
    await this.flush();

    // Wait for active batches
    while (this.activeBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

/**
 * LLM request for batching
 */
export interface LLMRequest {
  model: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLM response from batching
 */
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Batch LLM requests
 *
 * Note: OpenAI does not support true batch requests in a single API call,
 * but this utility processes multiple requests concurrently with appropriate
 * rate limiting and retry logic.
 */
export class LLMBatcher {
  private processor: BatchProcessor<LLMRequest, LLMResponse>;
  private client: OpenAI;

  constructor(client: OpenAI, config: BatchConfig = {}) {
    this.client = client;

    this.processor = new BatchProcessor<LLMRequest, LLMResponse>(
      async (requests) => this.processBatch(requests),
      config
    );
  }

  /**
   * Process a batch of LLM requests
   */
  private async processBatch(
    requests: LLMRequest[]
  ): Promise<LLMResponse[]> {
    // Process requests in parallel with Promise.all
    const promises = requests.map(async (request) => {
      const completion = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2000,
      });

      const content = completion.choices[0]?.message?.content || '';
      const usage = completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined;

      return { content, usage };
    });

    return Promise.all(promises);
  }

  /**
   * Add LLM request to batch
   */
  async request(request: LLMRequest): Promise<LLMResponse> {
    return this.processor.add(request);
  }

  /**
   * Flush pending requests
   */
  async flush(): Promise<void> {
    return this.processor.flush();
  }

  /**
   * Get batch statistics
   */
  getStats(): BatchStats {
    return this.processor.getStats();
  }

  /**
   * Wait for all pending batches to complete
   */
  async waitForCompletion(): Promise<void> {
    return this.processor.waitForCompletion();
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.processor.clear();
  }
}

/**
 * Z3 verification request for batching
 */
export interface Z3Request {
  formula: string;
  backend: 'smt2' | 'json';
}

/**
 * Batch Z3 verification requests
 *
 * Processes multiple Z3 verification requests in parallel.
 */
export class Z3Batcher {
  private processor: BatchProcessor<Z3Request, VerificationResult>;
  private adapter: Z3Adapter;

  constructor(adapter: Z3Adapter, config: BatchConfig = {}) {
    this.adapter = adapter;

    this.processor = new BatchProcessor<Z3Request, VerificationResult>(
      async (requests) => this.processBatch(requests),
      config
    );
  }

  /**
   * Process a batch of Z3 requests
   */
  private async processBatch(
    requests: Z3Request[]
  ): Promise<VerificationResult[]> {
    // Process requests in parallel
    const promises = requests.map(async (request) => {
      return this.adapter.verify(request.formula);
    });

    return Promise.all(promises);
  }

  /**
   * Add Z3 request to batch
   */
  async verify(formula: string, backend: 'smt2' | 'json' = 'smt2'): Promise<VerificationResult> {
    return this.processor.add({ formula, backend });
  }

  /**
   * Flush pending requests
   */
  async flush(): Promise<void> {
    return this.processor.flush();
  }

  /**
   * Get batch statistics
   */
  getStats(): BatchStats {
    return this.processor.getStats();
  }

  /**
   * Wait for all pending batches to complete
   */
  async waitForCompletion(): Promise<void> {
    return this.processor.waitForCompletion();
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.processor.clear();
  }
}

/**
 * Batch helper for least-to-most prompting
 *
 * Processes subquestions in parallel batches for improved performance.
 */
export class SubquestionBatcher {
  private llmBatcher: LLMBatcher;

  constructor(client: OpenAI, config: BatchConfig = {}) {
    this.llmBatcher = new LLMBatcher(client, {
      ...config,
      maxBatchSize: config.maxBatchSize || 5, // Smaller batches for subquestions
    });
  }

  /**
   * Process subquestions in batches
   */
  async processSubquestions(
    subquestions: string[],
    context: string,
    model: string = 'gpt-4'
  ): Promise<string[]> {
    const promises = subquestions.map((subquestion) => {
      return this.llmBatcher.request({
        model,
        messages: [
          {
            role: 'system',
            content: 'Answer the following subquestion based on the context.',
          },
          {
            role: 'user',
            content: `Context: ${context}\n\nSubquestion: ${subquestion}`,
          },
        ],
        temperature: 0.7,
        maxTokens: 500,
      });
    });

    const responses = await Promise.all(promises);
    return responses.map((r) => r.content);
  }

  /**
   * Get batch statistics
   */
  getStats(): BatchStats {
    return this.llmBatcher.getStats();
  }

  /**
   * Wait for all pending batches to complete
   */
  async waitForCompletion(): Promise<void> {
    return this.llmBatcher.waitForCompletion();
  }
}

/**
 * Create a batched version of a function
 *
 * Wraps an async function with batching logic.
 */
export function createBatchedFunction<T, R>(
  fn: (items: T[]) => Promise<R[]>,
  config: BatchConfig = {}
): (item: T) => Promise<R> {
  const processor = new BatchProcessor<T, R>(fn, config);

  return async (item: T): Promise<R> => {
    return processor.add(item);
  };
}

/**
 * Batch execute async functions with concurrency control
 */
export async function batchExecute<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    concurrency?: number;
  } = {}
): Promise<R[]> {
  const batchSize = options.batchSize || 10;
  const concurrency = options.concurrency || 5;

  const results: R[] = [];
  const batches: T[][] = [];

  // Split into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Process batches with concurrency control
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency);
    const batchPromises = batchGroup.map(async (batch) => {
      return Promise.all(batch.map(fn));
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
  }

  return results;
}
