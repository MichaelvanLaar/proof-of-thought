/**
 * ProntoQA benchmark runner
 *
 * ProntoQA tests logical reasoning with fictional predicates.
 * Example: "Every jompus is fruity. Every wumpus is a jompus. Is Wumpus fruity?"
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type OpenAI from 'openai';
import { BaseBenchmarkRunner } from './base-runner.js';
import type { BenchmarkTask, ProntoQATask } from '../types/index.js';

export class ProntoQARunner extends BaseBenchmarkRunner {
  name = 'ProntoQA';

  constructor(
    client: OpenAI,
    private dataPath?: string
  ) {
    super(client);
  }

  async loadTasks(): Promise<BenchmarkTask[]> {
    const path = this.dataPath || join(process.cwd(), 'benchmarks/data/prontoqa.json');

    try {
      const data = await readFile(path, 'utf-8');
      const tasks: ProntoQATask[] = JSON.parse(data);
      return tasks;
    } catch (error) {
      console.warn(`⚠️  Could not load ProntoQA data from ${path}`);
      console.warn(`   Using sample data instead`);
      return this.getSampleTasks();
    }
  }

  protected formatTask(task: BenchmarkTask): { question: string; context: string } {
    const prontoTask = task as ProntoQATask;

    // Combine facts and rules into context
    const contextParts: string[] = [];

    if (prontoTask.facts && prontoTask.facts.length > 0) {
      contextParts.push('Facts:');
      contextParts.push(...prontoTask.facts.map((f) => `- ${f}`));
    }

    if (prontoTask.rules && prontoTask.rules.length > 0) {
      contextParts.push('Rules:');
      contextParts.push(...prontoTask.rules.map((r) => `- ${r}`));
    }

    // Fallback to generic context
    if (contextParts.length === 0 && prontoTask.context) {
      contextParts.push(prontoTask.context);
    }

    return {
      question: task.question,
      context: contextParts.join('\n'),
    };
  }

  private getSampleTasks(): ProntoQATask[] {
    return [
      {
        id: 'prontoqa_sample_001',
        question: 'Is Wumpus fruity?',
        facts: [],
        rules: ['Every jompus is fruity.', 'Every wumpus is a jompus.'],
        answer: true,
      },
      {
        id: 'prontoqa_sample_002',
        question: 'Is Polly transparent?',
        facts: [],
        rules: ['Every animal is transparent.', 'Polly is an animal.'],
        answer: true,
      },
      {
        id: 'prontoqa_sample_003',
        question: 'Is Alex cold?',
        facts: ['Alex is hot.'],
        rules: ['If something is hot, then it is not cold.'],
        answer: false,
      },
    ];
  }
}
