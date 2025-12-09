/**
 * Node.js Server Example
 *
 * Demonstrates integrating ProofOfThought into an Express.js server.
 *
 * Run: tsx examples/deployment/nodejs-server-example.ts
 * Test: curl -X POST http://localhost:3000/reason -H "Content-Type: application/json" -d '{"question":"Is Socrates mortal?","context":"All humans are mortal. Socrates is human."}'
 */

import express, { type Request, type Response } from 'express';
import OpenAI from 'openai';
import { ProofOfThought } from '../../src/index.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize ProofOfThought
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pot = new ProofOfThought({
  client,
  backend: 'smt2',
  verbose: false,
});

// Request/Response types
interface ReasoningRequest {
  question: string;
  context: string;
  backend?: 'smt2' | 'json';
}

interface ReasoningResponse {
  answer: string;
  verified: boolean;
  backend: string;
  executionTime: number;
  proof: Array<{ step: number; description: string }>;
}

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reasoning endpoint
app.post('/reason', async (req: Request<{}, {}, ReasoningRequest>, res: Response) => {
  try {
    const { question, context, backend } = req.body;

    // Validation
    if (!question || !context) {
      return res.status(400).json({
        error: 'Missing required fields: question and context',
      });
    }

    // Create instance with requested backend
    const reasoning = backend
      ? new ProofOfThought({ client, backend, verbose: false })
      : pot;

    // Execute reasoning
    const result = await reasoning.query(question, context);

    // Format response
    const response: ReasoningResponse = {
      answer: result.answer,
      verified: result.isVerified,
      backend: result.backend,
      executionTime: result.executionTime,
      proof: result.proof,
    };

    res.json(response);
  } catch (error) {
    console.error('Reasoning error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Batch reasoning endpoint
app.post('/reason/batch', async (req: Request, res: Response) => {
  try {
    const { tasks, parallel = true } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        error: 'Invalid tasks array',
      });
    }

    // Validate tasks format
    for (const task of tasks) {
      if (!task.question || !task.context) {
        return res.status(400).json({
          error: 'Each task must have question and context',
        });
      }
    }

    // Convert to batch format
    const batchTasks: Array<[string, string]> = tasks.map(
      (t: { question: string; context: string }) => [t.question, t.context]
    );

    // Execute batch
    const results = await pot.batch(batchTasks, parallel);

    res.json({
      total: results.length,
      parallel,
      results: results.map((r) => ({
        answer: r.answer,
        verified: r.isVerified,
        executionTime: r.executionTime,
      })),
    });
  } catch (error) {
    console.error('Batch reasoning error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`ProofOfThought Server running on http://localhost:${port}`);
  console.log('\nEndpoints:');
  console.log(`  GET  /health - Health check`);
  console.log(`  POST /reason - Single reasoning task`);
  console.log(`  POST /reason/batch - Batch reasoning tasks`);
  console.log('\nExample:');
  console.log(`  curl -X POST http://localhost:${port}/reason \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"question":"Is Socrates mortal?","context":"All humans are mortal. Socrates is human."}'`);
});
