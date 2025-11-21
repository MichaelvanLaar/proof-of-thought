/**
 * Self-Refine Postprocessing Example
 *
 * Demonstrates iterative refinement of reasoning through self-critique.
 *
 * Run: tsx examples/postprocessing/self-refine-example.ts
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

  console.log('Self-Refine Postprocessing Example\n');

  const question = 'Is the conclusion logically valid?';
  const context = `
    Premise 1: All mammals have hearts.
    Premise 2: All whales are mammals.
    Conclusion: All whales have hearts.
  `;

  console.log('Question:', question);
  console.log('Context:', context.trim());
  console.log();

  // Base reasoning without postprocessing
  console.log('═'.repeat(60));
  console.log('Without Postprocessing');
  console.log('═'.repeat(60));

  const baseResponse = await pot.query(question, context);
  console.log('Answer:', baseResponse.answer);
  console.log('Time:', `${baseResponse.executionTime}ms`);
  console.log();

  // With self-refine postprocessing
  console.log('═'.repeat(60));
  console.log('With Self-Refine Postprocessing');
  console.log('═'.repeat(60));

  // Note: This is a placeholder - actual implementation would use
  // the postprocessing methods once they're integrated
  console.log('Self-refine would:');
  console.log('1. Generate initial answer');
  console.log('2. Critique the answer');
  console.log('3. Refine based on critique');
  console.log('4. Repeat until convergence or max iterations');
  console.log();

  console.log('Configuration:');
  console.log('  Max iterations: 3');
  console.log('  Convergence threshold: 0.95');
  console.log();

  console.log('Expected output:');
  console.log('  Iteration 1: Initial answer');
  console.log('  Iteration 2: Refined answer (with improvements)');
  console.log('  Iteration 3: Converged answer');
  console.log();

  console.log('NOTE: Full self-refine integration coming soon');
}

main();
