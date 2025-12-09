/**
 * Self-Consistency Postprocessing Example
 *
 * Demonstrates automatic answer reliability improvement through the postprocessing pipeline.
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
 * Run: npx tsx examples/postprocessing/self-consistency-example.ts
 */

import OpenAI from 'openai';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';

async function main() {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required');
    console.error('   Set it with: export OPENAI_API_KEY="your-key-here"');
    process.exit(1);
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  console.log('🔬 Self-Consistency Postprocessing Example\n');
  console.log('This example demonstrates answer reliability improvement through the postprocessing pipeline.\n');

  // Example 1: Without Self-Consistency (Baseline)
  console.log('═'.repeat(60));
  console.log('Example 1: Without Self-Consistency (Baseline)');
  console.log('═'.repeat(60));

  const pot = new ProofOfThought({
    client,
    backend: 'smt2',
    verbose: true,
  });

  const question =
    'If all mammals are warm-blooded, and all dogs are mammals, is a dog warm-blooded?';
  const context = 'Classical syllogistic logic with universal quantifiers.';

  console.log('Question:', question);
  console.log('Context:', context.trim());
  console.log();

  const baseResponse = await pot.query(question, context);

  console.log('\n📊 Results (Without Self-Consistency):');
  console.log('Answer:', baseResponse.answer);
  console.log('Verified:', baseResponse.isVerified);
  console.log('Execution Time:', `${baseResponse.executionTime}ms`);
  console.log('Proof Steps:', baseResponse.proof.length);
  console.log();

  // Example 2: With Self-Consistency (Majority Voting)
  console.log('═'.repeat(60));
  console.log('Example 2: With Self-Consistency (Majority Voting)');
  console.log('═'.repeat(60));

  const potWithSC = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['self-consistency'], // Enable automatic self-consistency
    selfConsistencyConfig: {
      numSamples: 5,
      temperature: 0.7,
      votingMethod: 'majority',
    },
    verbose: true,
  });

  console.log('Configuration:');
  console.log('  • Postprocessing: self-consistency');
  console.log('  • Number of Samples: 5');
  console.log('  • Temperature: 0.7');
  console.log('  • Voting Method: majority');
  console.log();

  const scResponse = await potWithSC.query(question, context);

  console.log('\n📊 Results (With Self-Consistency):');
  console.log('Answer:', scResponse.answer);
  console.log('Verified:', scResponse.isVerified);
  console.log('Execution Time:', `${scResponse.executionTime}ms`);
  console.log('Proof Steps:', scResponse.proof.length);
  console.log();

  // Show postprocessing metrics if available
  if (scResponse.postprocessingMetrics) {
    const metrics = scResponse.postprocessingMetrics;
    console.log('📈 Postprocessing Metrics:');
    console.log(`  • Methods Applied: ${metrics.methodsApplied.join(', ')}`);
    console.log(`  • Base Reasoning Time: ${metrics.baseReasoningTime}ms`);
    console.log(`  • Total Postprocessing Time: ${metrics.totalPostprocessingTime}ms`);
    if (metrics.methodMetrics?.selfConsistencySamples !== undefined) {
      console.log(`  • Samples Generated: ${metrics.methodMetrics.selfConsistencySamples}`);
    }
    if (metrics.methodMetrics?.selfConsistencyConfidence !== undefined) {
      console.log(`  • Confidence: ${(metrics.methodMetrics.selfConsistencyConfidence * 100).toFixed(1)}%`);
    }
    console.log();

    console.log('💡 Improvements:');
    console.log(`  • Answer Changed: ${metrics.improvements.answerChanged ? 'Yes' : 'No'}`);
    console.log(`  • Verification Improved: ${metrics.improvements.verificationImproved ? 'Yes' : 'No'}`);
    console.log(`  • Proof Expanded: ${metrics.improvements.proofExpanded ? 'Yes' : 'No'}`);
    console.log();
  }

  // Example 3: Weighted Voting
  console.log('═'.repeat(60));
  console.log('Example 3: Weighted Voting (Verification-Based)');
  console.log('═'.repeat(60));

  const potWeighted = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['self-consistency'],
    selfConsistencyConfig: {
      numSamples: 5,
      temperature: 0.7,
      votingMethod: 'weighted', // Weight by verification status
    },
    verbose: false,
  });

  const question2 =
    'If all cats are animals, and some animals are pets, does that mean all cats are pets?';
  const context2 = 'Logical reasoning with universal and existential quantifiers.';

  console.log('Question:', question2);
  console.log('Context:', context2);
  console.log();
  console.log('Configuration:');
  console.log('  • Voting Method: weighted (verified answers count more)');
  console.log('  • Number of Samples: 5');
  console.log('  • Temperature: 0.7');
  console.log();

  const weightedResponse = await potWeighted.query(question2, context2);

  console.log('Result:', weightedResponse.answer);
  console.log('Verified:', weightedResponse.isVerified);
  console.log('Execution Time:', `${weightedResponse.executionTime}ms`);
  console.log();

  // Example 4: Comparing Voting Methods
  console.log('═'.repeat(60));
  console.log('Example 4: Comparing Voting Methods');
  console.log('═'.repeat(60));

  const comparisonQuestion =
    'If no birds are fish, and all penguins are birds, can a penguin be a fish?';
  const comparisonContext = 'Logical reasoning with negation and set disjointness.';

  console.log('Question:', comparisonQuestion);
  console.log();

  // Majority voting
  console.log('Majority Voting:');
  const potMajority = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['self-consistency'],
    selfConsistencyConfig: {
      numSamples: 5,
      temperature: 0.7,
      votingMethod: 'majority',
    },
    verbose: false,
  });
  const majorityStart = Date.now();
  const majorityResult = await potMajority.query(comparisonQuestion, comparisonContext);
  const majorityTime = Date.now() - majorityStart;
  console.log(`  Answer: ${majorityResult.answer.substring(0, 80)}...`);
  console.log(`  Time: ${majorityTime}ms`);
  console.log(`  Steps: ${majorityResult.proof.length}`);

  // Weighted voting
  console.log('\nWeighted Voting:');
  const potWeightedComp = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['self-consistency'],
    selfConsistencyConfig: {
      numSamples: 5,
      temperature: 0.7,
      votingMethod: 'weighted',
    },
    verbose: false,
  });
  const weightedStart = Date.now();
  const weightedResult = await potWeightedComp.query(comparisonQuestion, comparisonContext);
  const weightedTime = Date.now() - weightedStart;
  console.log(`  Answer: ${weightedResult.answer.substring(0, 80)}...`);
  console.log(`  Time: ${weightedTime}ms`);
  console.log(`  Steps: ${weightedResult.proof.length}`);
  console.log();

  if (majorityResult.answer !== weightedResult.answer) {
    console.log('✨ Voting methods produced different answers!');
    console.log('   Weighted voting may prefer verified answers over majority.');
  } else {
    console.log('✓ Both voting methods reached the same conclusion');
  }
  console.log();

  // Comparison
  console.log('═'.repeat(60));
  console.log('Summary');
  console.log('═'.repeat(60));
  console.log('Without Self-Consistency:');
  console.log(`  Time: ${baseResponse.executionTime}ms`);
  console.log(`  Steps: ${baseResponse.proof.length}`);
  console.log(`  Answer: ${baseResponse.answer.substring(0, 50)}...`);
  console.log();
  console.log('With Self-Consistency:');
  console.log(`  Time: ${scResponse.executionTime}ms`);
  console.log(`  Steps: ${scResponse.proof.length}`);
  console.log(`  Answer: ${scResponse.answer.substring(0, 50)}...`);
  console.log();

  console.log('✨ Self-Consistency example completed!\n');
  console.log('💡 Key Takeaways:');
  console.log('  • Self-Consistency improves answer reliability through multiple paths');
  console.log('  • Enable with: postprocessing: ["self-consistency"]');
  console.log('  • Configure with: selfConsistencyConfig: { numSamples, temperature, votingMethod }');
  console.log('  • Majority voting: Simple vote count');
  console.log('  • Weighted voting: Prioritizes verified answers');
  console.log('  • Trade-off: More LLM calls but higher confidence answers');
  console.log('  • Works seamlessly with both SMT2 and JSON backends');
  console.log();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
