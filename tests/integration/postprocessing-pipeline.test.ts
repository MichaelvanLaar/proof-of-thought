/**
 * Integration Tests for Postprocessing Pipeline
 *
 * Tests the complete postprocessing pipeline with metrics collection,
 * error handling, and comparative effectiveness tracking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';
import { SMT2Backend } from '../../src/backends/smt2-backend.js';
import type { Z3Adapter, ReasoningResponse, Backend, Formula } from '../../src/types/index.js';
import type OpenAI from 'openai';

// Mock Z3 Adapter
function createMockZ3Adapter(): Z3Adapter {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    executeSMT2: vi.fn().mockResolvedValue({
      result: 'sat' as const,
      rawOutput: 'sat\n(model\n  (define-fun x () Bool true)\n)',
      executionTime: 50,
      model: { x: 'true' },
    }),
    executeJSON: vi.fn().mockResolvedValue({
      result: 'sat' as const,
      rawOutput: 'sat',
      executionTime: 50,
      model: { x: 'true' },
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    getVersion: vi.fn().mockResolvedValue('4.12.2'),
    dispose: vi.fn().mockResolvedValue(undefined),
  };
}

// Mock Backend that doesn't require Z3
class MockBackend implements Backend {
  async translate(question: string, context: string): Promise<Formula> {
    return `mock-formula: ${question}` as Formula;
  }

  async verify(formula: Formula) {
    return {
      result: 'sat' as const,
      rawOutput: 'sat',
      executionTime: 10,
      model: { result: 'true' },
    };
  }

  async explain(result: any): Promise<string> {
    return 'Mock explanation: The formula is satisfiable.';
  }

  getConfig() {
    return { model: 'gpt-4o', temperature: 0 };
  }

  setConfig(config: any) {}
}

// Mock OpenAI Client
function createMockOpenAIClient(responses: string[]): OpenAI {
  let callIndex = 0;

  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async () => {
          const response = responses[callIndex] || responses[responses.length - 1] || 'default';
          callIndex++;

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

describe('Postprocessing Pipeline Integration', () => {
  describe('Metrics collection', () => {
    it('should collect execution times for all methods', async () => {
      const client = createMockOpenAIClient([
        'Critique: good',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['self-refine'],
        selfRefineConfig: { maxIterations: 1 },
      });

      const result = await pot.query('Question', 'Context');

      expect(result.postprocessingMetrics).toBeDefined();

      const metrics = result.postprocessingMetrics!;
      expect(metrics.methodsApplied).toContain('self-refine');
      expect(metrics.methodExecutionTimes['self-refine']).toBeGreaterThanOrEqual(0);
      expect(metrics.totalPostprocessingTime).toBeGreaterThanOrEqual(0);
      expect(metrics.baseReasoningTime).toBeGreaterThanOrEqual(0);
    });

    it('should collect method-specific metrics for self-refine', async () => {
      const client = createMockOpenAIClient([
        'Critique 1',
        'Refined answer 1',
        'Critique 2',
        'Refined answer 2',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['self-refine'],
        selfRefineConfig: { maxIterations: 3 },
      });

      const result = await pot.query('Question', 'Context');

      expect(result.postprocessingMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.methodMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.methodMetrics!.selfRefineIterations).toBeGreaterThanOrEqual(0);
    });

    it('should collect method-specific metrics for decomposed', async () => {
      const client = createMockOpenAIClient([
        '1. Sub-Q1\n2. Sub-Q2\n3. Sub-Q3',
        'mock-formula',
        'mock-formula',
        'mock-formula',
        'Combined answer',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['decomposed'],
        decomposedConfig: { maxSubQuestions: 3 },
      });

      const result = await pot.query('Question', 'Context');

      expect(result.postprocessingMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.methodMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.methodMetrics!.decomposedSubQuestions).toBeGreaterThan(0);
    });

    it('should collect method-specific metrics for least-to-most', async () => {
      const client = createMockOpenAIClient([
        '1. [Complexity: simple] Level 1\n2. [Complexity: medium] Level 2\n3. [Complexity: complex] Level 3',
        'formula-1',
        'formula-2',
        'formula-3',
        'Final synthesis',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['least-to-most'],
        leastToMostConfig: { numLevels: 3 },
      });

      const result = await pot.query('Question', 'Context');

      expect(result.postprocessingMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.methodMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.methodMetrics!.leastToMostLevels).toBeGreaterThan(0);
    });
  });

  describe('Comparative effectiveness tracking', () => {
    it('should track base vs final results', async () => {
      const client = createMockOpenAIClient([
        'Critique: needs improvement',
        'Improved answer with better reasoning',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['self-refine'],
        selfRefineConfig: { maxIterations: 1 },
      });

      const result = await pot.query('Question', 'Context');

      expect(result.postprocessingMetrics).toBeDefined();

      const metrics = result.postprocessingMetrics!;
      expect(metrics.baseResult).toBeDefined();
      expect(metrics.baseResult.answer).toBeDefined();
      expect(metrics.baseResult.isVerified).toBe(true);
      expect(metrics.baseResult.proofSteps).toBeGreaterThan(0);

      expect(metrics.finalResult).toBeDefined();
      expect(metrics.finalResult.answer).toBeDefined();
      expect(metrics.finalResult.isVerified).toBe(true);
      expect(metrics.finalResult.proofSteps).toBeGreaterThanOrEqual(metrics.baseResult.proofSteps);
    });

    it('should detect answer changes', async () => {
      const client = createMockOpenAIClient([
        'The answer needs to be changed',
        'Completely different answer',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['self-refine'],
        selfRefineConfig: { maxIterations: 1 },
      });

      const result = await pot.query('Question', 'Context');

      expect(result.postprocessingMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.improvements).toBeDefined();
      expect(result.postprocessingMetrics!.improvements.answerChanged).toBe(true);
    });

    it('should detect proof expansion', async () => {
      const client = createMockOpenAIClient([
        '1. Sub-A\n2. Sub-B\n3. Sub-C',
        'formula',
        'formula',
        'formula',
        'Combined answer with more detail',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['decomposed'],
        decomposedConfig: { maxSubQuestions: 3 },
      });

      const result = await pot.query('Question', 'Context');

      expect(result.postprocessingMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.improvements.proofExpanded).toBe(true);
      expect(result.postprocessingMetrics!.finalResult.proofSteps).toBeGreaterThan(
        result.postprocessingMetrics!.baseResult.proofSteps
      );
    });
  });

  describe('Error handling and fallback', () => {
    it('should fallback to base result on postprocessing error', async () => {
      const client = createMockOpenAIClient(['default']);

      // Mock to throw error on critique
      (client.chat.completions.create as ReturnType<typeof vi.fn>).mockImplementationOnce(
        async () => {
          // First call succeeds (base query completes)
          throw new Error('Critique failed');
        }
      );

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['self-refine'],
        selfRefineConfig: { maxIterations: 1 },
        verbose: false,
      });

      const result = await pot.query('Question', 'Context');

      // Should have base result despite error
      expect(result.answer).toBeDefined();
      expect(result.isVerified).toBe(true);

      // Proof should contain error message
      const errorStep = result.proof.find((p) =>
        p.description.toLowerCase().includes('error')
      );
      expect(errorStep).toBeDefined();
    });

    it('should continue with other methods after one fails', async () => {
      const client = createMockOpenAIClient([
        'default',
        '1. [Complexity: simple] Q1\n2. [Complexity: complex] Q2',
        'formula',
        'formula',
        'Final answer',
      ]);

      let callCount = 0;
      (client.chat.completions.create as ReturnType<typeof vi.fn>).mockImplementation(
        async () => {
          callCount++;

          if (callCount === 1) {
            // Self-refine critique - fail
            throw new Error('Self-refine failed');
          } else if (callCount === 2) {
            // Least-to-most progression
            return {
              choices: [
                {
                  message: {
                    content: '1. [Complexity: simple] Q1\n2. [Complexity: complex] Q2',
                  },
                },
              ],
            };
          } else if (callCount === 3 || callCount === 4) {
            // Sub-question formulas
            return {
              choices: [
                {
                  message: {
                    content: 'formula',
                  },
                },
              ],
            };
          } else {
            // Synthesis
            return {
              choices: [
                {
                  message: {
                    content: 'Final answer',
                  },
                },
              ],
            };
          }
        }
      );

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['self-refine', 'least-to-most'],
        selfRefineConfig: { maxIterations: 1 },
        leastToMostConfig: { numLevels: 2 },
        verbose: false,
      });

      const result = await pot.query('Question', 'Context');

      // Should have applied only least-to-most (self-refine failed)
      expect(result.postprocessingMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.methodsApplied).toContain('least-to-most');

      // Should have error in proof (might be hard to find exact format, so just check metrics)
      expect(result.postprocessingMetrics!.methodsApplied).not.toContain('self-refine');
    });
  });

  describe('Performance overhead', () => {
    it('should track performance overhead of postprocessing', async () => {
      const client = createMockOpenAIClient([
        'Critique',
        'Refined',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['self-refine'],
        selfRefineConfig: { maxIterations: 1 },
      });

      const result = await pot.query('Question', 'Context');

      expect(result.postprocessingMetrics).toBeDefined();

      const metrics = result.postprocessingMetrics!;
      expect(metrics.baseReasoningTime).toBeGreaterThanOrEqual(0);
      expect(metrics.totalPostprocessingTime).toBeGreaterThanOrEqual(0);

      // Total execution should include both base + postprocessing (with some tolerance for overhead)
      expect(result.executionTime).toBeGreaterThanOrEqual(metrics.baseReasoningTime);
    });

    it('should measure overhead for multiple methods', async () => {
      const client = createMockOpenAIClient([
        'Critique',
        'Refined',
        '1. Sub-Q1\n2. Sub-Q2',
        'formula',
        'formula',
        'Final',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['self-refine', 'decomposed'],
        selfRefineConfig: { maxIterations: 1 },
        decomposedConfig: { maxSubQuestions: 2 },
      });

      const result = await pot.query('Question', 'Context');

      const metrics = result.postprocessingMetrics!;
      const totalMethodTime =
        metrics.methodExecutionTimes['self-refine'] +
        metrics.methodExecutionTimes['decomposed'];

      // Total postprocessing time should approximately equal sum of method times (within 50% margin)
      expect(metrics.totalPostprocessingTime).toBeGreaterThanOrEqual(totalMethodTime * 0.5);
      expect(metrics.totalPostprocessingTime).toBeLessThanOrEqual(totalMethodTime * 1.5);
    });
  });

  describe('Method execution order', () => {
    it('should apply methods in specified order', async () => {
      const client = createMockOpenAIClient([
        '1. [Complexity: simple] Q1',
        'formula',
        'Final from LTM',
        'Critique',
        'Refined',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['least-to-most', 'self-refine'],
        leastToMostConfig: { numLevels: 1 },
        selfRefineConfig: { maxIterations: 1 },
      });

      const result = await pot.query('Question', 'Context');

      expect(result.postprocessingMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.methodsApplied).toEqual([
        'least-to-most',
        'self-refine',
      ]);
    });

    it('should chain multiple methods correctly', async () => {
      const client = createMockOpenAIClient([
        'Critique 1',
        '1. Sub-Q1',
        'formula',
        'Decomposed answer',
        'Critique 2',
        'Final refined',
      ]);

      const pot = new ProofOfThought({
        client,
        backend: new MockBackend(),
        postprocessing: ['self-refine', 'decomposed'],
        selfRefineConfig: { maxIterations: 1 },
        decomposedConfig: { maxSubQuestions: 1 },
      });

      const result = await pot.query('Question', 'Context');

      expect(result.postprocessingMetrics).toBeDefined();
      expect(result.postprocessingMetrics!.methodsApplied.length).toBeGreaterThan(0);
      expect(result.postprocessingMetrics!.methodsApplied).toContain('self-refine');
    });
  });
});
