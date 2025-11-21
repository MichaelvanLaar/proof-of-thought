/**
 * Azure OpenAI Example
 *
 * Demonstrates using ProofOfThought with Azure OpenAI Service.
 *
 * Run: tsx examples/deployment/azure-openai-example.ts
 */

import OpenAI from 'openai';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';

async function main() {
  console.log('Azure OpenAI Example\n');

  // Azure OpenAI configuration
  // See: https://learn.microsoft.com/en-us/azure/ai-services/openai/
  const azureConfig = {
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    apiVersion: '2024-02-15-preview',
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
  };

  console.log('Configuration:');
  console.log('  Endpoint:', azureConfig.endpoint || '(not set)');
  console.log('  Deployment:', azureConfig.deployment);
  console.log('  API Version:', azureConfig.apiVersion);
  console.log();

  if (!azureConfig.apiKey || !azureConfig.endpoint) {
    console.log('⚠️  Azure OpenAI credentials not configured');
    console.log('\nSet the following environment variables:');
    console.log('  AZURE_OPENAI_API_KEY - Your Azure OpenAI API key');
    console.log('  AZURE_OPENAI_ENDPOINT - Your Azure OpenAI endpoint');
    console.log('  AZURE_OPENAI_DEPLOYMENT - Your model deployment name (optional)');
    console.log('\nExample:');
    console.log('  export AZURE_OPENAI_API_KEY="your-key"');
    console.log('  export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"');
    console.log('  export AZURE_OPENAI_DEPLOYMENT="gpt-4"');
    return;
  }

  // Create Azure OpenAI client
  const client = new OpenAI({
    apiKey: azureConfig.apiKey,
    baseURL: `${azureConfig.endpoint}/openai/deployments/${azureConfig.deployment}`,
    defaultQuery: { 'api-version': azureConfig.apiVersion },
    defaultHeaders: { 'api-key': azureConfig.apiKey },
  });

  // Create ProofOfThought with Azure client
  const pot = new ProofOfThought({
    client,
    backend: 'smt2',
    model: azureConfig.deployment, // Use deployment name as model
    verbose: true,
  });

  console.log('Testing Azure OpenAI integration...\n');

  const question = 'Is Socrates mortal?';
  const context = 'All humans are mortal. Socrates is human.';

  console.log('Question:', question);
  console.log('Context:', context);
  console.log();

  try {
    const response = await pot.query(question, context);

    console.log('═'.repeat(60));
    console.log('RESULT');
    console.log('═'.repeat(60));
    console.log('Answer:', response.answer);
    console.log('Verified:', response.isVerified);
    console.log('Backend:', response.backend);
    console.log('Execution Time:', `${response.executionTime}ms`);
    console.log('\n✓ Azure OpenAI integration working correctly!');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('\nTroubleshooting:');
    console.log('1. Verify your Azure OpenAI credentials');
    console.log('2. Check that your deployment is active');
    console.log('3. Ensure your API version is supported');
    console.log('4. Verify network connectivity to Azure');
  }
}

main();
