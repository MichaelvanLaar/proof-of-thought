/**
 * ProofWriter benchmark runner
 *
 * ProofWriter tests multi-step proof generation and verification.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type OpenAI from 'openai';
import { BaseBenchmarkRunner } from './base-runner.js';
import type { BenchmarkTask, ProofWriterTask } from '../types/index.js';

export class ProofWriterRunner extends BaseBenchmarkRunner {
  name = 'ProofWriter';

  constructor(
    client: OpenAI,
    private dataPath?: string
  ) {
    super(client);
  }

  async loadTasks(): Promise<BenchmarkTask[]> {
    const path = this.dataPath || join(process.cwd(), 'benchmarks/data/proofwriter.json');

    try {
      const data = await readFile(path, 'utf-8');
      const tasks: ProofWriterTask[] = JSON.parse(data);
      return tasks;
    } catch (error) {
      console.warn(`⚠️  Could not load ProofWriter data from ${path}`);
      console.warn(`   Using sample data instead`);
      return this.getSampleTasks();
    }
  }

  protected formatTask(task: BenchmarkTask): { question: string; context: string } {
    const pwTask = task as ProofWriterTask;

    // Format facts and rules
    const contextParts: string[] = [];

    if (pwTask.facts && pwTask.facts.length > 0) {
      contextParts.push('Given Facts:');
      contextParts.push(...pwTask.facts.map((f) => `- ${f}`));
    }

    if (pwTask.rules && pwTask.rules.length > 0) {
      contextParts.push('');
      contextParts.push('Rules:');
      contextParts.push(...pwTask.rules.map((r) => `- ${r}`));
    }

    // Fallback to generic context
    if (contextParts.length === 0 && pwTask.context) {
      contextParts.push(pwTask.context);
    }

    return {
      question: task.question,
      context: contextParts.join('\n'),
    };
  }

  private getSampleTasks(): ProofWriterTask[] {
    return [
      {
        id: 'proofwriter_sample_001',
        question: 'Is Charlie green?',
        facts: ['Charlie is cold.'],
        rules: ['If something is cold then it is green.'],
        depth: 1,
        answer: true,
      },
      {
        id: 'proofwriter_sample_002',
        question: 'Is Bob nice?',
        facts: ['Bob is kind.'],
        rules: ['If something is kind then it is nice.'],
        depth: 1,
        answer: true,
      },
      {
        id: 'proofwriter_sample_003',
        question: 'Is Fiona young?',
        facts: ['Fiona is quiet.', 'Quiet things are smart.', 'Smart things are young.'],
        rules: [],
        depth: 2,
        answer: true,
      },
    ];
  }
}
