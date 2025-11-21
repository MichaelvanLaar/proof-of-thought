/**
 * FOLIO benchmark runner
 *
 * FOLIO (First-Order Logic Inference) tests first-order logic reasoning.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type OpenAI from 'openai';
import { BaseBenchmarkRunner } from './base-runner.js';
import type { BenchmarkTask, FOLIOTask } from '../types/index.js';

export class FOLIORunner extends BaseBenchmarkRunner {
  name = 'FOLIO';

  constructor(
    client: OpenAI,
    private dataPath?: string
  ) {
    super(client);
  }

  async loadTasks(): Promise<BenchmarkTask[]> {
    const path = this.dataPath || join(process.cwd(), 'benchmarks/data/folio.json');

    try {
      const data = await readFile(path, 'utf-8');
      const tasks: FOLIOTask[] = JSON.parse(data);
      return tasks;
    } catch (error) {
      console.warn(`⚠️  Could not load FOLIO data from ${path}`);
      console.warn(`   Using sample data instead`);
      return this.getSampleTasks();
    }
  }

  protected formatTask(task: BenchmarkTask): { question: string; context: string } {
    const folioTask = task as FOLIOTask;

    // Format premises and conclusion
    const contextParts: string[] = [];

    if (folioTask.premises && folioTask.premises.length > 0) {
      contextParts.push('Premises:');
      contextParts.push(...folioTask.premises.map((p, i) => `${i + 1}. ${p}`));
    }

    if (folioTask.conclusion) {
      contextParts.push('');
      contextParts.push(`Conclusion: ${folioTask.conclusion}`);
    }

    // Fallback to generic context
    if (contextParts.length === 0 && folioTask.context) {
      contextParts.push(folioTask.context);
    }

    return {
      question: task.question || 'Does the conclusion follow from the premises?',
      context: contextParts.join('\n'),
    };
  }

  private getSampleTasks(): FOLIOTask[] {
    return [
      {
        id: 'folio_sample_001',
        question: 'Does the conclusion follow from the premises?',
        premises: [
          'All students are people.',
          'All people who study are smart.',
          'John is a student who studies.',
        ],
        conclusion: 'John is smart.',
        answer: true,
      },
      {
        id: 'folio_sample_002',
        question: 'Does the conclusion follow from the premises?',
        premises: ['All birds can fly.', 'Penguins are birds.'],
        conclusion: 'Penguins can fly.',
        answer: true, // Logically follows, even if factually incorrect
      },
      {
        id: 'folio_sample_003',
        question: 'Does the conclusion follow from the premises?',
        premises: [
          'If it rains, the ground is wet.',
          'The ground is wet.',
        ],
        conclusion: 'It is raining.',
        answer: false, // Affirming the consequent fallacy
      },
    ];
  }
}
