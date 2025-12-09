/**
 * Least-to-Most Prompting Example
 *
 * Demonstrates automatic progressive problem-solving through the postprocessing pipeline.
 * Least-to-Most works by:
 * 1. Breaking complex problems into progressive levels (simple → complex)
 * 2. Solving each level sequentially
 * 3. Using solutions from simpler levels to solve more complex ones
 * 4. Synthesizing a final answer from all levels
 *
 * Prerequisites:
 * - Set OPENAI_API_KEY environment variable
 * - Install Z3 solver (brew install z3, apt-get install z3, or npm install z3-solver)
 *
 * Run: npx tsx examples/postprocessing/least-to-most-example.ts
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

  console.log('🔬 Least-to-Most Prompting Example\n');
  console.log('This example demonstrates progressive reasoning through the postprocessing pipeline.\n');

  // Example 1: Without Least-to-Most (Baseline)
  console.log('═'.repeat(60));
  console.log('Example 1: Without Least-to-Most (Baseline)');
  console.log('═'.repeat(60));

  const pot = new ProofOfThought({
    client,
    backend: 'smt2',
    verbose: true,
  });

  const question =
    'If all animals need food, and all living things that need food must consume resources, and all mammals are animals, what can we conclude about mammals?';
  const context = 'Multi-step logical reasoning with transitivity.';

  console.log('Question:', question);
  console.log('Context:', context.trim());
  console.log();

  const baseResponse = await pot.query(question, context);

  console.log('\n📊 Results (Without Least-to-Most):');
  console.log('Answer:', baseResponse.answer);
  console.log('Verified:', baseResponse.isVerified);
  console.log('Execution Time:', `${baseResponse.executionTime}ms`);
  console.log('Proof Steps:', baseResponse.proof.length);
  console.log();

  // Example 2: With Least-to-Most
  console.log('═'.repeat(60));
  console.log('Example 2: With Least-to-Most (Progressive Reasoning)');
  console.log('═'.repeat(60));

  const potWithLTM = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['least-to-most'], // Enable automatic least-to-most
    leastToMostConfig: {
      numLevels: 3,
    },
    verbose: true,
  });

  console.log('Configuration:');
  console.log('  • Postprocessing: least-to-most');
  console.log('  • Number of Levels: 3');
  console.log();

  const ltmResponse = await potWithLTM.query(question, context);

  console.log('\n📊 Results (With Least-to-Most):');
  console.log('Answer:', ltmResponse.answer);
  console.log('Verified:', ltmResponse.isVerified);
  console.log('Execution Time:', `${ltmResponse.executionTime}ms`);
  console.log('Proof Steps:', ltmResponse.proof.length);
  console.log();

  // Show progression levels
  console.log('🔄 Progression Levels:');
  const levelSteps = ltmResponse.proof.filter((step) => step.description.includes('Level'));
  if (levelSteps.length > 0) {
    levelSteps.forEach((step) => {
      console.log(`  ${step.step}. ${step.description}`);
    });
  } else {
    console.log('  (No distinct levels - problem may be simple enough for direct solving)');
  }
  console.log();

  // Show postprocessing metrics if available
  if (ltmResponse.postprocessingMetrics) {
    const metrics = ltmResponse.postprocessingMetrics;
    console.log('📈 Postprocessing Metrics:');
    console.log(`  • Methods Applied: ${metrics.methodsApplied.join(', ')}`);
    console.log(`  • Base Reasoning Time: ${metrics.baseReasoningTime}ms`);
    console.log(`  • Total Postprocessing Time: ${metrics.totalPostprocessingTime}ms`);
    if (metrics.methodMetrics?.leastToMostLevels !== undefined) {
      console.log(`  • Progression Levels: ${metrics.methodMetrics.leastToMostLevels}`);
    }
    console.log();

    console.log('💡 Improvements:');
    console.log(`  • Answer Changed: ${metrics.improvements.answerChanged ? 'Yes' : 'No'}`);
    console.log(`  • Verification Improved: ${metrics.improvements.verificationImproved ? 'Yes' : 'No'}`);
    console.log(`  • Proof Expanded: ${metrics.improvements.proofExpanded ? 'Yes' : 'No'}`);
    console.log();
  }

  // Example 3: Custom Configuration
  console.log('═'.repeat(60));
  console.log('Example 3: Custom Configuration');
  console.log('═'.repeat(60));

  const potCustom = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['least-to-most'],
    leastToMostConfig: {
      numLevels: 4, // More granular progression
      progressionPrompt: `Break this logical reasoning problem into progressive levels.
Start with the simplest logical relationship and build to the final conclusion.

For each level, specify:
- Level number
- The logical question at this level
- Why this level is simpler/more complex than others`,
    },
    verbose: false,
  });

  const complexQuestion =
    'If all birds have feathers, and all creatures with feathers are warm-blooded, and penguins are birds, and warm-blooded creatures regulate their temperature, what can we conclude about penguins?';
  const complexContext = 'Multi-step transitive logical chain.';

  console.log('Question:', complexQuestion);
  console.log('Context:', complexContext);
  console.log();
  console.log('Custom Configuration:');
  console.log('  • Number of Levels: 4 (more granular)');
  console.log('  • Custom Progression Prompt: Yes');
  console.log();

  const customResponse = await potCustom.query(complexQuestion, complexContext);

  console.log('Result:', customResponse.answer);
  console.log('Execution Time:', `${customResponse.executionTime}ms`);
  console.log();

  // Example 4: Comparing Direct vs Progressive
  console.log('═'.repeat(60));
  console.log('Example 4: Direct vs Progressive Comparison');
  console.log('═'.repeat(60));

  const comparisonQuestion =
    'If all philosophers seek truth, and Socrates is a philosopher, and truth seekers question assumptions, does Socrates question assumptions?';
  const comparisonContext = 'Logical chain with multiple implications.';

  console.log('Question:', comparisonQuestion);
  console.log();

  // Direct approach
  console.log('Direct Approach:');
  const potDirect = new ProofOfThought({
    client,
    backend: 'smt2',
    verbose: false,
  });
  const directStart = Date.now();
  const directResult = await potDirect.query(comparisonQuestion, comparisonContext);
  const directTime = Date.now() - directStart;
  console.log(`  Answer: ${directResult.answer.substring(0, 80)}...`);
  console.log(`  Time: ${directTime}ms`);
  console.log(`  Steps: ${directResult.proof.length}`);

  // Progressive approach
  console.log('\nProgressive Approach (Least-to-Most):');
  const potProgressive = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['least-to-most'],
    leastToMostConfig: { numLevels: 3 },
    verbose: false,
  });
  const progressiveStart = Date.now();
  const progressiveResult = await potProgressive.query(comparisonQuestion, comparisonContext);
  const progressiveTime = Date.now() - progressiveStart;
  console.log(`  Answer: ${progressiveResult.answer.substring(0, 80)}...`);
  console.log(`  Time: ${progressiveTime}ms`);
  console.log(`  Steps: ${progressiveResult.proof.length}`);
  console.log();

  if (directResult.answer !== progressiveResult.answer) {
    console.log('✨ Least-to-Most provided a different (potentially more thorough) answer!');
  } else {
    console.log('✓ Both approaches reached the same conclusion');
  }
  console.log();

  // Comparison
  console.log('═'.repeat(60));
  console.log('Summary');
  console.log('═'.repeat(60));
  console.log('Without Least-to-Most:');
  console.log(`  Time: ${baseResponse.executionTime}ms`);
  console.log(`  Steps: ${baseResponse.proof.length}`);
  console.log(`  Answer: ${baseResponse.answer.substring(0, 50)}...`);
  console.log();
  console.log('With Least-to-Most:');
  console.log(`  Time: ${ltmResponse.executionTime}ms`);
  console.log(`  Steps: ${ltmResponse.proof.length}`);
  console.log(`  Answer: ${ltmResponse.answer.substring(0, 50)}...`);
  console.log();

  console.log('✨ Least-to-Most example completed!\n');
  console.log('💡 Key Takeaways:');
  console.log('  • Least-to-Most breaks complex problems into progressive levels');
  console.log('  • Enable with: postprocessing: ["least-to-most"]');
  console.log('  • Configure with: leastToMostConfig: { numLevels, progressionPrompt }');
  console.log('  • Best for problems with clear progression from simple to complex');
  console.log('  • Works seamlessly with both SMT2 and JSON backends');
  console.log();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
