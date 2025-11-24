/**
 * Tests for SMT2 Backend
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SMT2Backend } from '../../src/backends/smt2-backend.js';
import { createZ3Adapter } from '../../src/adapters/utils.js';
import type { Z3Adapter } from '../../src/types/index.js';
import { ValidationError, TranslationError } from '../../src/types/errors.js';
import type OpenAI from 'openai';

// Mock OpenAI client
const createMockOpenAIClient = (mockResponse?: string): OpenAI => {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content:
                  mockResponse ||
                  '```smt2\n(declare-const x Int)\n(assert (= x 5))\n(check-sat)\n(get-model)\n```',
              },
            },
          ],
        }),
      },
    },
  } as unknown as OpenAI;
};

describe('SMT2Backend', () => {
  let backend: SMT2Backend;
  let z3Adapter: Z3Adapter;
  let mockClient: OpenAI;

  beforeEach(async () => {
    z3Adapter = await createZ3Adapter({ timeout: 5000 });
    mockClient = createMockOpenAIClient();
    backend = new SMT2Backend({
      client: mockClient,
      z3Adapter,
      model: 'gpt-4o',
    });
  });

  afterEach(async () => {
    await z3Adapter.dispose();
  });

  describe('translation', () => {
    it('should reject empty questions', async () => {
      await expect(backend.translate('', 'context')).rejects.toThrow(ValidationError);
    });

    it('should translate question to SMT2 formula', async () => {
      const formula = await backend.translate('Is x equal to 5?', 'x is a number');

      expect(formula).toBeTruthy();
      expect(typeof formula).toBe('string');
      expect(formula).toContain('check-sat');
    });

    it('should extract formula from code blocks', async () => {
      const mockFormula = '(declare-const x Int)\n(assert (= x 5))\n(check-sat)';
      mockClient = createMockOpenAIClient(`\`\`\`smt2\n${mockFormula}\n\`\`\``);
      backend = new SMT2Backend({ client: mockClient, z3Adapter });

      const formula = await backend.translate('test', 'test');

      expect(formula).toBe(mockFormula);
    });

    it('should handle formulas without code blocks', async () => {
      const mockFormula = '(declare-const x Int)\n(assert (= x 5))\n(check-sat)';
      mockClient = createMockOpenAIClient(mockFormula);
      backend = new SMT2Backend({ client: mockClient, z3Adapter });

      const formula = await backend.translate('test', 'test');

      expect(formula).toBe(mockFormula);
    });

    it('should validate formula has check-sat', async () => {
      mockClient = createMockOpenAIClient('(declare-const x Int)\n(assert (= x 5))');
      backend = new SMT2Backend({ client: mockClient, z3Adapter });

      await expect(backend.translate('test', 'test')).rejects.toThrow(ValidationError);
    });

    it('should validate balanced parentheses', async () => {
      mockClient = createMockOpenAIClient('(declare-const x Int\n(check-sat)');
      backend = new SMT2Backend({ client: mockClient, z3Adapter });

      await expect(backend.translate('test', 'test')).rejects.toThrow(ValidationError);
    });
  });

  describe('verification', () => {
    it('should verify satisfiable formula', async () => {
      const z3Available = await z3Adapter.isAvailable();
      if (!z3Available) {
        console.log('Skipping test: Z3 not available');
        return;
      }

      const formula = '(declare-const x Int)\n(assert (= x 5))\n(check-sat)\n(get-model)';

      const result = await backend.verify(formula);

      expect(result.result).toBe('sat');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should verify unsatisfiable formula', async () => {
      const z3Available = await z3Adapter.isAvailable();
      if (!z3Available) {
        console.log('Skipping test: Z3 not available');
        return;
      }

      const formula =
        '(declare-const x Int)\n(assert (= x 5))\n(assert (= x 10))\n(check-sat)';

      const result = await backend.verify(formula);

      expect(result.result).toBe('unsat');
    });

    it('should validate formula before verification', async () => {
      const invalidFormula = '(this is invalid)';

      await expect(backend.verify(invalidFormula)).rejects.toThrow(ValidationError);
    });
  });

  describe('explanation', () => {
    it('should generate explanation for sat result', async () => {
      const result = {
        result: 'sat' as const,
        model: { x: 5, y: true },
        rawOutput: 'sat',
        executionTime: 100,
      };

      const explanation = await backend.explain(result);

      expect(explanation).toBeTruthy();
      expect(explanation.toLowerCase()).toContain('satisfiable');
    });

    it('should generate explanation for unsat result', async () => {
      const result = {
        result: 'unsat' as const,
        rawOutput: 'unsat',
        executionTime: 100,
      };

      const explanation = await backend.explain(result);

      expect(explanation).toBeTruthy();
      expect(explanation.toLowerCase()).toContain('unsatisfiable');
    });

    it('should generate explanation for unknown result', async () => {
      const result = {
        result: 'unknown' as const,
        rawOutput: 'unknown',
        executionTime: 100,
      };

      const explanation = await backend.explain(result);

      expect(explanation).toBeTruthy();
      expect(explanation.toLowerCase()).toContain('unknown');
    });

    it('should fallback to basic explanation if LLM fails', async () => {
      // Create a client that fails
      const failingClient = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('API error')),
          },
        },
      } as unknown as OpenAI;

      backend = new SMT2Backend({ client: failingClient, z3Adapter });

      const result = {
        result: 'sat' as const,
        model: { x: 5 },
        rawOutput: 'sat',
        executionTime: 100,
      };

      const explanation = await backend.explain(result);

      expect(explanation).toBeTruthy();
      expect(explanation).toContain('satisfiable');
      expect(explanation).toContain('x=5');
    });
  });

  describe('formula validation', () => {
    it('should accept valid SMT2 formula', () => {
      const validFormula = '(declare-const x Int)\n(assert (> x 0))\n(check-sat)';

      // Should not throw
      expect(() => backend.verify(validFormula)).not.toThrow();
    });

    it('should reject formula without declarations or assertions', async () => {
      const invalidFormula = '(check-sat)';

      await expect(backend.verify(invalidFormula)).rejects.toThrow(ValidationError);
    });

    it('should reject empty formula', async () => {
      await expect(backend.verify('')).rejects.toThrow(ValidationError);
    });
  });
});
