/**
 * Compatibility tests validating TypeScript vs Python behavior
 *
 * These tests ensure the TypeScript port maintains behavioral compatibility
 * with the original Python implementation.
 */

import { describe, it, expect } from 'vitest';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';
import { SMT2Backend } from '../../src/backends/smt2-backend.js';
import { JSONBackend } from '../../src/backends/json-backend.js';
import { createMockSMT2Client, createMockJSONClient, createMockOpenAIClient } from '../helpers/mock-openai.js';
import { createUnsatMock, createSatMock, MockZ3Adapter } from '../helpers/z3-mock.js';
import simpleTests from '../fixtures/reasoning/simple.json';
import mathematicalTests from '../fixtures/reasoning/mathematical.json';
import type { SMT2Formula, JSONFormula } from '../../src/types/index.js';

describe('Python Compatibility Tests', () => {
  describe('API Surface Compatibility', () => {
    it('should have compatible ProofOfThought constructor', () => {
      const mockClient = createMockSMT2Client();

      // Python equivalent: ProofOfThought(client=client, backend='smt2')
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      expect(pot).toBeDefined();
      expect(pot.getBackendType()).toBe('smt2');
    });

    it('should have compatible query method signature', async () => {
      const mockClient = createMockSMT2Client();
      const mockZ3 = createUnsatMock();
      const mockBackend = new SMT2Backend({
        client: mockClient,
        z3Adapter: mockZ3,
      });
      const pot = new ProofOfThought({
        client: mockClient,
        backend: mockBackend,
      });

      // Python equivalent: pot.query(question, context)
      const response = await pot.query('Is Socrates mortal?', 'All humans are mortal.');

      expect(response).toHaveProperty('answer');
      expect(response).toHaveProperty('formula');
      expect(response).toHaveProperty('proof');
      expect(response).toHaveProperty('backend');
      expect(response).toHaveProperty('isVerified');
      expect(response).toHaveProperty('executionTime');
    });

    it('should have compatible batch method', async () => {
      // Create a mock with responses for 2 queries (formula + explanation for each)
      const mockClient = createMockOpenAIClient({
        responses: [
          // First query: formula
          {
            content: `\`\`\`smt2
(declare-const x Int)
(assert (= x 5))
(check-sat)
(get-model)
\`\`\``,
          },
          // First query: explanation
          { content: 'The first conclusion is valid.' },
          // Second query: formula
          {
            content: `\`\`\`smt2
(declare-const y Int)
(assert (= y 10))
(check-sat)
(get-model)
\`\`\``,
          },
          // Second query: explanation
          { content: 'The second conclusion is valid.' },
        ],
      });

      const mockZ3 = createUnsatMock();
      const mockBackend = new SMT2Backend({
        client: mockClient,
        z3Adapter: mockZ3,
      });
      const pot = new ProofOfThought({
        client: mockClient,
        backend: mockBackend,
      });

      // Python equivalent: pot.batch(queries)
      const queries: Array<[string, string]> = [
        ['Question 1', 'Context 1'],
        ['Question 2', 'Context 2'],
      ];

      const results = await pot.batch(queries);

      expect(results).toHaveLength(2);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Configuration Compatibility', () => {
    it('should support same configuration options as Python', () => {
      const mockClient = createMockSMT2Client();

      // Python equivalent configuration options
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
        z3Timeout: 30000,
        verbose: false,
      });

      const config = pot.getConfig();
      expect(config.backend).toBe('smt2');
      expect(config.model).toBe('gpt-4o');
      expect(config.temperature).toBe(0.0);
      expect(config.maxTokens).toBe(4096);
      expect(config.z3Timeout).toBe(30000);
      expect(config.verbose).toBe(false);
    });

    it('should support both backend types', () => {
      const mockClient = createMockSMT2Client();

      const smt2Pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });
      expect(smt2Pot.getBackendType()).toBe('smt2');

      const jsonPot = new ProofOfThought({
        client: mockClient,
        backend: 'json',
      });
      expect(jsonPot.getBackendType()).toBe('json');
    });
  });

  describe('Reasoning Test Cases (Python Fixtures)', () => {
    it('should handle simple reasoning cases like Python', async () => {
      for (const testCase of simpleTests.testCases.slice(0, 3)) {
        const mockClient = createMockSMT2Client();

        // Mock Z3 based on expected verification
        const mockZ3 = testCase.expectedVerification === 'unsat'
          ? createUnsatMock()
          : createSatMock();

        const mockBackend = new SMT2Backend({
          client: mockClient,
          z3Adapter: mockZ3,
        });

        const pot = new ProofOfThought({
          client: mockClient,
          backend: mockBackend,
        });

        const response = await pot.query(testCase.question, testCase.context);

        expect(response).toBeDefined();
        expect(response.backend).toBe('smt2');

        // Verify result matches expected (unsat = verified, sat = not verified)
        if (testCase.expectedVerification === 'unsat') {
          expect(response.isVerified).toBe(true);
        } else if (testCase.expectedVerification === 'sat') {
          expect(response.isVerified).toBe(false);
        }
      }
    });

    it('should handle mathematical reasoning cases like Python', async () => {
      for (const testCase of mathematicalTests.testCases.slice(0, 3)) {
        const mockClient = createMockSMT2Client();

        const mockZ3 = testCase.expectedVerification === 'unsat'
          ? createUnsatMock()
          : createSatMock();

        const mockBackend = new SMT2Backend({
          client: mockClient,
          z3Adapter: mockZ3,
        });

        const pot = new ProofOfThought({
          client: mockClient,
          backend: mockBackend,
        });

        const response = await pot.query(testCase.question, testCase.context);

        expect(response).toBeDefined();
        expect(response.executionTime).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Backend Behavior Compatibility', () => {
    it('should produce SMT2 formulas with compatible structure', async () => {
      const mockClient = createMockSMT2Client();
      const mockZ3 = createUnsatMock();
      const backend = new SMT2Backend({
        client: mockClient,
        z3Adapter: mockZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      const formula = await backend.translate(
        'Is Socrates mortal?',
        'All humans are mortal. Socrates is human.'
      );

      // Should be valid SMT2 syntax (balanced parentheses)
      const openParens = (formula as string).match(/\(/g)?.length || 0;
      const closeParens = (formula as string).match(/\)/g)?.length || 0;
      expect(openParens).toBe(closeParens);

      // Should contain SMT2 keywords
      expect(formula as string).toMatch(/\(declare-|assert|check-sat/);
    });

    it('should produce JSON DSL with compatible structure', async () => {
      const mockClient = createMockJSONClient();
      const mockZ3 = createUnsatMock();
      const backend = new JSONBackend({
        client: mockClient,
        z3Adapter: mockZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
        z3Timeout: 30000,
      });

      const formula = await backend.translate(
        'Is Socrates mortal?',
        'All humans are mortal. Socrates is human.'
      );

      // Formula should be a JSON object with required structure
      const parsed = formula as unknown;
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');

      // Should have required JSONProgram structure
      const program = parsed as Record<string, unknown>;
      expect(program).toHaveProperty('sorts');
      expect(program).toHaveProperty('verifications');
      expect(typeof program.sorts).toBe('object');
      expect(typeof program.verifications).toBe('object');
    });
  });

  describe('Verification Result Compatibility', () => {
    it('should interpret sat/unsat results same as Python', async () => {
      const mockClient = createMockSMT2Client();

      // Unsat result (valid conclusion)
      const unsatZ3 = createUnsatMock();
      const unsatBackend = new SMT2Backend({
        client: mockClient,
        z3Adapter: unsatZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
        z3Timeout: 30000,
      });

      const formula = await unsatBackend.translate('test', 'test');
      const unsatResult = await unsatBackend.verify(formula as SMT2Formula);

      expect(unsatResult.result).toBe('unsat');

      // Sat result (counterexample exists)
      // Create a custom sat mock with model data
      const satZ3 = new MockZ3Adapter({
        result: 'sat',
        model: '(model\n  (define-fun x () Int 15)\n)',
      });
      const satBackend = new SMT2Backend({
        client: mockClient,
        z3Adapter: satZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
        z3Timeout: 30000,
      });

      const satResult = await satBackend.verify(formula as SMT2Formula);

      expect(satResult.result).toBe('sat');
      expect(satResult.rawOutput).toBeTruthy();
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should handle validation errors like Python', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      // Empty question should fail validation
      await expect(pot.query('', 'context')).rejects.toThrow();
      await expect(pot.query('   ', 'context')).rejects.toThrow();
    });

    it('should provide detailed error messages', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      try {
        await pot.query('', 'context');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeTruthy();
      }
    });
  });

  describe('Proof Trace Compatibility', () => {
    it('should generate proof traces with sequential steps', async () => {
      const mockClient = createMockSMT2Client();
      const mockZ3 = createUnsatMock();
      const mockBackend = new SMT2Backend({
        client: mockClient,
        z3Adapter: mockZ3,
      });
      const pot = new ProofOfThought({
        client: mockClient,
        backend: mockBackend,
      });

      const response = await pot.query('test', 'test');

      expect(response.proof).toBeInstanceOf(Array);
      expect(response.proof.length).toBeGreaterThan(0);

      // Steps should be sequential
      response.proof.forEach((step, index) => {
        expect(step.step).toBe(index + 1);
        expect(step.description).toBeTruthy();
        expect(typeof step.description).toBe('string');
      });
    });
  });
});
