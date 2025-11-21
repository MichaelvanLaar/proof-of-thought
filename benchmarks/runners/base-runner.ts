/**
 * Base benchmark runner with common functionality
 */

import type OpenAI from 'openai';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';
import type {
  BenchmarkTask,
  BenchmarkResult,
  BenchmarkMetrics,
  BenchmarkConfig,
  BenchmarkRunner,
} from '../types/index.js';
import { generateMetrics } from '../utils/metrics.js';

/**
 * Abstract base class for benchmark runners
 */
export abstract class BaseBenchmarkRunner implements BenchmarkRunner {
  abstract name: string;

  constructor(protected client: OpenAI) {}

  /**
   * Load benchmark tasks (must be implemented by subclasses)
   */
  abstract loadTasks(): Promise<BenchmarkTask[]>;

  /**
   * Format task for reasoning (can be overridden by subclasses)
   */
  protected formatTask(task: BenchmarkTask): { question: string; context: string } {
    return {
      question: task.question,
      context: task.context || '',
    };
  }

  /**
   * Extract answer from reasoning response (can be overridden by subclasses)
   */
  protected extractAnswer(responseText: string): string {
    // Simple extraction - look for yes/no, true/false
    const text = responseText.toLowerCase();

    if (text.includes('yes') || text.includes('true') || text.includes('correct')) {
      return 'true';
    }
    if (text.includes('no') || text.includes('false') || text.includes('incorrect')) {
      return 'false';
    }

    return responseText.trim();
  }

  /**
   * Compare expected and predicted answers
   */
  protected compareAnswers(expected: boolean | string, predicted: string): boolean {
    const normalizedExpected = this.normalizeAnswer(expected);
    const normalizedPredicted = this.normalizeAnswer(predicted);

    return normalizedExpected === normalizedPredicted;
  }

  /**
   * Normalize answer to boolean string
   */
  protected normalizeAnswer(answer: boolean | string): string {
    if (typeof answer === 'boolean') {
      return answer.toString();
    }

    const normalized = answer.toLowerCase().trim();
    if (normalized === 'true' || normalized === 'yes' || normalized === '1') {
      return 'true';
    }
    if (normalized === 'false' || normalized === 'no' || normalized === '0') {
      return 'false';
    }

    return normalized;
  }

  /**
   * Run a single benchmark task
   */
  protected async runTask(
    task: BenchmarkTask,
    pot: ProofOfThought
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();

    try {
      const { question, context } = this.formatTask(task);
      const response = await pot.query(question, context);

      const executionTime = Date.now() - startTime;
      const predictedAnswer = this.extractAnswer(response.answer);
      const isCorrect = this.compareAnswers(task.answer, predictedAnswer);

      return {
        taskId: task.id,
        question: task.question,
        expectedAnswer: task.answer,
        predictedAnswer,
        isCorrect,
        executionTime,
        formula: response.formula,
        proof: response.proof,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        taskId: task.id,
        question: task.question,
        expectedAnswer: task.answer,
        predictedAnswer: '',
        isCorrect: false,
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run the benchmark
   */
  async run(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    console.log(`\n🚀 Starting ${this.name} benchmark...`);
    console.log(`   Backend: ${config.backend.toUpperCase()}`);

    // Load tasks
    console.log(`📚 Loading tasks...`);
    let tasks = await this.loadTasks();

    // Apply filters
    if (config.shuffle) {
      tasks = this.shuffleTasks(tasks);
    }

    if (config.maxTasks && config.maxTasks < tasks.length) {
      tasks = tasks.slice(0, config.maxTasks);
      console.log(`   Limited to ${config.maxTasks} tasks`);
    }

    console.log(`   Loaded ${tasks.length} tasks`);

    // Initialize ProofOfThought
    const pot = new ProofOfThought({
      client: this.client,
      backend: config.backend,
      model: config.model || 'gpt-4o',
      temperature: config.temperature ?? 0.0,
      maxTokens: config.maxTokens || 4096,
      z3Timeout: config.z3Timeout || 30000,
      verbose: config.verbose ?? false,
    });

    // Run tasks
    console.log(`⚡ Running tasks...`);
    const results: BenchmarkResult[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      if (config.verbose) {
        console.log(`   [${i + 1}/${tasks.length}] ${task.id}`);
      } else if ((i + 1) % 10 === 0) {
        console.log(`   Progress: ${i + 1}/${tasks.length}`);
      }

      const result = await this.runTask(task, pot);
      results.push(result);

      if (config.verbose) {
        const status = result.isCorrect ? '✅' : '❌';
        console.log(`      ${status} ${result.executionTime}ms`);
      }
    }

    // Generate metrics
    console.log(`📊 Generating metrics...`);
    const metrics = generateMetrics(config.benchmarkName, config.backend, results);

    console.log(`✅ Benchmark complete!\n`);

    return metrics;
  }

  /**
   * Shuffle tasks randomly
   */
  protected shuffleTasks(tasks: BenchmarkTask[]): BenchmarkTask[] {
    const shuffled = [...tasks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
