/**
 * End-to-end integration tests using mocked components
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProofOfThought } from '../../src/reasoning/proof-of-thought.js';
import { createMockSMT2Client, createMockJSONClient } from '../helpers/mock-openai.js';
import { MockZ3Adapter, createUnsatMock, createSatMock } from '../helpers/z3-mock.js';
import { reasoningFixtures } from '../helpers/fixtures.js';
import { assertions } from '../helpers/test-utils.js';

describe('End-to-End Integration Tests', () => {
  describe('SMT2 Backend Flow (Mocked)', () => {
    it('should complete full reasoning pipeline with mocked components', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      // Override the Z3 adapter with our mock
      const mockZ3 = createUnsatMock();
      // @ts-expect-error - accessing private property for testing
      pot.backend.z3Adapter = mockZ3;

      const response = await pot.query(
        reasoningFixtures.socrates.question,
        reasoningFixtures.socrates.context
      );

      // Verify response structure
      assertions.isValidReasoningResponse(response);

      // Verify content
      expect(response.backend).toBe('smt2');
      expect(response.isVerified).toBe(true); // unsat means verified
      expect(response.formula).toBeTruthy();
      expect(response.proof.length).toBeGreaterThan(0);
    });

    it('should handle satisfiable results', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      const mockZ3 = createSatMock('(model\n  (define-fun x () Int 15)\n)');
      // @ts-expect-error - accessing private property for testing
      pot.backend.z3Adapter = mockZ3;

      const response = await pot.query('Test question', 'Test context');

      assertions.isValidReasoningResponse(response);
      expect(response.isVerified).toBe(false); // sat means not verified (counterexample exists)
    });

    it('should collect detailed proof trace', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
        verbose: true,
      });

      const mockZ3 = createUnsatMock();
      // @ts-expect-error - accessing private property for testing
      pot.backend.z3Adapter = mockZ3;

      const response = await pot.query('Test question', 'Test context');

      assertions.isValidProofTrace(response.proof);
      expect(response.proof.length).toBeGreaterThanOrEqual(3);

      // Check that proof steps are sequential
      response.proof.forEach((step, index) => {
        expect(step.step).toBe(index + 1);
        expect(step.description).toBeTruthy();
      });
    });
  });

  describe('Batch Processing (Mocked)', () => {
    it('should process multiple queries sequentially', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      const mockZ3 = createUnsatMock();
      // @ts-expect-error - accessing private property for testing
      pot.backend.z3Adapter = mockZ3;

      const queries: Array<[string, string]> = [
        ['Question 1', 'Context 1'],
        ['Question 2', 'Context 2'],
        ['Question 3', 'Context 3'],
      ];

      const results = await pot.batch(queries, false);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        assertions.isValidReasoningResponse(result);
      });
    });

    it('should process multiple queries in parallel', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      const mockZ3 = createUnsatMock();
      // @ts-expect-error - accessing private property for testing
      pot.backend.z3Adapter = mockZ3;

      const queries: Array<[string, string]> = [
        ['Question 1', 'Context 1'],
        ['Question 2', 'Context 2'],
      ];

      const startTime = Date.now();
      const results = await pot.batch(queries, true);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        assertions.isValidReasoningResponse(result);
      });

      // Parallel should be reasonably fast
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle LLM API errors gracefully', async () => {
      const mockClient = createMockSMT2Client();
      // Override to fail
      mockClient.chat.completions.create = async () => {
        throw new Error('API rate limit exceeded');
      };

      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      await expect(pot.query('test', 'test')).rejects.toThrow();
    });

    it('should handle Z3 errors gracefully', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      // Create a failing Z3 mock
      const failingZ3 = new MockZ3Adapter({
        shouldFail: true,
        failureMessage: 'Z3 execution failed',
      });

      // @ts-expect-error - accessing private property for testing
      pot.backend.z3Adapter = failingZ3;

      await expect(pot.query('test', 'test')).rejects.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration', () => {
      expect(() => {
        new ProofOfThought({} as never);
      }).toThrow();
    });

    it('should use default configuration values', () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
      });

      const config = pot.getConfig();
      expect(config.backend).toBe('smt2');
      expect(config.model).toBe('gpt-4o');
      expect(config.temperature).toBe(0.0);
    });

    it('should allow custom configuration', () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2048,
        verbose: true,
      });

      const config = pot.getConfig();
      expect(config.model).toBe('gpt-4');
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(2048);
      expect(config.verbose).toBe(true);
    });
  });

  describe('Reasoning Fixtures', () => {
    it('should handle Socrates mortality example', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      const mockZ3 = createUnsatMock();
      // @ts-expect-error - accessing private property for testing
      pot.backend.z3Adapter = mockZ3;

      const { question, context } = reasoningFixtures.socrates;
      const response = await pot.query(question, context);

      assertions.isValidReasoningResponse(response);
      expect(response.isVerified).toBe(true);
    });

    it('should handle logical implication example', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      const mockZ3 = createUnsatMock();
      // @ts-expect-error - accessing private property for testing
      pot.backend.z3Adapter = mockZ3;

      const { question, context } = reasoningFixtures.logical;
      const response = await pot.query(question, context);

      assertions.isValidReasoningResponse(response);
    });

    it('should handle mathematical reasoning example', async () => {
      const mockClient = createMockSMT2Client();
      const pot = new ProofOfThought({
        client: mockClient,
        backend: 'smt2',
      });

      const mockZ3 = createSatMock('(model\n  (define-fun x () Int 15)\n)');
      // @ts-expect-error - accessing private property for testing
      pot.backend.z3Adapter = mockZ3;

      const { question, context } = reasoningFixtures.mathematical;
      const response = await pot.query(question, context);

      assertions.isValidReasoningResponse(response);
    });
  });
});
