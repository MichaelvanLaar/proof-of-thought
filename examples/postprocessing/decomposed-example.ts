/**
 * Decomposed Prompting Example
 *
 * Demonstrates breaking complex questions into sub-problems.
 *
 * Run: tsx examples/postprocessing/decomposed-example.ts
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
    verbose: false,
  });

  console.log('Decomposed Prompting Example\n');

  const question = 'Did Julius Caesar know about the Roman Empire?';
  const context = `
    Julius Caesar lived from 100 BCE to 44 BCE.
    The Roman Empire was established in 27 BCE.
    The Roman Republic existed before the Roman Empire.
    Caesar was a leader during the Roman Republic.
  `;

  console.log('Question:', question);
  console.log('Context:', context.trim());
  console.log();

  console.log('═'.repeat(60));
  console.log('Decomposed Approach');
  console.log('═'.repeat(60));

  console.log('Decomposition would:');
  console.log('1. Identify sub-questions');
  console.log('2. Solve each sub-question');
  console.log('3. Combine results');
  console.log();

  console.log('Sub-questions:');
  console.log('  Q1: When did Julius Caesar die?');
  console.log('  Q2: When was the Roman Empire established?');
  console.log('  Q3: Can someone know about events after their death?');
  console.log();

  console.log('Sub-answers:');
  console.log('  A1: Julius Caesar died in 44 BCE');
  console.log('  A2: Roman Empire established in 27 BCE');
  console.log('  A3: No, people cannot know future events');
  console.log();

  console.log('Combined answer:');
  console.log('  No, Julius Caesar could not know about the Roman Empire');
  console.log('  because it was established 17 years after his death.');
  console.log();

  console.log('NOTE: Full decomposed prompting integration coming soon');
}

main();
