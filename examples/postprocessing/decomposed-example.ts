/**
 * Decomposed Prompting Example
 *
 * Demonstrates automatic question decomposition through the postprocessing pipeline.
 * Decomposed Prompting works by:
 * 1. Breaking complex questions into 2-5 simpler sub-questions
 * 2. Solving each sub-question sequentially
 * 3. Building context from previous answers
 * 4. Combining all sub-answers into a comprehensive final answer
 *
 * Prerequisites:
 * - Set OPENAI_API_KEY environment variable
 * - Install Z3 solver (brew install z3, apt-get install z3, or npm install z3-solver)
 *
 * Run: npx tsx examples/postprocessing/decomposed-example.ts
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

  console.log('🔬 Decomposed Prompting Example\n');
  console.log('This example demonstrates automatic question decomposition through the postprocessing pipeline.\n');

  // Example 1: Without Decomposition (Baseline)
  console.log('═'.repeat(60));
  console.log('Example 1: Without Decomposition (Baseline)');
  console.log('═'.repeat(60));

  const pot = new ProofOfThought({
    client,
    backend: 'smt2',
    verbose: true,
  });

  const question =
    'If all animals are living beings, and all living beings need energy, and all mammals are animals, do mammals need energy?';
  const context = 'Multi-step transitive logical reasoning.';

  console.log('Question:', question);
  console.log('Context:', context.trim());
  console.log();

  const baseResponse = await pot.query(question, context);

  console.log('\n📊 Results (Without Decomposition):');
  console.log('Answer:', baseResponse.answer);
  console.log('Verified:', baseResponse.isVerified);
  console.log('Execution Time:', `${baseResponse.executionTime}ms`);
  console.log('Proof Steps:', baseResponse.proof.length);
  console.log();

  // Example 2: With Decomposition
  console.log('═'.repeat(60));
  console.log('Example 2: With Decomposition (Automatic)');
  console.log('═'.repeat(60));

  const potWithDecomp = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['decomposed'], // Enable automatic decomposition
    decomposedConfig: {
      maxSubQuestions: 5,
    },
    verbose: true,
  });

  console.log('Configuration:');
  console.log('  • Postprocessing: decomposed');
  console.log('  • Max Sub-Questions: 5');
  console.log();

  const decompResponse = await potWithDecomp.query(question, context);

  console.log('\n📊 Results (With Decomposition):');
  console.log('Answer:', decompResponse.answer);
  console.log('Verified:', decompResponse.isVerified);
  console.log('Execution Time:', `${decompResponse.executionTime}ms`);
  console.log('Proof Steps:', decompResponse.proof.length);
  console.log();

  // Show sub-questions
  console.log('🔄 Sub-Questions Generated:');
  const subQuestionSteps = decompResponse.proof.filter((step) =>
    step.description.includes('Sub-question')
  );
  if (subQuestionSteps.length > 0) {
    subQuestionSteps.forEach((step) => {
      console.log(`  ${step.step}. ${step.description}`);
    });
  } else {
    console.log('  (No sub-questions - problem may be simple enough for direct solving)');
  }
  console.log();

  // Show postprocessing metrics if available
  if (decompResponse.postprocessingMetrics) {
    const metrics = decompResponse.postprocessingMetrics;
    console.log('📈 Postprocessing Metrics:');
    console.log(`  • Methods Applied: ${metrics.methodsApplied.join(', ')}`);
    console.log(`  • Base Reasoning Time: ${metrics.baseReasoningTime}ms`);
    console.log(`  • Total Postprocessing Time: ${metrics.totalPostprocessingTime}ms`);
    if (metrics.methodMetrics?.decomposedSubQuestions !== undefined) {
      console.log(`  • Sub-Questions Generated: ${metrics.methodMetrics.decomposedSubQuestions}`);
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
    postprocessing: ['decomposed'],
    decomposedConfig: {
      maxSubQuestions: 3, // Limit to fewer sub-questions
      decompositionPrompt: `Break this logical reasoning question into simpler sub-questions.
Each sub-question should:
- Focus on a single logical relationship
- Be answerable independently or depend only on previous sub-questions
- Build toward answering the main question

Format each sub-question as:
N. [Question text] (depends on: [list of previous question numbers, if any])`,
    },
    verbose: false,
  });

  const complexQuestion =
    'If all birds have wings, and all creatures with wings can fly, and ostriches are birds, and ostriches cannot fly, is there a logical inconsistency?';
  const complexContext = 'Logical consistency check with contradictory premises.';

  console.log('Question:', complexQuestion);
  console.log('Context:', complexContext);
  console.log();
  console.log('Custom Configuration:');
  console.log('  • Max Sub-Questions: 3 (more focused)');
  console.log('  • Custom Decomposition Prompt: Yes');
  console.log();

  const customResponse = await potCustom.query(complexQuestion, complexContext);

  console.log('Result:', customResponse.answer);
  console.log('Execution Time:', `${customResponse.executionTime}ms`);
  console.log();

  // Example 4: Comparing Direct vs Decomposed
  console.log('═'.repeat(60));
  console.log('Example 4: Direct vs Decomposed Comparison');
  console.log('═'.repeat(60));

  const comparisonQuestion =
    'If all scientists use logic, and all people who use logic are rational, and Marie Curie was a scientist, was Marie Curie rational?';
  const comparisonContext = 'Logical chain reasoning with named individual.';

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

  // Decomposed approach
  console.log('\nDecomposed Approach:');
  const potDecomposed = new ProofOfThought({
    client,
    backend: 'smt2',
    postprocessing: ['decomposed'],
    decomposedConfig: { maxSubQuestions: 4 },
    verbose: false,
  });
  const decomposedStart = Date.now();
  const decomposedResult = await potDecomposed.query(comparisonQuestion, comparisonContext);
  const decomposedTime = Date.now() - decomposedStart;
  console.log(`  Answer: ${decomposedResult.answer.substring(0, 80)}...`);
  console.log(`  Time: ${decomposedTime}ms`);
  console.log(`  Steps: ${decomposedResult.proof.length}`);
  const subQCount = decomposedResult.proof.filter((p) => p.description.includes('Sub-question')).length;
  console.log(`  Sub-Questions: ${subQCount}`);
  console.log();

  if (directResult.answer !== decomposedResult.answer) {
    console.log('✨ Decomposition provided a different (potentially more thorough) answer!');
  } else {
    console.log('✓ Both approaches reached the same conclusion');
  }
  console.log();

  // Comparison
  console.log('═'.repeat(60));
  console.log('Summary');
  console.log('═'.repeat(60));
  console.log('Without Decomposition:');
  console.log(`  Time: ${baseResponse.executionTime}ms`);
  console.log(`  Steps: ${baseResponse.proof.length}`);
  console.log(`  Answer: ${baseResponse.answer.substring(0, 50)}...`);
  console.log();
  console.log('With Decomposition:');
  console.log(`  Time: ${decompResponse.executionTime}ms`);
  console.log(`  Steps: ${decompResponse.proof.length}`);
  console.log(`  Answer: ${decompResponse.answer.substring(0, 50)}...`);
  console.log();

  console.log('✨ Decomposed Prompting example completed!\n');
  console.log('💡 Key Takeaways:');
  console.log('  • Decomposition breaks complex questions into manageable sub-questions');
  console.log('  • Enable with: postprocessing: ["decomposed"]');
  console.log('  • Configure with: decomposedConfig: { maxSubQuestions, decompositionPrompt }');
  console.log('  • Best for complex multi-part questions with logical dependencies');
  console.log('  • Trade-off: More LLM calls but better handling of complexity');
  console.log('  • Works seamlessly with both SMT2 and JSON backends');
  console.log();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
