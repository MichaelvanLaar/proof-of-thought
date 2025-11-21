/**
 * Self-Refine Postprocessing Example
 *
 * This example demonstrates how to use Self-Refine to iteratively improve
 * reasoning answers through LLM critique and refinement.
 *
 * Self-Refine works by:
 * 1. Generating a critique of the current answer
 * 2. Creating an improved answer based on the critique
 * 3. Checking for convergence or satisfaction
 * 4. Repeating until max iterations or convergence
 *
 * Prerequisites:
 * - Set OPENAI_API_KEY environment variable
 * - Install Z3 solver (brew install z3, apt-get install z3, or npm install z3-solver)
 *
 * Run: npx tsx examples/self-refine-usage.ts
 */

import OpenAI from 'openai';
import { ProofOfThought } from '../src/reasoning/proof-of-thought.js';
import { SelfRefine } from '../src/postprocessing/self-refine.js';

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
    verbose: true,
  });

  // Initialize Self-Refine with custom configuration
  const selfRefine = new SelfRefine(client, {
    maxIterations: 3,
    convergenceThreshold: 0.90,
    // Custom critique prompt (optional)
    // critiquePrompt: 'Your custom prompt here...'
  });

  console.log('🔬 Self-Refine Postprocessing Example\n');
  console.log('=' .repeat(80));

  // Example 1: Refining a simple logical deduction
  console.log('\n📝 Example 1: Syllogistic Reasoning\n');

  const question1 = 'Is Socrates mortal?';
  const context1 = `
    All humans are mortal.
    Socrates is a human.
  `;

  console.log(`Question: ${question1}`);
  console.log(`Context: ${context1.trim()}`);
  console.log('\n🔄 Running initial reasoning...\n');

  const response1 = await pot.query(question1, context1);

  console.log(`\n✓ Initial Answer: ${response1.answer}`);
  console.log(`✓ Verified: ${response1.isVerified}`);
  console.log(`✓ Execution Time: ${response1.executionTime}ms`);

  console.log('\n🔄 Applying Self-Refine...\n');

  const refined1 = await selfRefine.refine(response1, question1, context1);

  console.log(`\n✨ Refined Answer: ${refined1.answer}`);
  console.log(`✨ Total Proof Steps: ${refined1.proof.length}`);
  console.log('\n📋 Refinement History:');
  refined1.proof
    .filter((step) => step.description.includes('Self-Refine'))
    .forEach((step) => {
      console.log(`   ${step.step}. ${step.description}`);
    });

  // Example 2: Refining mathematical reasoning
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 2: Mathematical Reasoning\n');

  const question2 = 'If x > 5 and y < 3, is x + y always greater than 7?';
  const context2 = 'x and y are real numbers.';

  console.log(`Question: ${question2}`);
  console.log(`Context: ${context2}`);
  console.log('\n🔄 Running initial reasoning...\n');

  const response2 = await pot.query(question2, context2);

  console.log(`\n✓ Initial Answer: ${response2.answer}`);
  console.log(`✓ Verified: ${response2.isVerified}`);

  console.log('\n🔄 Applying Self-Refine...\n');

  const refined2 = await selfRefine.refine(response2, question2, context2);

  console.log(`\n✨ Refined Answer: ${refined2.answer}`);

  // Show how answer evolved
  console.log('\n📊 Answer Evolution:');
  console.log(`   Original:  "${response2.answer}"`);
  console.log(`   Refined:   "${refined2.answer}"`);

  // Example 3: Configuration options
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 3: Custom Configuration\n');

  // Create Self-Refine with different settings
  const aggressiveRefine = new SelfRefine(client, {
    maxIterations: 5, // More iterations
    convergenceThreshold: 0.95, // Higher threshold (stricter convergence)
  });

  const question3 = 'Can a set be a member of itself?';
  const context3 = 'Consider the implications of Russells paradox.';

  console.log(`Question: ${question3}`);
  console.log(`Context: ${context3}`);
  console.log('Configuration: maxIterations=5, convergenceThreshold=0.95');

  const response3 = await pot.query(question3, context3);
  console.log(`\n✓ Initial Answer: ${response3.answer}`);

  console.log('\n🔄 Applying aggressive refinement...\n');
  const refined3 = await aggressiveRefine.refine(response3, question3, context3);

  console.log(`\n✨ Refined Answer: ${refined3.answer}`);

  const refinementCount = refined3.proof.filter((p) =>
    p.description.includes('Self-Refine iteration')
  ).length;
  console.log(`✨ Number of refinement iterations: ${refinementCount}`);

  // Example 4: Inspecting the refinement process
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 Example 4: Detailed Refinement Trace\n');

  const question4 = 'Is the statement "This statement is false" true or false?';
  const context4 = 'Consider logical paradoxes and self-reference.';

  console.log(`Question: ${question4}`);
  console.log(`Context: ${context4}`);

  const response4 = await pot.query(question4, context4);
  const refined4 = await selfRefine.refine(response4, question4, context4);

  console.log('\n📋 Complete Proof Trace:');
  refined4.proof.forEach((step, index) => {
    console.log(`\n${index + 1}. ${step.description}`);
    if (step.response) {
      console.log(`   Response: ${step.response.substring(0, 100)}...`);
    }
    if (step.formula) {
      console.log(`   Formula: ${step.formula.substring(0, 80)}...`);
    }
  });

  // Display configuration
  console.log('\n\n' + '='.repeat(80));
  console.log('\n⚙️  Configuration Options\n');

  const config = selfRefine.getConfig();
  console.log('Current Self-Refine configuration:');
  console.log(`  • maxIterations: ${config.maxIterations}`);
  console.log(`  • convergenceThreshold: ${config.convergenceThreshold}`);
  console.log(`  • critiquePrompt: ${config.critiquePrompt ? 'custom' : 'default'}`);

  console.log('\n💡 Tips:');
  console.log('  • Increase maxIterations for complex reasoning tasks');
  console.log('  • Lower convergenceThreshold for faster refinement');
  console.log('  • Provide custom critiquePrompt for domain-specific evaluation');
  console.log('  • Monitor proof traces to understand the refinement process');

  console.log('\n✨ Self-Refine example completed!\n');
}

// Run the example
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
