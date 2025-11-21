/**
 * Batch Processing Example
 *
 * Demonstrates processing multiple reasoning tasks efficiently.
 *
 * Run: tsx examples/deployment/batch-processing-example.ts
 */

import OpenAI from 'openai';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';

async function main() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const pot = new ProofOfThought({
    client,
    backend: 'smt2',
    verbose: false,
  });

  console.log('Batch Processing Example\n');

  // Define multiple reasoning tasks
  const tasks: Array<[string, string]> = [
    ['Is Socrates mortal?', 'All humans are mortal. Socrates is human.'],
    ['Is x greater than 10?', 'x = 15'],
    ['Is it raining?', 'If the ground is wet, it might be raining. The ground is wet.'],
    ['Is A taller than C?', 'A is taller than B. B is taller than C.'],
    [
      'Can both be true?',
      'Statement 1: It is sunny. Statement 2: It is raining and there are no clouds.',
    ],
  ];

  console.log(`Processing ${tasks.length} tasks...\n`);

  // Example 1: Sequential processing
  console.log('═'.repeat(60));
  console.log('Sequential Processing');
  console.log('═'.repeat(60));

  const startSeq = Date.now();
  const resultsSeq = await pot.batch(tasks, false);
  const timeSeq = Date.now() - startSeq;

  console.log(`Completed in ${timeSeq}ms`);
  console.log(`Average: ${(timeSeq / tasks.length).toFixed(0)}ms per task`);
  console.log();

  resultsSeq.forEach((result, i) => {
    console.log(`Task ${i + 1}:`);
    console.log(`  Question: ${tasks[i][0]}`);
    console.log(`  Answer: ${result.answer.substring(0, 60)}...`);
    console.log(`  Verified: ${result.isVerified}`);
    console.log(`  Time: ${result.executionTime}ms`);
  });
  console.log();

  // Example 2: Parallel processing
  console.log('═'.repeat(60));
  console.log('Parallel Processing');
  console.log('═'.repeat(60));

  const startPar = Date.now();
  const resultsPar = await pot.batch(tasks, true);
  const timePar = Date.now() - startPar;

  console.log(`Completed in ${timePar}ms`);
  console.log(`Speedup: ${(timeSeq / timePar).toFixed(2)}x faster`);
  console.log();

  // Summary
  console.log('═'.repeat(60));
  console.log('Summary');
  console.log('═'.repeat(60));
  console.log(`Total tasks: ${tasks.length}`);
  console.log(`Sequential time: ${timeSeq}ms`);
  console.log(`Parallel time: ${timePar}ms`);
  console.log(`Time saved: ${timeSeq - timePar}ms`);
  console.log();

  // Results analysis
  const successful = resultsPar.filter((r) => r.isVerified).length;
  console.log(`Successful: ${successful}/${tasks.length}`);
  console.log(`Success rate: ${((successful / tasks.length) * 100).toFixed(1)}%`);
}

main();
