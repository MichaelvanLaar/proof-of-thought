/**
 * Tests for Least-to-Most Postprocessing
 */

import { describe, it, expect, vi } from 'vitest';
import { LeastToMost } from '../../src/postprocessing/least-to-most.js';
import type { ReasoningResponse } from '../../src/types/index.js';
import type OpenAI from 'openai';

// Helper to create sample reasoning response
function createSampleResponse(
  answer: string,
  isVerified = true
): ReasoningResponse {
  return {
    answer,
    formula: '(assert true)',
    proof: [
      {
        step: 1,
        description: 'Sample proof step',
      },
    ],
    isVerified,
    backend: 'smt2',
    executionTime: 100,
  };
}

// Mock OpenAI client
function createMockOpenAIClient(responses: string[]): OpenAI {
  let callCount = 0;
  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async () => {
          const response = responses[callCount] || responses[responses.length - 1] || '';
          callCount++;
          return {
            choices: [
              {
                message: {
                  content: response,
                },
              },
            ],
          };
        }),
      },
    },
  } as unknown as OpenAI;
}

describe('LeastToMost', () => {
  describe('constructor', () => {
    it('should initialize with default config', () => {
      const client = createMockOpenAIClient([]);
      const reasoningEngine = vi.fn().mockResolvedValue(createSampleResponse('test'));

      const leastToMost = new LeastToMost(client, reasoningEngine);
      const config = leastToMost.getConfig();

      expect(config.numLevels).toBe(3);
      expect(config.progressionPrompt).toBeUndefined();
    });

    it('should initialize with custom config', () => {
      const client = createMockOpenAIClient([]);
      const reasoningEngine = vi.fn().mockResolvedValue(createSampleResponse('test'));

      const leastToMost = new LeastToMost(client, reasoningEngine, {
        numLevels: 5,
        progressionPrompt: 'Custom prompt',
      });
      const config = leastToMost.getConfig();

      expect(config.numLevels).toBe(5);
      expect(config.progressionPrompt).toBe('Custom prompt');
    });
  });

  describe('apply', () => {
    it('should apply least-to-most prompting', async () => {
      const progressionResponse = `1. [Complexity: simple] What is 2 + 2?
2. [Complexity: medium] What is (2 + 2) * 3?
3. [Complexity: complex] What is ((2 + 2) * 3) - 5?`;

      const synthesisResponse = 'The final answer is 7, calculated progressively from 4, then 12, then 7.';

      const client = createMockOpenAIClient([
        progressionResponse,
        synthesisResponse,
      ]);

      const reasoningEngine = vi.fn()
        .mockResolvedValueOnce(createSampleResponse('4'))
        .mockResolvedValueOnce(createSampleResponse('12'))
        .mockResolvedValueOnce(createSampleResponse('7'));

      const leastToMost = new LeastToMost(client, reasoningEngine);

      const result = await leastToMost.apply(
        'What is ((2 + 2) * 3) - 5?',
        'Math problem'
      );

      expect(result.answer).toContain('7');
      expect(result.proof.length).toBeGreaterThan(0);
      expect(result.isVerified).toBe(true);
      expect(reasoningEngine).toHaveBeenCalledTimes(3);
    });

    it('should build progressive context', async () => {
      const progressionResponse = `1. [Complexity: simple] Level 1
2. [Complexity: medium] Level 2`;

      const synthesisResponse = 'Final';

      const client = createMockOpenAIClient([progressionResponse, synthesisResponse]);

      const reasoningEngine = vi.fn()
        .mockResolvedValueOnce(createSampleResponse('Answer 1'))
        .mockResolvedValueOnce(createSampleResponse('Answer 2'));

      const leastToMost = new LeastToMost(client, reasoningEngine, { numLevels: 2 });

      await leastToMost.apply('Question', 'Context');

      // Check that the second call has context from the first
      const secondCall = reasoningEngine.mock.calls[1];
      expect(secondCall).toBeDefined();
      expect(secondCall![1]).toContain('Previous Solutions');
      expect(secondCall![1]).toContain('Answer 1');
    });

    it('should handle empty progression', async () => {
      const client = createMockOpenAIClient(['']); // Empty response
      const reasoningEngine = vi.fn().mockResolvedValue(createSampleResponse('test'));

      const leastToMost = new LeastToMost(client, reasoningEngine);

      await expect(
        leastToMost.apply('Question', 'Context')
      ).rejects.toThrow();
    });

    it('should handle reasoning engine errors', async () => {
      const progressionResponse = `1. [Complexity: simple] Level 1`;

      const client = createMockOpenAIClient([progressionResponse]);
      const reasoningEngine = vi.fn().mockRejectedValue(new Error('Reasoning failed'));

      const leastToMost = new LeastToMost(client, reasoningEngine);

      await expect(
        leastToMost.apply('Question', 'Context')
      ).rejects.toThrow();
    });
  });

  describe('progression identification', () => {
    it('should parse progression levels correctly', async () => {
      const progressionResponse = `1. [Complexity: simple] Simple question
2. [Complexity: medium] Medium question
3. [Complexity: complex] Complex question`;

      const synthesisResponse = 'Final answer';

      const client = createMockOpenAIClient([progressionResponse, synthesisResponse]);

      const reasoningEngine = vi.fn()
        .mockResolvedValueOnce(createSampleResponse('A1'))
        .mockResolvedValueOnce(createSampleResponse('A2'))
        .mockResolvedValueOnce(createSampleResponse('A3'));

      const leastToMost = new LeastToMost(client, reasoningEngine);

      const result = await leastToMost.apply('Question', 'Context');

      // Check that all three levels were processed
      expect(reasoningEngine).toHaveBeenCalledTimes(3);

      // Check proof contains all levels
      const proofText = result.proof.map((p) => p.description).join(' ');
      expect(proofText).toContain('Level 1');
      expect(proofText).toContain('Level 2');
      expect(proofText).toContain('Level 3');
      expect(proofText).toContain('simple');
      expect(proofText).toContain('medium');
      expect(proofText).toContain('complex');
    });

    it('should handle mixed formatting in progression', async () => {
      const progressionResponse = `1) [Complexity: simple] Question 1
2. [Complexity: medium] Question 2
3) [Complexity: complex] Question 3`;

      const synthesisResponse = 'Final';

      const client = createMockOpenAIClient([progressionResponse, synthesisResponse]);

      const reasoningEngine = vi.fn()
        .mockResolvedValue(createSampleResponse('Answer'));

      const leastToMost = new LeastToMost(client, reasoningEngine);

      await leastToMost.apply('Question', 'Context');

      expect(reasoningEngine).toHaveBeenCalledTimes(3);
    });

    it('should sort levels by number', async () => {
      // Out of order
      const progressionResponse = `3. [Complexity: complex] Third
1. [Complexity: simple] First
2. [Complexity: medium] Second`;

      const synthesisResponse = 'Final';

      const client = createMockOpenAIClient([progressionResponse, synthesisResponse]);

      const callOrder: string[] = [];
      const reasoningEngine = vi.fn().mockImplementation(async (question: string) => {
        callOrder.push(question);
        return createSampleResponse('Answer');
      });

      const leastToMost = new LeastToMost(client, reasoningEngine);

      await leastToMost.apply('Question', 'Context');

      // Should be called in sorted order: First, Second, Third
      expect(callOrder[0]).toContain('First');
      expect(callOrder[1]).toContain('Second');
      expect(callOrder[2]).toContain('Third');
    });
  });

  describe('synthesis', () => {
    it('should synthesize final answer from levels', async () => {
      const progressionResponse = `1. [Complexity: simple] Level 1
2. [Complexity: medium] Level 2`;

      const synthesisResponse = 'Synthesized final answer based on progressive levels';

      const client = createMockOpenAIClient([progressionResponse, synthesisResponse]);

      const reasoningEngine = vi.fn()
        .mockResolvedValueOnce(createSampleResponse('A1'))
        .mockResolvedValueOnce(createSampleResponse('A2'));

      const leastToMost = new LeastToMost(client, reasoningEngine, { numLevels: 2 });

      const result = await leastToMost.apply('Question', 'Context');

      expect(result.answer).toBe('Synthesized final answer based on progressive levels');
    });

    it('should fallback to last answer if synthesis fails', async () => {
      const progressionResponse = `1. [Complexity: simple] Level 1`;

      const client = createMockOpenAIClient([progressionResponse]);
      // Mock synthesis to throw error
      client.chat.completions.create = vi.fn()
        .mockResolvedValueOnce({
          choices: [{ message: { content: progressionResponse } }],
        })
        .mockRejectedValueOnce(new Error('Synthesis failed'));

      const reasoningEngine = vi.fn()
        .mockResolvedValue(createSampleResponse('Last answer'));

      const leastToMost = new LeastToMost(client, reasoningEngine);

      const result = await leastToMost.apply('Question', 'Context');

      expect(result.answer).toBe('Last answer');
    });
  });

  describe('proof construction', () => {
    it('should include all level proofs in final proof', async () => {
      const progressionResponse = `1. [Complexity: simple] L1
2. [Complexity: medium] L2`;

      const synthesisResponse = 'Final';

      const client = createMockOpenAIClient([progressionResponse, synthesisResponse]);

      const reasoningEngine = vi.fn()
        .mockResolvedValueOnce({
          ...createSampleResponse('A1'),
          proof: [
            { step: 1, description: 'L1 Step 1' },
            { step: 2, description: 'L1 Step 2' },
          ],
        })
        .mockResolvedValueOnce({
          ...createSampleResponse('A2'),
          proof: [
            { step: 1, description: 'L2 Step 1' },
          ],
        });

      const leastToMost = new LeastToMost(client, reasoningEngine, { numLevels: 2 });

      const result = await leastToMost.apply('Question', 'Context');

      // Check proof includes steps from both levels
      const proofText = result.proof.map((p) => p.description).join('\n');
      expect(proofText).toContain('L1 Step 1');
      expect(proofText).toContain('L1 Step 2');
      expect(proofText).toContain('L2 Step 1');
      expect(proofText).toContain('Synthesized final answer');
    });

    it('should track verification status across levels', async () => {
      const progressionResponse = `1. [Complexity: simple] L1
2. [Complexity: medium] L2`;

      const synthesisResponse = 'Final';

      const client = createMockOpenAIClient([progressionResponse, synthesisResponse]);

      const reasoningEngine = vi.fn()
        .mockResolvedValueOnce(createSampleResponse('A1', true))
        .mockResolvedValueOnce(createSampleResponse('A2', false));

      const leastToMost = new LeastToMost(client, reasoningEngine, { numLevels: 2 });

      const result = await leastToMost.apply('Question', 'Context');

      // Should be false if any level is unverified
      expect(result.isVerified).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should update config', () => {
      const client = createMockOpenAIClient([]);
      const reasoningEngine = vi.fn().mockResolvedValue(createSampleResponse('test'));

      const leastToMost = new LeastToMost(client, reasoningEngine, { numLevels: 3 });

      leastToMost.setConfig({ numLevels: 5 });
      const config = leastToMost.getConfig();

      expect(config.numLevels).toBe(5);
    });

    it('should return readonly config', () => {
      const client = createMockOpenAIClient([]);
      const reasoningEngine = vi.fn().mockResolvedValue(createSampleResponse('test'));

      const leastToMost = new LeastToMost(client, reasoningEngine);
      const config = leastToMost.getConfig();

      expect(config).toBeDefined();
      expect(config.numLevels).toBe(3);
    });
  });
});
