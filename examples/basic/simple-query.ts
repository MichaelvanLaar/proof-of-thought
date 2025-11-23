/**
 * Basic ProofOfThought Usage Example
 *
 * This example demonstrates the simplest way to use ProofOfThought
 * for logical reasoning.
 *
 * Run: tsx examples/basic/simple-query.ts
 */

import OpenAI from 'openai';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';

async function main() {
  // Initialize OpenAI client
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Create ProofOfThought instance
  const pot = new ProofOfThought({
    client,
    backend: 'smt2', // Use SMT2 backend (default)
    verbose: true, // Enable verbose logging
  });

  // Ask a logical reasoning question
  const question = 'Is Socrates mortal?';
  const context = 'All humans are mortal. Socrates is human.';

  console.log('Question:', question);
  console.log('Context:', context);
  console.log('\nReasoning...\n');

  try {
    const response = await pot.query(question, context);

    console.log('═'.repeat(60));
    console.log('RESULT');
    console.log('═'.repeat(60));
    console.log('Answer:', response.answer);
    console.log('Verified:', response.isVerified ? 'Yes ✓' : 'No ✗');
    console.log('Backend:', response.backend.toUpperCase());
    console.log('Execution Time:', `${response.executionTime}ms`);
    console.log('\nProof Steps:');
    response.proof.forEach((step) => {
      console.log(`  ${step.step}. ${step.description}`);
    });
    console.log('\nFormula (excerpt):');
    console.log(response.formula.substring(0, 200) + '...');
    console.log('═'.repeat(60));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
