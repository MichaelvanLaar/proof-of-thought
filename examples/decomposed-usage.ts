/**
 * Decomposed Prompting Example
 *
 * This example demonstrates how to use Decomposed Prompting to break down
 * complex questions into simpler sub-questions, solve them sequentially,
 * and combine the results.
 *
 * Decomposed Prompting works by:
 * 1. Breaking complex questions into 2-5 simpler sub-questions
 * 2. Solving each sub-question sequentially
 * 3. Building context from previous answers
 * 4. Combining all sub-answers into a comprehensive final answer
 *
 * IMPORTANT: ProofOfThought is designed for LOGICAL REASONING, not arithmetic computation.
 * Good questions involve:
 * - Logical deductions (if-then statements)
 * - Set relationships (all, some, none)
 * - Syllogistic reasoning (Socrates is human, all humans are mortal)
 * - Boolean logic (and, or, not)
 *
 * Avoid questions that are purely:
 * - Arithmetic calculations (2 + 2, what is 1/3 of 12)
 * - Algebraic evaluations (if x = 5, what is 2x - 3)
 *
 * Prerequisites:
 * - Set OPENAI_API_KEY environment variable
 * - Install Z3 solver (brew install z3, apt-get install z3, or npm install z3-solver)
 *
 * Run: npx tsx examples/decomposed-usage.ts
 */

import OpenAI from 'openai';
import { ProofOfThought } from '../src/index.js';
import { DecomposedPrompting } from '../src/postprocessing/decomposed.js';

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
    verbose: false, // Disable verbose for cleaner output
  });

  console.log('🔬 Decomposed Prompting Example\n');
  console.log('='.repeat(80));

  // Example 1: Multi-Step Logical Reasoning
  console.log('\n📝 Example 1: Multi-Step Logical Deduction\n');

  const question1 =
    'If all birds can fly, and all penguins are birds, and Tux is a penguin, can Tux fly?';
  const context1 = 'Logical reasoning with universal and particular statements.';

  console.log(`Question: ${question1}`);
  console.log(`Context: ${context1}\n`);

  // Create reasoning engine wrapper
  const reasoningEngine = async (question: string, context: string) => {
    return pot.query(question, context);
  };

  // Initialize Decomposed Prompting
  const decomposed = new DecomposedPrompting(client, reasoningEngine, {
    maxSubQuestions: 5,
  });

  console.log('🔄 Decomposing question into sub-questions...\n');

  // Show the decomposition
  const subQuestions1 = await decomposed.decompose(question1, context1);
  console.log('Generated sub-questions:');
  subQuestions1.forEach((sq, idx) => {
    const deps = sq.dependencies.length > 0 ? ` (depends on: ${sq.dependencies.join(', ')})` : '';
    console.log(`  ${idx + 1}. ${sq.question}${deps}`);
  });

  console.log('\n🔄 Solving sub-questions sequentially...\n');

  // Apply decomposed prompting
  const result1 = await decomposed.apply(question1, context1);

  console.log(`\n✨ Final Answer: ${result1.answer}`);
  console.log(`✨ Verified: ${result1.isVerified}`);
  console.log(`✨ Total execution time: ${result1.executionTime}ms`);
  console.log(`✨ Proof steps: ${result1.proof.length}`);

  // Example 2: Logical Reasoning with Dependencies
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 2: Multi-Step Logical Reasoning\n');

  const question2 =
    'If all mammals are warm-blooded, and all dogs are mammals, and Fido is a dog, what can we conclude about Fido?';
  const context2 = 'Classical syllogistic logic with multiple premises.';

  console.log(`Question: ${question2}`);
  console.log(`Context: ${context2}\n`);

  const decomposed2 = new DecomposedPrompting(client, reasoningEngine);

  const subQuestions2 = await decomposed2.decompose(question2, context2);
  console.log('Sub-questions:');
  subQuestions2.forEach((sq, idx) => {
    console.log(`  ${idx + 1}. ${sq.question}`);
  });

  const result2 = await decomposed2.apply(question2, context2);

  console.log(`\n✨ Final Answer: ${result2.answer}`);

  // Example 3: Complex Multi-Part Question
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 3: Complex Multi-Part Problem\n');

  const question3 =
    'If all doctors are professionals, and all professionals have licenses, and John is a doctor, does John have a license?';
  const context3 = 'Multi-step transitive logical reasoning.';

  console.log(`Question: ${question3}`);
  console.log(`Context: ${context3}\n`);

  const decomposed3 = new DecomposedPrompting(client, reasoningEngine, {
    maxSubQuestions: 4,
  });

  console.log('🔄 Breaking down into sub-problems...\n');

  const result3 = await decomposed3.apply(question3, context3);

  console.log(`\n✨ Final Answer: ${result3.answer}`);
  console.log(`✨ Execution time: ${result3.executionTime}ms`);

  // Example 4: Inspecting the Decomposition Process
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 4: Detailed Decomposition Trace (Logical Reasoning)\n');

  const question4 =
    'If all mammals are warm-blooded, and all whales are mammals, is a whale warm-blooded?';
  const context4 = 'Multi-step logical deduction requiring chain of reasoning.';

  console.log(`Question: ${question4}`);
  console.log(`Context: ${context4}\n`);

  const decomposed4 = new DecomposedPrompting(client, reasoningEngine);

  const result4 = await decomposed4.apply(question4, context4);

  console.log('📋 Complete Proof Trace:\n');
  result4.proof.forEach((step) => {
    console.log(`${step.step}. ${step.description}`);
    if (step.prompt && !step.description.includes('Sub-question')) {
      console.log(`   Prompt: ${step.prompt.substring(0, 60)}...`);
    }
    if (step.response && step.description.includes('Sub-answer')) {
      console.log(`   Answer: ${step.response.substring(0, 80)}...`);
    }
  });

  console.log(`\n✨ Final Answer: ${result4.answer}`);

  // Example 5: Configuration Options
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 5: Custom Configuration\n');

  const question5 =
    'If all birds can fly, and penguins are birds, and penguins cannot fly, is there a contradiction?';
  const context5 = 'Logical consistency check with conflicting statements.';

  console.log(`Question: ${question5}`);
  console.log(`Context: ${context5}`);

  // Limit to 3 sub-questions
  const decomposed5 = new DecomposedPrompting(client, reasoningEngine, {
    maxSubQuestions: 3,
  });

  const subQuestions5 = await decomposed5.decompose(question5, context5);
  console.log(`\nGenerated ${subQuestions5.length} sub-questions (max: 3):`);
  subQuestions5.forEach((sq, idx) => {
    console.log(`  ${idx + 1}. ${sq.question}`);
  });

  const result5 = await decomposed5.apply(question5, context5);

  console.log(`\n✨ Final Answer: ${result5.answer}`);

  // Example 6: Comparing with Direct Query
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 6: Decomposed vs Direct Approach\n');

  const question6 =
    'If all scientists are educated, and some educated people are rich, can we conclude that some scientists are rich?';
  const context6 = 'Logical reasoning with existential and universal quantifiers.';

  console.log(`Question: ${question6}\n`);

  // Direct query
  console.log('Direct approach:');
  const directStart = Date.now();
  const directResult = await pot.query(question6, context6);
  const directTime = Date.now() - directStart;
  console.log(`  Answer: ${directResult.answer.substring(0, 100)}...`);
  console.log(`  Time: ${directTime}ms`);

  // Decomposed query
  console.log('\nDecomposed approach:');
  const decomposed6 = new DecomposedPrompting(client, reasoningEngine);
  const decomposedStart = Date.now();
  const decomposedResult = await decomposed6.apply(question6, context6);
  const decomposedTime = Date.now() - decomposedStart;
  console.log(`  Answer: ${decomposedResult.answer.substring(0, 100)}...`);
  console.log(`  Time: ${decomposedTime}ms`);
  console.log(`  Sub-questions: ${decomposedResult.proof.filter((p) => p.description.includes('Sub-question')).length}`);

  // Display configuration
  console.log('\n\n' + '='.repeat(80));
  console.log('\n⚙️  Configuration Summary\n');

  const config = decomposed.getConfig();
  console.log('Decomposed Prompting configuration options:');
  console.log(`  • maxSubQuestions: ${config.maxSubQuestions} (limit sub-questions generated)`);
  console.log(`  • decompositionPrompt: ${config.decompositionPrompt ? 'custom' : 'default'} (decomposition template)`);

  console.log('\n💡 Tips:');
  console.log('  • Best for complex multi-part questions');
  console.log('  • Sub-questions are solved sequentially with context building');
  console.log('  • Each sub-question can depend on previous answers');
  console.log('  • Final answer synthesizes all sub-answers');
  console.log('  • Trade-off: More LLM calls but better handling of complexity');
  console.log('  • Use maxSubQuestions to control decomposition granularity');

  console.log('\n✨ Decomposed Prompting example completed!\n');
}

// Run the example
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
