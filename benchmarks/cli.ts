#!/usr/bin/env node
/**
 * Benchmark CLI - Run ProofOfThought benchmarks from command line
 *
 * Usage:
 *   npm run benchmark -- --benchmark prontoqa --backend smt2
 *   npm run benchmark -- --benchmark all --backend json --max-tasks 10
 */

import { Command } from 'commander';
import OpenAI from 'openai';
import { ProntoQARunner } from './runners/prontoqa-runner.js';
import { FOLIORunner } from './runners/folio-runner.js';
import { ProofWriterRunner } from './runners/proofwriter-runner.js';
import { ConditionalQARunner } from './runners/conditionalqa-runner.js';
import { StrategyQARunner } from './runners/strategyqa-runner.js';
import {
  ConsoleReporter,
  JSONReporter,
  MarkdownReporter,
  CSVReporter,
} from './utils/reporter.js';
import type { BenchmarkRunner, BenchmarkConfig, ResultReporter } from './types/index.js';

const program = new Command();

program
  .name('proof-of-thought-benchmark')
  .description('Run ProofOfThought reasoning benchmarks')
  .version('0.1.0');

program
  .option('-b, --benchmark <name>', 'Benchmark to run (prontoqa, folio, proofwriter, conditionalqa, strategyqa, or all)', 'all')
  .option('--backend <type>', 'Backend to use (smt2 or json)', 'smt2')
  .option('--model <name>', 'OpenAI model to use', 'gpt-4o')
  .option('--temperature <number>', 'Temperature for LLM', '0.0')
  .option('--max-tokens <number>', 'Max tokens for LLM', '4096')
  .option('--z3-timeout <ms>', 'Z3 solver timeout in milliseconds', '30000')
  .option('--max-tasks <number>', 'Limit number of tasks to run')
  .option('--shuffle', 'Shuffle tasks before running')
  .option('--verbose', 'Verbose output during execution')
  .option('--output-format <format>', 'Output format (console, json, markdown, csv)', 'console')
  .option('--output-file <path>', 'Save results to file')
  .option('--api-key <key>', 'OpenAI API key (or set OPENAI_API_KEY env var)');

program.parse();

const options = program.opts();

async function main() {
  // Validate API key
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OpenAI API key required');
    console.error('   Set OPENAI_API_KEY environment variable or use --api-key option');
    process.exit(1);
  }

  // Initialize OpenAI client
  const client = new OpenAI({ apiKey });

  // Select benchmarks to run
  const benchmarkNames = options.benchmark === 'all'
    ? ['prontoqa', 'folio', 'proofwriter', 'conditionalqa', 'strategyqa']
    : [options.benchmark.toLowerCase()];

  // Create runners
  const runners: BenchmarkRunner[] = [];
  for (const name of benchmarkNames) {
    switch (name) {
      case 'prontoqa':
        runners.push(new ProntoQARunner(client));
        break;
      case 'folio':
        runners.push(new FOLIORunner(client));
        break;
      case 'proofwriter':
        runners.push(new ProofWriterRunner(client));
        break;
      case 'conditionalqa':
        runners.push(new ConditionalQARunner(client));
        break;
      case 'strategyqa':
        runners.push(new StrategyQARunner(client));
        break;
      default:
        console.error(`❌ Unknown benchmark: ${name}`);
        console.error('   Valid options: prontoqa, folio, proofwriter, conditionalqa, strategyqa, all');
        process.exit(1);
    }
  }

  // Create reporter
  let reporter: ResultReporter;
  switch (options.outputFormat.toLowerCase()) {
    case 'json':
      reporter = new JSONReporter();
      break;
    case 'markdown':
    case 'md':
      reporter = new MarkdownReporter();
      break;
    case 'csv':
      reporter = new CSVReporter();
      break;
    case 'console':
    default:
      reporter = new ConsoleReporter();
      break;
  }

  // Run benchmarks
  console.log('═'.repeat(80));
  console.log('  ProofOfThought Benchmark Suite');
  console.log('═'.repeat(80));
  console.log('');

  for (const runner of runners) {
    const config: BenchmarkConfig = {
      benchmarkName: runner.name,
      backend: options.backend as 'smt2' | 'json',
      model: options.model,
      temperature: parseFloat(options.temperature),
      maxTokens: parseInt(options.maxTokens),
      z3Timeout: parseInt(options.z3Timeout),
      maxTasks: options.maxTasks ? parseInt(options.maxTasks) : undefined,
      shuffle: options.shuffle,
      verbose: options.verbose,
    };

    try {
      // Run benchmark
      const results: any[] = []; // Would track individual results
      const metrics = await runner.run(config);

      // Display results
      const report = reporter.generateReport(metrics, results);
      console.log(report);

      // Save to file if requested
      if (options.outputFile) {
        const outputPath = options.outputFile.replace(
          '{benchmark}',
          runner.name.toLowerCase()
        );
        await reporter.saveReport(metrics, results, outputPath);
        console.log(`\n💾 Results saved to: ${outputPath}`);
      }

      console.log('');
    } catch (error) {
      console.error(`\n❌ Benchmark ${runner.name} failed:`);
      console.error(`   ${error instanceof Error ? error.message : error}`);
      console.log('');
    }
  }

  console.log('═'.repeat(80));
  console.log('  All benchmarks complete');
  console.log('═'.repeat(80));
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
