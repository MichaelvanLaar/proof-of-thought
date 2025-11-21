/**
 * Self-Consistency Postprocessing Example
 *
 * Demonstrates multiple reasoning paths with majority voting.
 *
 * Run: tsx examples/postprocessing/self-consistency-example.ts
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

  console.log('Self-Consistency Postprocessing Example\n');

  const question = 'Can a dolphin survive in the Sahara Desert?';
  const context = `
    Dolphins are aquatic mammals.
    Dolphins require water to survive.
    The Sahara Desert is extremely arid with very little water.
  `;

  console.log('Question:', question);
  console.log('Context:', context.trim());
  console.log();

  // Base reasoning
  console.log('═'.repeat(60));
  console.log('Single Reasoning Path');
  console.log('═'.repeat(60));

  const baseResponse = await pot.query(question, context);
  console.log('Answer:', baseResponse.answer);
  console.log('Time:', `${baseResponse.executionTime}ms`);
  console.log();

  // With self-consistency
  console.log('═'.repeat(60));
  console.log('With Self-Consistency Postprocessing');
  console.log('═'.repeat(60));

  console.log('Self-consistency would:');
  console.log('1. Generate N reasoning paths (with temperature > 0)');
  console.log('2. Collect answers from each path');
  console.log('3. Apply majority voting');
  console.log('4. Calculate confidence score');
  console.log();

  console.log('Configuration:');
  console.log('  Number of paths: 5');
  console.log('  Temperature: 0.7');
  console.log('  Voting method: Majority');
  console.log();

  console.log('Expected output:');
  console.log('  Path 1: No (dolphins need water)');
  console.log('  Path 2: No (desert too dry)');
  console.log('  Path 3: No (aquatic mammals need water)');
  console.log('  Path 4: No (incompatible habitat)');
  console.log('  Path 5: No (survival impossible)');
  console.log();
  console.log('  Majority vote: No');
  console.log('  Confidence: 100% (5/5 agree)');
  console.log();

  console.log('NOTE: Full self-consistency integration coming soon');
}

main();
