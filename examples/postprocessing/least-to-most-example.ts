/**
 * Least-to-Most Prompting Example
 *
 * Demonstrates progressive problem-solving from simple to complex.
 *
 * Run: tsx examples/postprocessing/least-to-most-example.ts
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

  console.log('Least-to-Most Prompting Example\n');

  const question = 'What is the result of: ((2 + 3) × 4) - 5?';
  const context = 'Solve step by step, starting with the simplest operations.';

  console.log('Question:', question);
  console.log('Context:', context);
  console.log();

  console.log('═'.repeat(60));
  console.log('Least-to-Most Approach');
  console.log('═'.repeat(60));

  console.log('Progression from simple to complex:');
  console.log();

  console.log('Step 1 (Simplest):');
  console.log('  Problem: 2 + 3');
  console.log('  Solution: 5');
  console.log('  Complexity: Single operation');
  console.log();

  console.log('Step 2 (Building on previous):');
  console.log('  Problem: 5 × 4 (using result from Step 1)');
  console.log('  Solution: 20');
  console.log('  Complexity: One operation, uses previous result');
  console.log();

  console.log('Step 3 (Final, most complex):');
  console.log('  Problem: 20 - 5 (using result from Step 2)');
  console.log('  Solution: 15');
  console.log('  Complexity: Final operation, builds on all previous');
  console.log();

  console.log('Final Answer: 15');
  console.log();

  console.log('Key principle:');
  console.log('  Each step builds on the previous steps');
  console.log('  Start with the simplest sub-problem');
  console.log('  Gradually increase complexity');
  console.log('  Maintain context from previous solutions');
  console.log();

  console.log('NOTE: Full least-to-most integration coming soon');
}

main();
