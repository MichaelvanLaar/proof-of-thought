/**
 * Basic usage example for ProofOfThought
 *
 * This example demonstrates:
 * - Setting up the ProofOfThought instance
 * - Executing a simple reasoning query
 * - Accessing the reasoning response and proof trace
 */

import { ProofOfThought } from '../src/index.js';
import OpenAI from 'openai';

async function main() {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    console.error('Set it with: export OPENAI_API_KEY=your-api-key');
    process.exit(1);
  }

  // Initialize OpenAI client
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Create ProofOfThought instance
  const pot = new ProofOfThought({
    client,
    backend: 'smt2', // Use SMT-LIB 2.0 backend
    model: 'gpt-4o',
    verbose: true, // Enable verbose logging
  });

  console.log('='.repeat(60));
  console.log('ProofOfThought - Basic Usage Example');
  console.log('='.repeat(60));

  try {
    // Example 1: Classic syllogism
    console.log('\n📝 Example 1: Syllogism');
    console.log('-'.repeat(60));

    const response1 = await pot.query(
      'Is Socrates mortal?',
      `All humans are mortal.
Socrates is a human.`
    );

    console.log('\n✅ Answer:', response1.answer);
    console.log('📊 Verified:', response1.isVerified);
    console.log('⏱️  Execution time:', response1.executionTime, 'ms');
    console.log('🔧 Backend:', response1.backend);

    console.log('\n📋 Proof trace:');
    response1.proof.forEach((step) => {
      console.log(`  ${step.step}. ${step.description}`);
    });

    // Example 2: Mathematical reasoning
    console.log('\n\n📝 Example 2: Mathematical Reasoning');
    console.log('-'.repeat(60));

    const response2 = await pot.query(
      'If x > 5 and y > 10, is x + y > 15?',
      'x and y are integers'
    );

    console.log('\n✅ Answer:', response2.answer);
    console.log('📊 Verified:', response2.isVerified);
    console.log('⏱️  Execution time:', response2.executionTime, 'ms');

    if (response2.model) {
      console.log('\n🔍 Model values:', response2.model);
    }

    // Example 3: Logical contradiction
    console.log('\n\n📝 Example 3: Logical Contradiction');
    console.log('-'.repeat(60));

    const response3 = await pot.query(
      'Can something be both completely red and completely blue at the same time?',
      'An object can only have one color at a time'
    );

    console.log('\n✅ Answer:', response3.answer);
    console.log('📊 Verified:', response3.isVerified);
    console.log('⏱️  Execution time:', response3.executionTime, 'ms');

    console.log('\n\n' + '='.repeat(60));
    console.log('✨ All examples completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
