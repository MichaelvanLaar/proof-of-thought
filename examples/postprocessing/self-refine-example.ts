/**
 * Self-Refine Postprocessing Example
 *
 * Demonstrates automatic iterative refinement of reasoning through self-critique
 * using ProofOfThought's integrated postprocessing pipeline.
 *
 * Self-Refine works by:
 * 1. Generating an initial answer
 * 2. Critiquing the answer with the LLM
 * 3. Refining based on critique
 * 4. Repeating until convergence or max iterations
 *
 * Prerequisites:
 * - Set OPENAI_API_KEY environment variable
 * - Install Z3 solver (brew install z3, apt-get install z3, or npm install z3-solver)
 *
 * Run: npx tsx examples/postprocessing/self-refine-example.ts
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

  console.log('🔬 Self-Refine Postprocessing Example\n');
  console.log('This example demonstrates automatic refinement through the postprocessing pipeline.\n');

  // Example 1: Without Self-Refine
  console.log('═'.repeat(60));
  console.log('Example 1: Without Self-Refine (Baseline)');
  console.log('═'.repeat(60));

  const pot = new ProofOfThought({
    client,
    backend: 'smt2',
    verbose: true,
  });

  const question = 'Is the conclusion logically valid?';
  const context = `
    Premise 1: All mammals have hearts.
    Premise 2: All whales are mammals.
    Conclusion: All whales have hearts.
  `;

  console.log('Question:', question);
  console.log('Context:', context.trim());
  console.log();

  const baseResponse = await pot.query(question, context);

  console.log('\n📊 Results (Without Self-Refine):');
  console.log('Answer:', baseResponse.answer);
  console.log('Verified:', baseResponse.isVerified);
  console.log('Execution Time:', `${baseResponse.executionTime}ms`);
  console.log('Proof Steps:', baseResponse.proof.length);
  console.log();

  // Example 2: With Self-Refine
  console.log('═'.repeat(60));
  console.log('Example 2: With Self-Refine (Automatic Refinement)');
  console.log('═'.repeat(60));

  const potWithRefine = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['self-refine'], // Enable automatic self-refine
    selfRefineConfig: {
      maxIterations: 3,
      convergenceThreshold: 0.95,
    },
    verbose: true,
  });

  console.log('Configuration:');
  console.log('  • Postprocessing: self-refine');
  console.log('  • Max Iterations: 3');
  console.log('  • Convergence Threshold: 0.95');
  console.log();

  const refinedResponse = await potWithRefine.query(question, context);

  console.log('\n📊 Results (With Self-Refine):');
  console.log('Answer:', refinedResponse.answer);
  console.log('Verified:', refinedResponse.isVerified);
  console.log('Execution Time:', `${refinedResponse.executionTime}ms`);
  console.log('Proof Steps:', refinedResponse.proof.length);
  console.log();

  // Show refinement iterations
  console.log('🔄 Refinement Process:');
  const refinementSteps = refinedResponse.proof.filter((step) =>
    step.description.includes('Self-Refine')
  );
  if (refinementSteps.length > 0) {
    refinementSteps.forEach((step) => {
      console.log(`  ${step.step}. ${step.description}`);
    });
  } else {
    console.log('  (No refinement iterations - answer was already satisfactory)');
  }
  console.log();

  // Show postprocessing metrics if available
  if (refinedResponse.postprocessingMetrics) {
    const metrics = refinedResponse.postprocessingMetrics;
    console.log('📈 Postprocessing Metrics:');
    console.log(`  • Methods Applied: ${metrics.methodsApplied.join(', ')}`);
    console.log(`  • Base Reasoning Time: ${metrics.baseReasoningTime}ms`);
    console.log(`  • Total Postprocessing Time: ${metrics.totalPostprocessingTime}ms`);
    if (metrics.methodMetrics?.selfRefineIterations !== undefined) {
      console.log(`  • Refinement Iterations: ${metrics.methodMetrics.selfRefineIterations}`);
    }
    console.log();

    console.log('💡 Improvements:');
    console.log(`  • Answer Changed: ${metrics.improvements.answerChanged ? 'Yes' : 'No'}`);
    console.log(`  • Verification Improved: ${metrics.improvements.verificationImproved ? 'Yes' : 'No'}`);
    console.log(`  • Proof Expanded: ${metrics.improvements.proofExpanded ? 'Yes' : 'No'}`);
    console.log();
  }

  // Comparison
  console.log('═'.repeat(60));
  console.log('Comparison');
  console.log('═'.repeat(60));
  console.log('Without Self-Refine:');
  console.log(`  Time: ${baseResponse.executionTime}ms`);
  console.log(`  Steps: ${baseResponse.proof.length}`);
  console.log(`  Answer: ${baseResponse.answer.substring(0, 60)}...`);
  console.log();
  console.log('With Self-Refine:');
  console.log(`  Time: ${refinedResponse.executionTime}ms`);
  console.log(`  Steps: ${refinedResponse.proof.length}`);
  console.log(`  Answer: ${refinedResponse.answer.substring(0, 60)}...`);
  console.log();

  if (baseResponse.answer !== refinedResponse.answer) {
    console.log('✨ Self-Refine improved the answer!');
  } else {
    console.log('✓ Initial answer was already satisfactory (no changes needed)');
  }
  console.log();

  // Example 3: Custom Configuration
  console.log('═'.repeat(60));
  console.log('Example 3: Custom Configuration');
  console.log('═'.repeat(60));

  const potCustom = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['self-refine'],
    selfRefineConfig: {
      maxIterations: 5, // More iterations for complex problems
      convergenceThreshold: 0.90, // Lower threshold = faster convergence
      critiquePrompt: `Evaluate this logical reasoning answer.
Focus on:
1. Logical correctness
2. Clarity and completeness
3. Direct answer to the question

If excellent, start with "SATISFACTORY:".
Otherwise, provide specific critique.`,
    },
    verbose: false,
  });

  const complexQuestion = 'If all A are B, and no B are C, can some A be C?';
  const complexContext = 'Consider set theory and logical negation.';

  console.log('Question:', complexQuestion);
  console.log('Context:', complexContext);
  console.log();
  console.log('Custom Configuration:');
  console.log('  • Max Iterations: 5');
  console.log('  • Convergence Threshold: 0.90');
  console.log('  • Custom Critique Prompt: Yes');
  console.log();

  const customResponse = await potCustom.query(complexQuestion, complexContext);

  console.log('Result:', customResponse.answer);
  console.log('Execution Time:', `${customResponse.executionTime}ms`);
  console.log();

  console.log('✨ Self-Refine example completed!\n');
  console.log('💡 Key Takeaways:');
  console.log('  • Self-refine automatically improves answers through iterative critique');
  console.log('  • Enable with: postprocessing: ["self-refine"]');
  console.log('  • Configure with: selfRefineConfig: { maxIterations, convergenceThreshold, ... }');
  console.log('  • Monitor metrics to track improvements and iterations');
  console.log('  • Works seamlessly with both SMT2 and JSON backends');
  console.log();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
