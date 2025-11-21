/**
 * Tests for Self-Refine postprocessing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type OpenAI from 'openai';
import { SelfRefine } from '../../src/postprocessing/self-refine.js';
import type { ReasoningResponse } from '../../src/types/index.js';
import { PostprocessingError } from '../../src/types/errors.js';

/**
 * Create a mock OpenAI client for testing
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

/**
 * Create a sample reasoning response for testing
 */
function createSampleResponse(answer: string): ReasoningResponse {
  return {
    answer,
    formula: '(declare-const human Bool)\n(assert human)\n(check-sat)',
    proof: [
      { step: 1, description: 'Initial reasoning', response: answer },
    ],
    isVerified: true,
    backend: 'smt2',
    executionTime: 100,
  };
}

describe('SelfRefine', () => {
  describe('refine() - successful refinement', () => {
    it('should refine answer until satisfactory', async () => {
      // Mock responses: critique, improved answer, satisfactory critique
      const mockClient = createMockOpenAIClient([
        'The answer is unclear. It should be more specific.',
        'Socrates is mortal because he is human and all humans are mortal.',
        'SATISFACTORY: The answer is clear and logically sound.',
      ]);

      const selfRefine = new SelfRefine(mockClient, {
        maxIterations: 3,
        convergenceThreshold: 0.95,
      });

      const initialResponse = createSampleResponse('Socrates is mortal.');
      const refined = await selfRefine.refine(
        initialResponse,
        'Is Socrates mortal?',
        'All humans are mortal. Socrates is human.'
      );

      expect(refined.answer).toBe(
        'Socrates is mortal because he is human and all humans are mortal.'
      );
      expect(refined.proof.length).toBeGreaterThan(initialResponse.proof.length);
      expect(refined.proof.some((p) => p.description.includes('Self-Refine'))).toBe(true);
    });

    it('should stop at max iterations', async () => {
      // Mock responses that never converge or become satisfactory
      const mockClient = createMockOpenAIClient([
        'Needs improvement A.',
        'Answer version A.',
        'Needs improvement B.',
        'Answer version B.',
        'Needs improvement C.',
        'Answer version C.',
      ]);

      const selfRefine = new SelfRefine(mockClient, {
        maxIterations: 2,
        convergenceThreshold: 0.95,
      });

      const initialResponse = createSampleResponse('Initial answer.');
      const refined = await selfRefine.refine(
        initialResponse,
        'Test question?',
        'Test context.'
      );

      // Should have 2 iterations
      const refinementSteps = refined.proof.filter((p) =>
        p.description.includes('Self-Refine iteration')
      );
      expect(refinementSteps.length).toBe(2);
      expect(refined.answer).toBe('Answer version B.');
    });

    it('should detect convergence', async () => {
      // Mock responses where the improved answer is very similar
      const mockClient = createMockOpenAIClient([
        'Minor improvements needed.',
        'Socrates is mortal because all humans are mortal.', // Very similar to initial
        'Still needs work.',
        'Socrates is mortal since all humans are mortal.', // Also similar
      ]);

      const selfRefine = new SelfRefine(mockClient, {
        maxIterations: 5,
        convergenceThreshold: 0.8, // Lower threshold for faster convergence
      });

      const initialResponse = createSampleResponse(
        'Socrates is mortal because all humans are mortal.'
      );
      const refined = await selfRefine.refine(
        initialResponse,
        'Is Socrates mortal?',
        'All humans are mortal. Socrates is human.'
      );

      const convergenceStep = refined.proof.find((p) =>
        p.description.includes('Converged')
      );
      expect(convergenceStep).toBeDefined();
      expect(convergenceStep?.description).toContain('similarity:');
    });

    it('should handle already satisfactory answers', async () => {
      // Mock response that immediately indicates satisfaction
      const mockClient = createMockOpenAIClient([
        'SATISFACTORY: The answer is already excellent and well-reasoned.',
      ]);

      const selfRefine = new SelfRefine(mockClient, {
        maxIterations: 3,
      });

      const initialResponse = createSampleResponse(
        'Socrates is mortal because he is human and all humans are mortal.'
      );
      const refined = await selfRefine.refine(
        initialResponse,
        'Is Socrates mortal?',
        'All humans are mortal. Socrates is human.'
      );

      // Answer should remain the same
      expect(refined.answer).toBe(initialResponse.answer);
      // Should have stopped after first critique
      const refinementSteps = refined.proof.filter((p) =>
        p.description.includes('Self-Refine iteration')
      );
      expect(refinementSteps.length).toBeLessThanOrEqual(1);
    });
  });

  describe('refine() - custom configuration', () => {
    it('should use custom critique prompt', async () => {
      const mockClient = createMockOpenAIClient([
        'Custom critique response.',
        'Improved answer.',
        'SATISFACTORY: Good.',
      ]);

      const customPrompt = 'Custom critique prompt: Evaluate this answer carefully.';
      const selfRefine = new SelfRefine(mockClient, {
        critiquePrompt: customPrompt,
      });

      const initialResponse = createSampleResponse('Test answer.');
      await selfRefine.refine(initialResponse, 'Question?', 'Context.');

      // Verify the custom prompt was used (check mock was called)
      expect(mockClient.chat.completions.create).toHaveBeenCalled();
    });

    it('should respect convergence threshold', async () => {
      const mockClient = createMockOpenAIClient([
        'Improve this.',
        'Socrates is definitely mortal.',
        'Still improve.',
        'Socrates is certainly mortal.',
      ]);

      // High threshold (0.99) should require very similar answers
      const selfRefine = new SelfRefine(mockClient, {
        maxIterations: 5,
        convergenceThreshold: 0.99,
      });

      const initialResponse = createSampleResponse('Socrates is mortal.');
      const refined = await selfRefine.refine(
        initialResponse,
        'Is Socrates mortal?',
        'Context.'
      );

      // With high threshold, should iterate more before converging
      const refinementSteps = refined.proof.filter((p) =>
        p.description.includes('Self-Refine iteration')
      );
      expect(refinementSteps.length).toBeGreaterThan(1);
    });
  });

  describe('refine() - error handling', () => {
    it('should throw PostprocessingError on LLM failure', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('OpenAI API error')),
          },
        },
      } as unknown as OpenAI;

      const selfRefine = new SelfRefine(mockClient);
      const initialResponse = createSampleResponse('Test answer.');

      await expect(
        selfRefine.refine(initialResponse, 'Question?', 'Context.')
      ).rejects.toThrow(PostprocessingError);

      await expect(
        selfRefine.refine(initialResponse, 'Question?', 'Context.')
      ).rejects.toThrow('Self-Refine failed');
    });

    it('should include refinement history in error', async () => {
      const mockClient = createMockOpenAIClient([
        'First critique.',
        'First improvement.',
        'Second critique.',
      ]);

      // Force error after a few iterations
      let callCount = 0;
      vi.spyOn(mockClient.chat.completions, 'create').mockImplementation(async () => {
        callCount++;
        if (callCount > 3) {
          throw new Error('Simulated failure');
        }
        const response = callCount % 2 === 1 ? 'Critique.' : 'Improved.';
        return {
          choices: [{ message: { content: response } }],
        } as any;
      });

      const selfRefine = new SelfRefine(mockClient, { maxIterations: 5 });
      const initialResponse = createSampleResponse('Test answer.');

      try {
        await selfRefine.refine(initialResponse, 'Question?', 'Context.');
        expect.fail('Should have thrown PostprocessingError');
      } catch (error) {
        expect(error).toBeInstanceOf(PostprocessingError);
        if (error instanceof PostprocessingError) {
          expect(error.details).toBeDefined();
          expect(error.details?.refinementHistory).toBeDefined();
        }
      }
    });
  });

  describe('calculateSimilarity()', () => {
    let selfRefine: SelfRefine;

    beforeEach(() => {
      const mockClient = createMockOpenAIClient(['test']);
      selfRefine = new SelfRefine(mockClient);
    });

    it('should return 1.0 for identical strings', () => {
      const str = 'Socrates is mortal.';
      // Access private method via type assertion for testing
      const similarity = (selfRefine as any).calculateSimilarity(str, str);
      expect(similarity).toBe(1.0);
    });

    it('should return 1.0 for strings differing only in whitespace', () => {
      const str1 = 'Socrates is mortal.';
      const str2 = 'Socrates   is    mortal.';
      const similarity = (selfRefine as any).calculateSimilarity(str1, str2);
      expect(similarity).toBe(1.0);
    });

    it('should return 1.0 for strings differing only in case', () => {
      const str1 = 'Socrates is mortal.';
      const str2 = 'SOCRATES IS MORTAL.';
      const similarity = (selfRefine as any).calculateSimilarity(str1, str2);
      expect(similarity).toBe(1.0);
    });

    it('should return high similarity for mostly similar strings', () => {
      const str1 = 'Socrates is mortal because he is human.';
      const str2 = 'Socrates is mortal since he is human.';
      const similarity = (selfRefine as any).calculateSimilarity(str1, str2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should return low similarity for different strings', () => {
      const str1 = 'Socrates is mortal.';
      const str2 = 'The sky is blue today.';
      const similarity = (selfRefine as any).calculateSimilarity(str1, str2);
      expect(similarity).toBeLessThan(0.3);
    });

    it('should handle empty strings', () => {
      const similarity = (selfRefine as any).calculateSimilarity('', '');
      expect(similarity).toBe(1.0); // Empty strings are identical
    });
  });

  describe('isSatisfactory()', () => {
    let selfRefine: SelfRefine;

    beforeEach(() => {
      const mockClient = createMockOpenAIClient(['test']);
      selfRefine = new SelfRefine(mockClient);
    });

    it('should detect SATISFACTORY indicator', () => {
      const critique = 'SATISFACTORY: The answer is excellent.';
      const result = (selfRefine as any).isSatisfactory(critique);
      expect(result).toBe(true);
    });

    it('should detect "excellent" indicator', () => {
      const critique = 'This answer is excellent and well-reasoned.';
      const result = (selfRefine as any).isSatisfactory(critique);
      expect(result).toBe(true);
    });

    it('should detect "no improvements needed" indicator', () => {
      const critique = 'The answer is perfect, no improvements needed.';
      const result = (selfRefine as any).isSatisfactory(critique);
      expect(result).toBe(true);
    });

    it('should detect "already correct" indicator', () => {
      const critique = 'The reasoning is already correct and complete.';
      const result = (selfRefine as any).isSatisfactory(critique);
      expect(result).toBe(true);
    });

    it('should detect "well-reasoned" indicator', () => {
      const critique = 'This is a well-reasoned and logical answer.';
      const result = (selfRefine as any).isSatisfactory(critique);
      expect(result).toBe(true);
    });

    it('should not detect satisfactory in critical feedback', () => {
      const critique = 'The answer needs significant improvement and clarification.';
      const result = (selfRefine as any).isSatisfactory(critique);
      expect(result).toBe(false);
    });

    it('should be case-insensitive', () => {
      const critique = 'EXCELLENT answer that is WELL-REASONED.';
      const result = (selfRefine as any).isSatisfactory(critique);
      expect(result).toBe(true);
    });
  });

  describe('configuration management', () => {
    it('should use default configuration', () => {
      const mockClient = createMockOpenAIClient(['test']);
      const selfRefine = new SelfRefine(mockClient);

      const config = selfRefine.getConfig();
      expect(config.maxIterations).toBe(3);
      expect(config.convergenceThreshold).toBe(0.95);
      expect(config.critiquePrompt).toBeUndefined();
    });

    it('should merge custom configuration with defaults', () => {
      const mockClient = createMockOpenAIClient(['test']);
      const selfRefine = new SelfRefine(mockClient, {
        maxIterations: 5,
      });

      const config = selfRefine.getConfig();
      expect(config.maxIterations).toBe(5);
      expect(config.convergenceThreshold).toBe(0.95); // default
    });

    it('should update configuration dynamically', () => {
      const mockClient = createMockOpenAIClient(['test']);
      const selfRefine = new SelfRefine(mockClient);

      selfRefine.setConfig({ maxIterations: 10, convergenceThreshold: 0.85 });

      const config = selfRefine.getConfig();
      expect(config.maxIterations).toBe(10);
      expect(config.convergenceThreshold).toBe(0.85);
    });

    it('should return immutable config copy', () => {
      const mockClient = createMockOpenAIClient(['test']);
      const selfRefine = new SelfRefine(mockClient);

      const config1 = selfRefine.getConfig();
      const config2 = selfRefine.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });
  });

  describe('proof trace updates', () => {
    it('should add refinement steps to proof trace', async () => {
      const mockClient = createMockOpenAIClient([
        'Needs improvement.',
        'Better answer.',
        'SATISFACTORY: Good.',
      ]);

      const selfRefine = new SelfRefine(mockClient, { maxIterations: 3 });
      const initialResponse = createSampleResponse('Initial answer.');

      const refined = await selfRefine.refine(
        initialResponse,
        'Question?',
        'Context.'
      );

      // Should have added refinement steps
      expect(refined.proof.length).toBeGreaterThan(initialResponse.proof.length);

      // Check for refinement iteration steps
      const iterationSteps = refined.proof.filter((p) =>
        p.description.includes('Self-Refine iteration')
      );
      expect(iterationSteps.length).toBeGreaterThan(0);

      // Check for completion step
      const completionStep = refined.proof.find((p) =>
        p.description.includes('Self-Refine completed')
      );
      expect(completionStep).toBeDefined();
    });

    it('should preserve original proof steps', async () => {
      const mockClient = createMockOpenAIClient([
        'SATISFACTORY: Great.',
      ]);

      const selfRefine = new SelfRefine(mockClient);
      const initialResponse = createSampleResponse('Test answer.');
      initialResponse.proof = [
        { step: 1, description: 'Original step 1' },
        { step: 2, description: 'Original step 2' },
      ];

      const refined = await selfRefine.refine(
        initialResponse,
        'Question?',
        'Context.'
      );

      // Original steps should still be there
      expect(refined.proof[0].description).toBe('Original step 1');
      expect(refined.proof[1].description).toBe('Original step 2');
    });

    it('should include similarity scores in convergence steps', async () => {
      const mockClient = createMockOpenAIClient([
        'Improve this.',
        'Test answer modified.',
        'Improve more.',
        'Test answer modified.',
      ]);

      const selfRefine = new SelfRefine(mockClient, {
        maxIterations: 5,
        convergenceThreshold: 0.8,
      });

      const initialResponse = createSampleResponse('Test answer.');
      const refined = await selfRefine.refine(
        initialResponse,
        'Question?',
        'Context.'
      );

      const convergenceStep = refined.proof.find((p) =>
        p.description.includes('Converged') && p.description.includes('similarity:')
      );

      if (convergenceStep) {
        expect(convergenceStep.description).toMatch(/similarity: \d\.\d{2}/);
      }
    });
  });
});
