/**
 * Self-Consistency Postprocessing Example
 *
 * This example demonstrates how to use Self-Consistency to improve answer
 * reliability by generating multiple reasoning paths and using majority voting.
 *
 * Self-Consistency works by:
 * 1. Generating multiple reasoning paths with temperature sampling
 * 2. Collecting all answers
 * 3. Using voting (majority or weighted) to select the most consistent answer
 * 4. Calculating confidence based on answer agreement
 *
 * Prerequisites:
 * - Set OPENAI_API_KEY environment variable
 * - Install Z3 solver (brew install z3, apt-get install z3, or npm install z3-solver)
 *
 * Run: npx tsx examples/self-consistency-usage.ts
 */

import OpenAI from 'openai';
import { ProofOfThought } from '../src/reasoning/proof-of-thought.js';
import { SelfConsistency } from '../src/postprocessing/self-consistency.js';
import type { ReasoningResponse } from '../src/types/index.js';

async function main() {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  // Initialize OpenAI client
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Initialize ProofOfThought
  const pot = new ProofOfThought({
    client,
    verbose: false, // Disable verbose logging for cleaner output
  });

  console.log('🔬 Self-Consistency Postprocessing Example\n');
  console.log('='.repeat(80));

  // Example 1: Majority Voting
  console.log('\n📝 Example 1: Majority Voting\n');

  const question1 = 'Is the statement logically valid: All humans are mortal. Socrates is human. Therefore, Socrates is mortal.';
  const context1 = 'Classical syllogism in logic.';

  console.log(`Question: ${question1}`);
  console.log(`Context: ${context1}\n`);

  // Create reasoning engine wrapper
  const reasoningEngine = async (
    question: string,
    context: string,
    temperature?: number
  ): Promise<ReasoningResponse> => {
    // Temporarily override temperature for sampling diversity
    const originalConfig = pot.getConfig();
    const tempConfig = {
      ...pot,
      config: {
        ...originalConfig,
        temperature: temperature ?? originalConfig.temperature,
      },
    };

    return pot.query(question, context);
  };

  // Initialize Self-Consistency with majority voting
  const scMajority = new SelfConsistency(client, reasoningEngine, {
    numSamples: 5,
    temperature: 0.7,
    votingMethod: 'majority',
  });

  console.log('🔄 Generating 5 reasoning paths with majority voting...\n');

  // Generate paths to see the diversity
  const paths1 = await scMajority.generatePaths(question1, context1);

  console.log('Generated answers:');
  paths1.forEach((path, index) => {
    console.log(`  ${index + 1}. ${path.answer.substring(0, 80)}${path.answer.length > 80 ? '...' : ''}`);
  });

  // Apply self-consistency
  const result1 = await scMajority.apply(question1, context1);

  console.log(`\n✨ Final Answer (Majority): ${result1.answer}`);
  console.log(`✨ Confidence: ${(result1.confidence! * 100).toFixed(1)}%`);
  console.log(`✨ Verified: ${result1.isVerified}`);

  // Example 2: Weighted Voting
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 2: Weighted Voting\n');

  const question2 = 'If x > 5 and y < 3, can x + y equal 7?';
  const context2 = 'x and y are real numbers.';

  console.log(`Question: ${question2}`);
  console.log(`Context: ${context2}\n`);

  // Initialize Self-Consistency with weighted voting
  const scWeighted = new SelfConsistency(client, reasoningEngine, {
    numSamples: 5,
    temperature: 0.8,
    votingMethod: 'weighted',
  });

  console.log('🔄 Generating 5 reasoning paths with weighted voting...\n');

  const paths2 = await scWeighted.generatePaths(question2, context2);

  console.log('Generated answers (with verification status):');
  paths2.forEach((path, index) => {
    const verified = path.isVerified ? '✓' : '✗';
    console.log(`  ${index + 1}. [${verified}] ${path.answer.substring(0, 70)}...`);
  });

  const result2 = await scWeighted.apply(question2, context2);

  console.log(`\n✨ Final Answer (Weighted): ${result2.answer}`);
  console.log(`✨ Confidence: ${(result2.confidence! * 100).toFixed(1)}%`);
  console.log(`✨ Verified: ${result2.isVerified}`);

  // Example 3: Comparing voting methods
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 3: Comparing Voting Methods\n');

  const question3 = 'Is the empty set a subset of every set?';
  const context3 = 'Set theory fundamentals.';

  console.log(`Question: ${question3}`);
  console.log(`Context: ${context3}\n`);

  console.log('🔄 Comparing majority vs weighted voting...\n');

  // Test with both methods
  const scCompareMajority = new SelfConsistency(client, reasoningEngine, {
    numSamples: 7,
    temperature: 0.7,
    votingMethod: 'majority',
  });

  const scCompareWeighted = new SelfConsistency(client, reasoningEngine, {
    numSamples: 7,
    temperature: 0.7,
    votingMethod: 'weighted',
  });

  const [resultMajority, resultWeighted] = await Promise.all([
    scCompareMajority.apply(question3, context3),
    scCompareWeighted.apply(question3, context3),
  ]);

  console.log('Majority Voting:');
  console.log(`  Answer: ${resultMajority.answer}`);
  console.log(`  Confidence: ${(resultMajority.confidence! * 100).toFixed(1)}%`);
  console.log(`  Execution time: ${resultMajority.executionTime}ms\n`);

  console.log('Weighted Voting:');
  console.log(`  Answer: ${resultWeighted.answer}`);
  console.log(`  Confidence: ${(resultWeighted.confidence! * 100).toFixed(1)}%`);
  console.log(`  Execution time: ${resultWeighted.executionTime}ms`);

  // Example 4: Configuration options
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 4: Configuration Options\n');

  console.log('Testing different numbers of samples:\n');

  const question4 = 'Does correlation imply causation?';
  const context4 = 'Statistics and research methodology.';

  for (const numSamples of [3, 5, 7]) {
    const sc = new SelfConsistency(client, reasoningEngine, {
      numSamples,
      temperature: 0.7,
      votingMethod: 'majority',
    });

    const startTime = Date.now();
    const result = await sc.apply(question4, context4);
    const duration = Date.now() - startTime;

    console.log(`${numSamples} samples:`);
    console.log(`  Confidence: ${(result.confidence! * 100).toFixed(1)}%`);
    console.log(`  Time: ${duration}ms\n`);
  }

  // Example 5: Proof trace inspection
  console.log('\n' + '='.repeat(80));
  console.log('\n📝 Example 5: Proof Trace with Self-Consistency\n');

  const question5 = 'Can a number be both prime and composite?';
  const context5 = 'Number theory definitions.';

  const sc5 = new SelfConsistency(client, reasoningEngine, {
    numSamples: 4,
    temperature: 0.7,
    votingMethod: 'majority',
  });

  const result5 = await sc5.apply(question5, context5);

  console.log('Complete Proof Trace:');
  result5.proof.forEach((step) => {
    console.log(`\n${step.step}. ${step.description}`);
    if (step.response) {
      console.log(`   Response: ${step.response.substring(0, 100)}...`);
    }
  });

  // Display configuration
  console.log('\n\n' + '='.repeat(80));
  console.log('\n⚙️  Configuration Summary\n');

  const config = scMajority.getConfig();
  console.log('Self-Consistency configuration options:');
  console.log(`  • numSamples: ${config.numSamples} (number of reasoning paths)`);
  console.log(`  • temperature: ${config.temperature} (sampling diversity)`);
  console.log(`  • votingMethod: ${config.votingMethod} (majority or weighted)`);

  console.log('\n💡 Tips:');
  console.log('  • Increase numSamples for more reliable answers (but slower)');
  console.log('  • Higher temperature (0.7-0.9) creates more diverse paths');
  console.log('  • Use majority voting for simple questions');
  console.log('  • Use weighted voting when verification quality matters');
  console.log('  • Check confidence scores to gauge answer reliability');

  console.log('\n✨ Self-Consistency example completed!\n');
}

// Run the example
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
