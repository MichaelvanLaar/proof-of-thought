/**
 * Tests for Self-Consistency postprocessing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type OpenAI from 'openai';
import { SelfConsistency } from '../../src/postprocessing/self-consistency.js';
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
    proof: [{ step: 1, description: 'Initial reasoning', response: answer }],
    isVerified,
    backend: 'smt2',
    executionTime,
  };
}

/**
 * Create mock OpenAI client
 */
function createMockOpenAIClient(): OpenAI {
  return {} as OpenAI;
}

describe('SelfConsistency', () => {
  describe('apply() - majority voting', () => {
    it('should select the most common answer', async () => {
      const mockClient = createMockOpenAIClient();

      let callCount = 0;
      const mockEngine = vi.fn(async () => {
        const answers = ['Yes', 'Yes', 'Yes', 'No', 'No'];
        return createSampleResponse(answers[callCount++]!);
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 5,
        votingMethod: 'majority',
      });

      const result = await selfConsistency.apply('Is Socrates mortal?', 'Context');

      expect(result.answer).toBe('Yes');
      expect(result.confidence).toBe(0.6); // 3 out of 5
      expect(mockEngine).toHaveBeenCalledTimes(5);
    });

    it('should handle unanimous consensus', async () => {
      const mockClient = createMockOpenAIClient();

      const mockEngine = vi.fn(async () => {
        return createSampleResponse('Socrates is mortal');
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 3,
        votingMethod: 'majority',
      });

      const result = await selfConsistency.apply('Question?', 'Context');

      expect(result.answer).toBe('Socrates is mortal');
      expect(result.confidence).toBe(1.0); // 3 out of 3
    });

    it('should normalize answers for comparison', async () => {
      const mockClient = createMockOpenAIClient();

      let callCount = 0;
      const mockEngine = vi.fn(async () => {
        // These should all be considered the same answer
        const answers = ['Yes.', 'yes', '  YES  ', 'Yes!'];
        return createSampleResponse(answers[callCount++]!);
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 4,
        votingMethod: 'majority',
      });

      const result = await selfConsistency.apply('Question?', 'Context');

      expect(result.confidence).toBe(1.0); // All normalized to same answer
    });

    it('should handle ties by selecting first occurrence', async () => {
      const mockClient = createMockOpenAIClient();

      let callCount = 0;
      const mockEngine = vi.fn(async () => {
        const answers = ['Answer A', 'Answer B', 'Answer A', 'Answer B'];
        return createSampleResponse(answers[callCount++]!);
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 4,
        votingMethod: 'majority',
      });

      const result = await selfConsistency.apply('Question?', 'Context');

      expect(['Answer A', 'Answer B']).toContain(result.answer);
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('apply() - weighted voting', () => {
    it('should give higher weight to verified answers', async () => {
      const mockClient = createMockOpenAIClient();

      let callCount = 0;
      const mockEngine = vi.fn(async () => {
        // Answer A: 1 unverified occurrence (weight ~1.0)
        // Answer B: 2 verified occurrences (weight ~1.5 each = 3.0 total, should win)
        const responses = [
          createSampleResponse('Answer A', false),
          createSampleResponse('Answer B', true),
          createSampleResponse('Answer B', true),
        ];
        return responses[callCount++]!;
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 3,
        votingMethod: 'weighted',
      });

      const result = await selfConsistency.apply('Question?', 'Context');

      // Weighted voting should prefer Answer B due to verification
      expect(result.answer).toBe('Answer B');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should consider execution time in weighting', async () => {
      const mockClient = createMockOpenAIClient();

      let callCount = 0;
      const mockEngine = vi.fn(async () => {
        // Answer A: fast but appears once
        // Answer B: slow but appears twice
        const responses = [
          createSampleResponse('Answer A', true, 50),
          createSampleResponse('Answer B', true, 200),
          createSampleResponse('Answer B', true, 200),
        ];
        return responses[callCount++]!;
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 3,
        votingMethod: 'weighted',
      });

      const result = await selfConsistency.apply('Question?', 'Context');

      // Answer B should still win due to frequency, despite slower execution
      expect(result.answer).toBe('Answer B');
    });
  });

  describe('aggregate()', () => {
    it('should throw error for empty paths', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine);

      expect(() => selfConsistency.aggregate([])).toThrow(PostprocessingError);
      expect(() => selfConsistency.aggregate([])).toThrow('Cannot aggregate empty paths');
    });

    it('should support majority voting method', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        votingMethod: 'majority',
      });

      const paths = [
        createSampleResponse('Yes'),
        createSampleResponse('Yes'),
        createSampleResponse('No'),
      ];

      const result = selfConsistency.aggregate(paths);

      expect(result.answer).toBe('Yes');
      expect(result.confidence).toBeCloseTo(0.667, 2);
    });

    it('should support weighted voting method', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        votingMethod: 'weighted',
      });

      const paths = [
        createSampleResponse('Yes', true, 100),
        createSampleResponse('No', false, 200),
      ];

      const result = selfConsistency.aggregate(paths);

      expect(result.answer).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should throw error for unknown voting method', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        votingMethod: 'unknown' as any,
      });

      const paths = [createSampleResponse('Yes')];

      expect(() => selfConsistency.aggregate(paths)).toThrow(PostprocessingError);
      expect(() => selfConsistency.aggregate(paths)).toThrow('Unknown voting method');
    });
  });

  describe('generatePaths()', () => {
    it('should generate specified number of paths', async () => {
      const mockClient = createMockOpenAIClient();

      const mockEngine = vi.fn(async () => {
        return createSampleResponse('Answer');
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 7,
      });

      const paths = await selfConsistency.generatePaths('Question?', 'Context');

      expect(paths).toHaveLength(7);
      expect(mockEngine).toHaveBeenCalledTimes(7);
    });

    it('should pass temperature to reasoning engine', async () => {
      const mockClient = createMockOpenAIClient();

      const mockEngine = vi.fn(async () => {
        return createSampleResponse('Answer');
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 3,
        temperature: 0.9,
      });

      await selfConsistency.generatePaths('Question?', 'Context');

      expect(mockEngine).toHaveBeenCalledWith('Question?', 'Context', 0.9);
    });
  });

  describe('configuration management', () => {
    it('should use default configuration', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine);

      const config = selfConsistency.getConfig();
      expect(config.numSamples).toBe(5);
      expect(config.temperature).toBe(0.7);
      expect(config.votingMethod).toBe('majority');
    });

    it('should merge custom configuration with defaults', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 10,
      });

      const config = selfConsistency.getConfig();
      expect(config.numSamples).toBe(10);
      expect(config.temperature).toBe(0.7); // default
      expect(config.votingMethod).toBe('majority'); // default
    });

    it('should update configuration dynamically', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine);

      selfConsistency.setConfig({ numSamples: 15, votingMethod: 'weighted' });

      const config = selfConsistency.getConfig();
      expect(config.numSamples).toBe(15);
      expect(config.votingMethod).toBe('weighted');
    });

    it('should return immutable config copy', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine);

      const config1 = selfConsistency.getConfig();
      const config2 = selfConsistency.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });
  });

  describe('answer normalization', () => {
    it('should normalize whitespace', () => {
      const mockClient = createMockOpenAIClient();

      let callCount = 0;
      const mockEngine = vi.fn(async () => {
        const answers = ['Yes', '  Yes  ', 'Yes\n', '\tYes\t'];
        return createSampleResponse(answers[callCount++]!);
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 4,
      });

      const paths = [
        createSampleResponse('Yes'),
        createSampleResponse('  Yes  '),
        createSampleResponse('Yes\n'),
      ];

      const result = selfConsistency.aggregate(paths);
      expect(result.confidence).toBe(1.0);
    });

    it('should normalize case', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine);

      const paths = [
        createSampleResponse('YES'),
        createSampleResponse('Yes'),
        createSampleResponse('yes'),
      ];

      const result = selfConsistency.aggregate(paths);
      expect(result.confidence).toBe(1.0);
    });

    it('should normalize trailing punctuation', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine);

      const paths = [
        createSampleResponse('Yes'),
        createSampleResponse('Yes.'),
        createSampleResponse('Yes!'),
      ];

      const result = selfConsistency.aggregate(paths);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('error handling', () => {
    it('should throw PostprocessingError on engine failure', async () => {
      const mockClient = createMockOpenAIClient();

      const mockEngine = vi.fn(async () => {
        throw new Error('Reasoning engine failed');
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 3,
      });

      await expect(selfConsistency.apply('Question?', 'Context')).rejects.toThrow(
        PostprocessingError
      );

      await expect(selfConsistency.apply('Question?', 'Context')).rejects.toThrow(
        'Self-Consistency failed'
      );
    });

    it('should include context in error', async () => {
      const mockClient = createMockOpenAIClient();

      let callCount = 0;
      const mockEngine = vi.fn(async () => {
        if (callCount++ >= 2) {
          throw new Error('Failed after 2 paths');
        }
        return createSampleResponse('Answer');
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 5,
      });

      try {
        await selfConsistency.apply('Question?', 'Context');
        expect.fail('Should have thrown PostprocessingError');
      } catch (error) {
        expect(error).toBeInstanceOf(PostprocessingError);
        if (error instanceof PostprocessingError) {
          expect(error.details).toBeDefined();
          expect(error.details?.numSamples).toBe(5);
          expect(error.details?.pathsGenerated).toBe(2);
        }
      }
    });
  });

  describe('proof trace updates', () => {
    it('should add self-consistency step to proof trace', async () => {
      const mockClient = createMockOpenAIClient();

      const mockEngine = vi.fn(async () => {
        return createSampleResponse('Yes');
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 3,
      });

      const result = await selfConsistency.apply('Question?', 'Context');

      const scStep = result.proof.find((p) => p.description.includes('Self-Consistency'));
      expect(scStep).toBeDefined();
      expect(scStep?.description).toContain('3 paths');
      expect(scStep?.description).toContain('100.0% confidence');
    });

    it('should preserve original proof steps', async () => {
      const mockClient = createMockOpenAIClient();

      const mockEngine = vi.fn(async () => {
        const response = createSampleResponse('Answer');
        response.proof = [
          { step: 1, description: 'Original step 1' },
          { step: 2, description: 'Original step 2' },
        ];
        return response;
      });

      const selfConsistency = new SelfConsistency(mockClient, mockEngine, {
        numSamples: 2,
      });

      const result = await selfConsistency.apply('Question?', 'Context');

      expect(result.proof[0]?.description).toBe('Original step 1');
      expect(result.proof[1]?.description).toBe('Original step 2');
    });
  });

  describe('findBestResponse()', () => {
    it('should select verified response over unverified', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine);

      const paths = [
        createSampleResponse('Yes', false, 100),
        createSampleResponse('Yes', true, 150),
      ];

      const result = (selfConsistency as any).findBestResponse(paths, 'Yes');

      expect(result.isVerified).toBe(true);
    });

    it('should select faster response when verification is equal', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine);

      const paths = [
        createSampleResponse('Yes', true, 200),
        createSampleResponse('Yes', true, 100),
      ];

      const result = (selfConsistency as any).findBestResponse(paths, 'Yes');

      expect(result.executionTime).toBe(100);
    });

    it('should handle no matching responses gracefully', () => {
      const mockClient = createMockOpenAIClient();
      const mockEngine = vi.fn();

      const selfConsistency = new SelfConsistency(mockClient, mockEngine);

      const paths = [createSampleResponse('Answer A'), createSampleResponse('Answer B')];

      const result = (selfConsistency as any).findBestResponse(paths, 'Answer C');

      // Should fall back to first response
      expect(result.answer).toBe('Answer A');
    });
  });
});
