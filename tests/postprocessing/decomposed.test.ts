/**
 * Tests for Decomposed Prompting postprocessing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type OpenAI from 'openai';
import { DecomposedPrompting } from '../../src/postprocessing/decomposed.js';
import type { ReasoningResponse } from '../../src/types/index.js';
import { PostprocessingError } from '../../src/types/errors.js';

/**
 * Create a sample reasoning response for testing
 */
function createSampleResponse(
  answer: string,
  isVerified = true,
  executionTime = 100
): ReasoningResponse {
  return {
    answer,
    formula: '(declare-const x Int)\n(assert (= x 5))\n(check-sat)',
    proof: [
      { step: 1, description: 'Translating', prompt: 'test' },
      { step: 2, description: 'Answer generated', response: answer },
    ],
    isVerified,
    backend: 'smt2',
    executionTime,
  };
}

/**
 * Create mock OpenAI client
 */
function createMockOpenAIClient(responses: string[]): OpenAI {
  let callCount = 0;

  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async () => {
          const response = responses[callCount % responses.length];
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

describe('DecomposedPrompting', () => {
  describe('decompose()', () => {
    it('should decompose complex question into sub-questions', async () => {
      const mockClient = createMockOpenAIClient([
        `1. What is a prime number?
2. Is 2 a prime number? (depends on: 1)
3. Is 7 a prime number? (depends on: 1)`,
      ]);

      const mockEngine = vi.fn();
      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const subQuestions = await decomposed.decompose(
        'Are 2 and 7 prime numbers?',
        'Number theory'
      );

      expect(subQuestions).toHaveLength(3);
      expect(subQuestions[0]?.question).toContain('prime number');
      expect(subQuestions[1]?.dependencies).toContain(1);
      expect(subQuestions[2]?.dependencies).toContain(1);
    });

    it('should parse sub-questions with various formats', async () => {
      const mockClient = createMockOpenAIClient([
        `1) First question
2. Second question (depends on: 1)
3) Third question`,
      ]);

      const mockEngine = vi.fn();
      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const subQuestions = await decomposed.decompose('Complex question', 'Context');

      expect(subQuestions).toHaveLength(3);
      expect(subQuestions[0]?.order).toBe(1);
      expect(subQuestions[1]?.order).toBe(2);
      expect(subQuestions[2]?.order).toBe(3);
    });

    it('should limit sub-questions to maxSubQuestions', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Question 1
2. Question 2
3. Question 3
4. Question 4
5. Question 5
6. Question 6
7. Question 7`,
      ]);

      const mockEngine = vi.fn();
      const decomposed = new DecomposedPrompting(mockClient, mockEngine, {
        maxSubQuestions: 3,
      });

      const subQuestions = await decomposed.decompose('Complex question', 'Context');

      expect(subQuestions).toHaveLength(3);
    });

    it('should handle multiple dependencies', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Question 1
2. Question 2
3. Question 3 (depends on: 1, 2)`,
      ]);

      const mockEngine = vi.fn();
      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const subQuestions = await decomposed.decompose('Complex question', 'Context');

      expect(subQuestions[2]?.dependencies).toEqual([1, 2]);
    });

    it('should throw error if LLM returns no content', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: null } }],
            }),
          },
        },
      } as unknown as OpenAI;

      const mockEngine = vi.fn();
      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      await expect(decomposed.decompose('Question?', 'Context')).rejects.toThrow(
        PostprocessingError
      );
    });
  });

  describe('apply()', () => {
    it('should apply decomposed prompting end-to-end', async () => {
      // Mock LLM responses: decomposition, then combination
      const mockClient = createMockOpenAIClient([
        `1. What defines a prime number?
2. Is 17 divisible by any number other than 1 and itself?`,
        `17 is a prime number because it is only divisible by 1 and 17 itself, matching the definition of a prime number.`,
      ]);

      // Mock reasoning engine responses for each sub-question
      let subQuestionCount = 0;
      const mockEngine = vi.fn().mockImplementation(async (question: string) => {
        const answers = [
          'A prime number is a natural number greater than 1 that is only divisible by 1 and itself.',
          'No, 17 is only divisible by 1 and 17.',
        ];
        return createSampleResponse(answers[subQuestionCount++] || 'Answer');
      });

      const decomposed = new DecomposedPrompting(mockClient, mockEngine, {
        maxSubQuestions: 3,
      });

      const result = await decomposed.apply('Is 17 a prime number?', 'Number theory');

      expect(result.answer).toContain('prime number');
      expect(result.proof.some((p) => p.description.includes('Decomposed Prompting'))).toBe(true);
      expect(mockEngine).toHaveBeenCalledTimes(2); // 2 sub-questions solved
    });

    it('should enrich context with previous answers for dependent questions', async () => {
      const mockClient = createMockOpenAIClient([
        `1. What is 5 + 3?
2. What is the result from step 1 multiplied by 2? (depends on: 1)`,
        `The final answer is 16.`,
      ]);

      let callCount = 0;
      const mockEngine = vi.fn().mockImplementation(async (question: string, context: string) => {
        if (callCount === 0) {
          callCount++;
          return createSampleResponse('8');
        } else {
          // Second call should have enriched context
          expect(context).toContain('Previous findings');
          expect(context).toContain('What is 5 + 3');
          expect(context).toContain('8');
          return createSampleResponse('16');
        }
      });

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const result = await decomposed.apply('Calculate (5 + 3) * 2', 'Math problem');

      expect(mockEngine).toHaveBeenCalledTimes(2);
      expect(result.answer).toContain('16');
    });

    it('should combine execution times from all sub-questions', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Sub-question 1
2. Sub-question 2`,
        `Final answer`,
      ]);

      let callCount = 0;
      const mockEngine = vi.fn().mockImplementation(async () => {
        callCount++;
        return createSampleResponse('Answer', true, callCount * 100);
      });

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const result = await decomposed.apply('Question?', 'Context');

      // Should sum: 100ms + 200ms = 300ms
      expect(result.executionTime).toBe(300);
    });

    it('should mark as not verified if any sub-answer is not verified', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Sub-question 1
2. Sub-question 2`,
        `Final answer`,
      ]);

      let callCount = 0;
      const mockEngine = vi.fn().mockImplementation(async () => {
        callCount++;
        // Second sub-question fails verification
        return createSampleResponse('Answer', callCount === 1, 100);
      });

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const result = await decomposed.apply('Question?', 'Context');

      expect(result.isVerified).toBe(false);
    });

    it('should throw error if decomposition returns no sub-questions', async () => {
      const mockClient = createMockOpenAIClient(['No numbered list here']);

      const mockEngine = vi.fn();
      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      await expect(decomposed.apply('Question?', 'Context')).rejects.toThrow(PostprocessingError);
      await expect(decomposed.apply('Question?', 'Context')).rejects.toThrow(
        'Failed to decompose question'
      );
    });

    it('should handle errors during sub-question solving', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Sub-question 1
2. Sub-question 2`,
      ]);

      const mockEngine = vi.fn().mockRejectedValue(new Error('Reasoning engine failed'));

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      await expect(decomposed.apply('Question?', 'Context')).rejects.toThrow(PostprocessingError);
    });
  });

  describe('configuration management', () => {
    it('should use default configuration', () => {
      const mockClient = createMockOpenAIClient(['test']);
      const mockEngine = vi.fn();

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const config = decomposed.getConfig();
      expect(config.maxSubQuestions).toBe(5);
      expect(config.decompositionPrompt).toBeUndefined();
    });

    it('should merge custom configuration with defaults', () => {
      const mockClient = createMockOpenAIClient(['test']);
      const mockEngine = vi.fn();

      const decomposed = new DecomposedPrompting(mockClient, mockEngine, {
        maxSubQuestions: 3,
      });

      const config = decomposed.getConfig();
      expect(config.maxSubQuestions).toBe(3);
    });

    it('should update configuration dynamically', () => {
      const mockClient = createMockOpenAIClient(['test']);
      const mockEngine = vi.fn();

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      decomposed.setConfig({ maxSubQuestions: 7 });

      const config = decomposed.getConfig();
      expect(config.maxSubQuestions).toBe(7);
    });

    it('should use custom decomposition prompt', async () => {
      const customPrompt = 'Custom: {question} with {context}';

      const mockClient = createMockOpenAIClient([`1. Sub-question`]);

      const mockEngine = vi.fn();
      const decomposed = new DecomposedPrompting(mockClient, mockEngine, {
        decompositionPrompt: customPrompt,
      });

      await decomposed.decompose('Test question', 'Test context');

      // Check that create was called (meaning custom prompt was used)
      expect(mockClient.chat.completions.create).toHaveBeenCalled();
    });

    it('should return immutable config copy', () => {
      const mockClient = createMockOpenAIClient(['test']);
      const mockEngine = vi.fn();

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const config1 = decomposed.getConfig();
      const config2 = decomposed.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });
  });

  describe('proof trace construction', () => {
    it('should include decomposition step in proof trace', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Sub-question 1`,
        `Final answer`,
      ]);

      const mockEngine = vi.fn().mockResolvedValue(createSampleResponse('Answer'));

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const result = await decomposed.apply('Question?', 'Context');

      const decompositionStep = result.proof.find((p) =>
        p.description.includes('Decomposed Prompting')
      );
      expect(decompositionStep).toBeDefined();
    });

    it('should include sub-questions in proof trace', async () => {
      const mockClient = createMockOpenAIClient([
        `1. First sub-question
2. Second sub-question`,
        `Final answer`,
      ]);

      const mockEngine = vi.fn().mockResolvedValue(createSampleResponse('Answer'));

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const result = await decomposed.apply('Question?', 'Context');

      const subQuestionSteps = result.proof.filter((p) => p.description.includes('Sub-question'));
      expect(subQuestionSteps.length).toBeGreaterThanOrEqual(2);
    });

    it('should include sub-answers in proof trace', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Sub-question 1`,
        `Final answer`,
      ]);

      const mockEngine = vi.fn().mockResolvedValue(createSampleResponse('Test answer'));

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const result = await decomposed.apply('Question?', 'Context');

      const subAnswerSteps = result.proof.filter((p) => p.description.includes('Sub-answer'));
      expect(subAnswerSteps.length).toBeGreaterThan(0);
    });

    it('should include final combination step in proof trace', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Sub-question 1`,
        `Combined final answer`,
      ]);

      const mockEngine = vi.fn().mockResolvedValue(createSampleResponse('Answer'));

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const result = await decomposed.apply('Question?', 'Context');

      const combinationStep = result.proof.find((p) => p.description.includes('Combining'));
      expect(combinationStep).toBeDefined();

      const completionStep = result.proof.find((p) => p.description.includes('completed'));
      expect(completionStep).toBeDefined();
    });

    it('should preserve proof steps from sub-questions', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Sub-question 1`,
        `Final answer`,
      ]);

      const mockEngine = vi.fn().mockResolvedValue(
        createSampleResponse('Answer with detailed proof', true, 100)
      );

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      const result = await decomposed.apply('Question?', 'Context');

      // Should have steps from original proof
      const translatingStep = result.proof.find((p) => p.description.includes('Translating'));
      expect(translatingStep).toBeDefined();
    });
  });

  describe('context enrichment', () => {
    it('should enrich context with all previous answers when no dependencies', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Question 1
2. Question 2
3. Question 3`,
        `Final`,
      ]);

      const contexts: string[] = [];
      const mockEngine = vi.fn().mockImplementation(async (_q: string, c: string) => {
        contexts.push(c);
        return createSampleResponse('Answer');
      });

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      await decomposed.apply('Complex question', 'Original context');

      // Second question should have context with first answer
      expect(contexts[1]).toContain('Previous findings');
      expect(contexts[1]).toContain('Question 1');

      // Third question should have context with first two answers
      expect(contexts[2]).toContain('Question 1');
      expect(contexts[2]).toContain('Question 2');
    });

    it('should only include dependent answers when dependencies specified', async () => {
      const mockClient = createMockOpenAIClient([
        `1. Question 1
2. Question 2
3. Question 3 (depends on: 1)`,
        `Final`,
      ]);

      const contexts: string[] = [];
      const mockEngine = vi.fn().mockImplementation(async (_q: string, c: string) => {
        contexts.push(c);
        return createSampleResponse('Answer');
      });

      const decomposed = new DecomposedPrompting(mockClient, mockEngine);

      await decomposed.apply('Complex question', 'Original context');

      // Third question should only have answer from question 1, not 2
      const thirdContext = contexts[2]!;
      expect(thirdContext).toContain('Question 1');
      // But should still have context even with dependencies
      expect(thirdContext).toContain('Original context');
    });
  });
});
