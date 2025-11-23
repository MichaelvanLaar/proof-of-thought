/**
 * ConditionalQA benchmark runner
 *
 * ConditionalQA tests conditional reasoning under different scenarios.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type OpenAI from 'openai';
import { BaseBenchmarkRunner } from './base-runner.js';
import type { BenchmarkTask, ConditionalQATask } from '../types/index.js';

export class ConditionalQARunner extends BaseBenchmarkRunner {
  name = 'ConditionalQA';

  constructor(
    client: OpenAI,
    private dataPath?: string
  ) {
    super(client);
  }

  async loadTasks(): Promise<BenchmarkTask[]> {
    const path = this.dataPath || join(process.cwd(), 'benchmarks/data/conditionalqa.json');

    try {
      const data = await readFile(path, 'utf-8');
      const tasks: ConditionalQATask[] = JSON.parse(data);
      return tasks;
    } catch (error) {
      console.warn(`⚠️  Could not load ConditionalQA data from ${path}`);
      console.warn(`   Using sample data instead`);
      return this.getSampleTasks();
    }
  }

  protected formatTask(task: BenchmarkTask): { question: string; context: string } {
    const cqaTask = task as ConditionalQATask;

    // Format scenario and conditions
    const contextParts: string[] = [];

    if (cqaTask.scenario) {
      contextParts.push('Scenario:');
      contextParts.push(cqaTask.scenario);
      contextParts.push('');
    }

    if (cqaTask.conditions && cqaTask.conditions.length > 0) {
      contextParts.push('Conditions:');
      contextParts.push(...cqaTask.conditions.map((c) => `- ${c}`));
    }

    // Fallback to generic context
    if (contextParts.length === 0 && cqaTask.context) {
      contextParts.push(cqaTask.context);
    }

    return {
      question: cqaTask.query || task.question,
      context: contextParts.join('\n'),
    };
  }

  private getSampleTasks(): ConditionalQATask[] {
    return [
      {
        id: 'conditionalqa_sample_001',
        question: 'Will Mary go to the party?',
        scenario: 'Mary decides whether to go to a party based on the weather.',
        conditions: [
          'If it rains, Mary will not go to the party.',
          'If it does not rain, Mary will go to the party.',
          'It is not raining.',
        ],
        query: 'Will Mary go to the party?',
        answer: true,
      },
      {
        id: 'conditionalqa_sample_002',
        question: 'Will John pass the exam?',
        scenario: 'John needs to meet certain conditions to pass.',
        conditions: [
          'John passes if he scores above 60.',
          'John scored 75.',
        ],
        query: 'Will John pass the exam?',
        answer: true,
      },
    ];
  }
}
