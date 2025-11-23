/**
 * SMT2 Backend Example
 *
 * Demonstrates using the SMT2 backend for logical reasoning.
 * SMT2 is best for formal logic and mathematical reasoning.
 *
 * Run: tsx examples/backends/smt2-example.ts
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
    verbose: true,
  });

  console.log('SMT2 Backend Examples\n');

  // Example 1: Syllogism
  console.log('═'.repeat(60));
  console.log('Example 1: Classic Syllogism');
  console.log('═'.repeat(60));

  try {
    const response1 = await pot.query(
      'Is Socrates mortal?',
      'All humans are mortal. Socrates is human.'
    );
    console.log('Answer:', response1.answer);
    console.log('Verified:', response1.isVerified);
    console.log();
  } catch (error) {
    console.error('Error:', error);
  }

  // Example 2: Mathematical reasoning
  console.log('═'.repeat(60));
  console.log('Example 2: Mathematical Reasoning');
  console.log('═'.repeat(60));

  try {
    const response2 = await pot.query(
      'Is x greater than 5?',
      'x > 3 and x > 4 and x > 2'
    );
    console.log('Answer:', response2.answer);
    console.log('Formula preview:', response2.formula.substring(0, 150) + '...');
    console.log();
  } catch (error) {
    console.error('Error:', error);
  }

  // Example 3: Transitive property
  console.log('═'.repeat(60));
  console.log('Example 3: Transitive Property');
  console.log('═'.repeat(60));

  try {
    const response3 = await pot.query(
      'Is A greater than C?',
      'A is greater than B. B is greater than C.'
    );
    console.log('Answer:', response3.answer);
    console.log('Proof steps:', response3.proof.length);
    response3.proof.forEach((step) => {
      console.log(`  ${step.step}. ${step.description}`);
    });
    console.log();
  } catch (error) {
    console.error('Error:', error);
  }

  // Example 4: Contradiction detection
  console.log('═'.repeat(60));
  console.log('Example 4: Contradiction Detection');
  console.log('═'.repeat(60));

  try {
    const response4 = await pot.query(
      'Can both statements be true?',
      'John is taller than Mary. Mary is taller than John.'
    );
    console.log('Answer:', response4.answer);
    console.log('Verified:', response4.isVerified);
    console.log();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
