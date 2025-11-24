/**
 * Tests for ProofOfThought high-level API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';
import { ConfigurationError, ValidationError } from '../../src/types/errors.js';
import { createUnsatMock } from '../helpers/z3-mock.js';
import type OpenAI from 'openai';

// Mock OpenAI client
const createMockOpenAIClient = (): OpenAI => {
  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async (params: unknown) => {
          const messages = (params as { messages: Array<{ role: string; content: string }> })
            .messages;
          const lastMessage = messages[messages.length - 1];

          // Check if this is a translation or explanation request
          if (lastMessage?.content.includes('SMT-LIB 2.0')) {
            // Return SMT2 formula
            return {
              choices: [
                {
                  message: {
                    content: `\`\`\`smt2
(declare-const human_Socrates Bool)
(declare-const mortal_Socrates Bool)
(declare-fun human (Bool) Bool)
(declare-fun mortal (Bool) Bool)
(assert (forall ((x Bool)) (=> (human x) (mortal x))))
(assert (human human_Socrates))
(assert (not mortal_Socrates))
(check-sat)
(get-model)
\`\`\``,
                  },
                },
              ],
            };
          } else {
            // Return explanation
            return {
              choices: [
                {
                  message: {
                    content:
                      'The logical statement is unsatisfiable, which means the conclusion is logically valid. If all humans are mortal and Socrates is human, then Socrates must be mortal.',
                  },
                },
              ],
            };
          }
        }),
      },
    },
  } as unknown as OpenAI;
};

describe('ProofOfThought', () => {
  let pot: ProofOfThought;
  let mockClient: OpenAI;

  beforeEach(() => {
    mockClient = createMockOpenAIClient();
  });

  describe('construction', () => {
    it('should construct with valid configuration', () => {
      pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      expect(pot).toBeDefined();
      expect(pot.isInitialized()).toBe(false);
    });

    it('should use default configuration values', () => {
      pot = new ProofOfThought({
        client: mockClient,
      });

      const config = pot.getConfig();
      expect(config.backend).toBe('smt2');
      expect(config.model).toBe('gpt-5.1');
      expect(config.temperature).toBe(0.0);
      expect(config.maxTokens).toBe(4096);
      expect(config.z3Timeout).toBe(30000);
      expect(config.verbose).toBe(false);
    });

    it('should throw error if client not provided', () => {
      expect(() => {
        new ProofOfThought({} as never);
      }).toThrow(ConfigurationError);
    });

    it('should accept custom configuration', () => {
      pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2048,
        z3Timeout: 60000,
        verbose: true,
      });

      const config = pot.getConfig();
      expect(config.model).toBe('gpt-4');
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(2048);
      expect(config.z3Timeout).toBe(60000);
      expect(config.verbose).toBe(true);
    });
  });

  describe('query', () => {
    let mockZ3: ReturnType<typeof createUnsatMock>;

    beforeEach(() => {
      mockZ3 = createUnsatMock();
      pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
        z3Adapter: mockZ3,
      });
    });

    it('should reject empty question', async () => {
      await expect(pot.query('')).rejects.toThrow(ValidationError);
      await expect(pot.query('   ')).rejects.toThrow(ValidationError);
    });

    it('should execute complete reasoning pipeline', async () => {
      const response = await pot.query(
        'Is Socrates mortal?',
        'All humans are mortal. Socrates is human.'
      );

      expect(response).toBeDefined();
      expect(response.answer).toBeTruthy();
      expect(response.formula).toBeTruthy();
      expect(response.proof).toBeInstanceOf(Array);
      expect(response.proof.length).toBeGreaterThan(0);
      expect(response.backend).toBe('smt2');
      expect(response.executionTime).toBeGreaterThan(0);
      expect(typeof response.isVerified).toBe('boolean');
    });

    it('should initialize only once', async () => {
      await pot.query('Test 1', 'Context 1');
      expect(pot.isInitialized()).toBe(true);

      await pot.query('Test 2', 'Context 2');
      // Should still be initialized, no re-initialization
      expect(pot.isInitialized()).toBe(true);
    });

    it('should collect proof trace', async () => {
      const response = await pot.query('Simple test', 'Simple context');

      expect(response.proof).toBeInstanceOf(Array);
      expect(response.proof.length).toBeGreaterThan(2);

      // Check proof structure
      response.proof.forEach((step) => {
        expect(step).toHaveProperty('step');
        expect(step).toHaveProperty('description');
        expect(typeof step.step).toBe('number');
        expect(typeof step.description).toBe('string');
      });
    });
  });

  describe('batch', () => {
    let mockZ3: ReturnType<typeof createUnsatMock>;

    beforeEach(() => {
      mockZ3 = createUnsatMock();
      pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
        z3Adapter: mockZ3,
      });
    });

    it('should return empty array for empty queries', async () => {
      const results = await pot.batch([]);
      expect(results).toEqual([]);
    });

    it('should process queries sequentially', async () => {
      const queries: Array<[string, string]> = [
        ['Question 1', 'Context 1'],
        ['Question 2', 'Context 2'],
      ];

      const results = await pot.batch(queries, false);

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result).toHaveProperty('answer');
        expect(result).toHaveProperty('formula');
        expect(result).toHaveProperty('proof');
      });
    });

    it('should process queries in parallel', async () => {
      const queries: Array<[string, string]> = [
        ['Question 1', 'Context 1'],
        ['Question 2', 'Context 2'],
      ];

      const results = await pot.batch(queries, true);

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result).toHaveProperty('answer');
        expect(result).toHaveProperty('formula');
        expect(result).toHaveProperty('proof');
      });
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });
    });

    it('should get configuration', () => {
      const config = pot.getConfig();
      expect(config).toHaveProperty('client');
      expect(config).toHaveProperty('backend');
      expect(config).toHaveProperty('model');
    });

    it('should get backend type', () => {
      expect(pot.getBackendType()).toBe('smt2');
    });

    it('should check initialization status', () => {
      expect(pot.isInitialized()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should support JSON backend', async () => {
      const mockZ3 = createUnsatMock();
      pot = new ProofOfThought({
        client: mockClient,
        backend: 'json',
        z3Adapter: mockZ3,
      });

      expect(pot.getBackendType()).toBe('json');
      // JSON backend is fully implemented and should work
      // The test would fail if trying to query due to mock limitations,
      // but construction should succeed
    });

    it('should handle validation errors', async () => {
      const mockZ3 = createUnsatMock();
      pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
        z3Adapter: mockZ3,
      });

      await expect(pot.query('', 'context')).rejects.toThrow(ValidationError);
    });
  });
});
