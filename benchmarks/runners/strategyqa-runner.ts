/**
 * StrategyQA benchmark runner
 *
 * StrategyQA tests multi-hop reasoning and implicit knowledge.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type OpenAI from 'openai';
import { BaseBenchmarkRunner } from './base-runner.js';
import type { BenchmarkTask, StrategyQATask } from '../types/index.js';

export class StrategyQARunner extends BaseBenchmarkRunner {
  name = 'StrategyQA';

  constructor(
    client: OpenAI,
    private dataPath?: string
  ) {
    super(client);
  }

  async loadTasks(): Promise<BenchmarkTask[]> {
    const path = this.dataPath || join(process.cwd(), 'benchmarks/data/strategyqa.json');

    try {
      const data = await readFile(path, 'utf-8');
      const tasks: StrategyQATask[] = JSON.parse(data);
      return tasks;
    } catch (error) {
      console.warn(`⚠️  Could not load StrategyQA data from ${path}`);
      console.warn(`   Using sample data instead`);
      return this.getSampleTasks();
    }
  }

  protected formatTask(task: BenchmarkTask): { question: string; context: string } {
    const sqaTask = task as StrategyQATask;

    // Format facts and decomposition
    const contextParts: string[] = [];

    if (sqaTask.facts && sqaTask.facts.length > 0) {
      contextParts.push('Relevant Facts:');
      contextParts.push(...sqaTask.facts.map((f) => `- ${f}`));
    }

    if (sqaTask.decomposition && sqaTask.decomposition.length > 0) {
      contextParts.push('');
      contextParts.push('Reasoning Steps:');
      contextParts.push(...sqaTask.decomposition.map((d, i) => `${i + 1}. ${d}`));
    }

    // Fallback to generic context
    if (contextParts.length === 0 && sqaTask.context) {
      contextParts.push(sqaTask.context);
    }

    // If still no context, provide minimal instruction
    if (contextParts.length === 0) {
      contextParts.push('Answer the question using logical reasoning.');
    }

    return {
      question: task.question,
      context: contextParts.join('\n'),
    };
  }

  private getSampleTasks(): StrategyQATask[] {
    return [
      {
        id: 'strategyqa_sample_001',
        question: 'Could a dolphin live in the Sahara Desert?',
        facts: [
          'Dolphins are aquatic mammals.',
          'Dolphins require water to survive.',
          'The Sahara Desert is extremely arid.',
        ],
        decomposition: [
          'Dolphins need water to survive.',
          'The Sahara Desert has very little water.',
          'Therefore, dolphins cannot survive in the Sahara.',
        ],
        answer: false,
      },
      {
        id: 'strategyqa_sample_002',
        question: 'Did Julius Caesar know about the Roman Empire?',
        facts: [
          'Julius Caesar lived during the Roman Republic.',
          'The Roman Empire was established after Caesar\'s death.',
          'Caesar was assassinated in 44 BCE.',
        ],
        decomposition: [
          'Caesar died before the Roman Empire was established.',
          'He could not know about something that happened after his death.',
          'Therefore, Caesar did not know about the Roman Empire.',
        ],
        answer: false,
      },
      {
        id: 'strategyqa_sample_003',
        question: 'Can you see the Great Wall of China from space?',
        facts: [
          'The Great Wall of China is about 6 meters wide.',
          'Objects need to be much larger to be visible from space.',
          'Astronauts cannot see it with the naked eye from the International Space Station.',
        ],
        answer: false,
      },
    ];
  }
}
