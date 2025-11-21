/**
 * JSON Backend Example
 *
 * Demonstrates using the JSON DSL backend for logical reasoning.
 * JSON backend is best for complex nested structures and programmatic manipulation.
 *
 * Run: tsx examples/backends/json-example.ts
 */

import OpenAI from 'openai';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';

async function main() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const pot = new ProofOfThought({
    client,
    backend: 'json',
    verbose: true,
  });

  console.log('JSON Backend Examples\n');

  // Example 1: Basic logical reasoning
  console.log('═'.repeat(60));
  console.log('Example 1: Basic Logical Reasoning');
  console.log('═'.repeat(60));

  try {
    const response1 = await pot.query(
      'Is Socrates mortal?',
      'All humans are mortal. Socrates is human.'
    );
    console.log('Answer:', response1.answer);
    console.log('Backend:', response1.backend);
    console.log();

    // Show JSON DSL structure
    console.log('JSON DSL Structure (formatted):');
    try {
      const formula = JSON.parse(response1.formula);
      console.log(JSON.stringify(formula, null, 2).substring(0, 300) + '...');
    } catch {
      console.log('Formula:', response1.formula.substring(0, 150) + '...');
    }
    console.log();
  } catch (error) {
    console.error('Error:', error);
  }

  // Example 2: Complex nested logic
  console.log('═'.repeat(60));
  console.log('Example 2: Nested Logical Conditions');
  console.log('═'.repeat(60));

  try {
    const response2 = await pot.query(
      'Will Alice go to the party?',
      'If it is sunny and Alice is free, she will go to the party. It is sunny. Alice is free.'
    );
    console.log('Answer:', response2.answer);
    console.log('Execution Time:', `${response2.executionTime}ms`);
    console.log();
  } catch (error) {
    console.error('Error:', error);
  }

  // Example 3: Multiple entities
  console.log('═'.repeat(60));
  console.log('Example 3: Multiple Entity Reasoning');
  console.log('═'.repeat(60));

  try {
    const response3 = await pot.query(
      'Are all students smart?',
      'Every person who studies is smart. Every student studies.'
    );
    console.log('Answer:', response3.answer);
    console.log('Verified:', response3.isVerified);
    console.log('Proof steps:');
    response3.proof.forEach((step) => {
      console.log(`  ${step.step}. ${step.description}`);
    });
    console.log();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
