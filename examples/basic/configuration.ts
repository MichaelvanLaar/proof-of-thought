/**
 * ProofOfThought Configuration Example
 *
 * Shows how to configure ProofOfThought with various options.
 *
 * Run: tsx examples/basic/configuration.ts
 */

import OpenAI from 'openai';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';

async function main() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Example 1: Minimal configuration (uses defaults)
  console.log('Example 1: Minimal Configuration');
  const pot1 = new ProofOfThought({
    client,
  });
  console.log('Backend:', pot1.getBackendType());
  console.log('Config:', pot1.getConfig());
  console.log();

  // Example 2: Custom configuration
  console.log('Example 2: Custom Configuration');
  const pot2 = new ProofOfThought({
    client,
    backend: 'json', // Use JSON backend instead of SMT2
    model: 'gpt-5.1', // Explicitly specify model (default is also 'gpt-5.1')
    temperature: 0.5, // Add some randomness
    maxTokens: 2048, // Limit response size
    z3Timeout: 60000, // 60 second timeout for Z3
    verbose: true, // Enable logging
  });
  console.log('Backend:', pot2.getBackendType());
  console.log('Config:', {
    backend: pot2.getConfig().backend,
    model: pot2.getConfig().model,
    temperature: pot2.getConfig().temperature,
    maxTokens: pot2.getConfig().maxTokens,
  });
  console.log();

  // Example 3: Different backends comparison
  console.log('Example 3: Backend Comparison');
  const question = 'Is x greater than 10?';
  const context = 'x = 15';

  console.log('Question:', question);
  console.log('Context:', context);
  console.log();

  // SMT2 backend
  const potSMT2 = new ProofOfThought({
    client,
    backend: 'smt2',
  });

  console.log('Using SMT2 backend...');
  try {
    const responseSMT2 = await potSMT2.query(question, context);
    console.log('  Result:', responseSMT2.answer);
    console.log('  Time:', `${responseSMT2.executionTime}ms`);
  } catch (error) {
    console.log('  Error:', error instanceof Error ? error.message : error);
  }
  console.log();

  // JSON backend
  const potJSON = new ProofOfThought({
    client,
    backend: 'json',
  });

  console.log('Using JSON backend...');
  try {
    const responseJSON = await potJSON.query(question, context);
    console.log('  Result:', responseJSON.answer);
    console.log('  Time:', `${responseJSON.executionTime}ms`);
  } catch (error) {
    console.log('  Error:', error instanceof Error ? error.message : error);
  }
}

main();
