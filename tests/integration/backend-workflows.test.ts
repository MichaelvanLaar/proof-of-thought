/**
 * Integration tests for backend workflows
 */

import { describe, it, expect } from 'vitest';
import { SMT2Backend } from '../../src/backends/smt2-backend.js';
import { JSONBackend } from '../../src/backends/json-backend.js';
import { createMockSMT2Client, createMockJSONClient } from '../helpers/mock-openai.js';
import { createUnsatMock, createSatMock } from '../helpers/z3-mock.js';
import { reasoningFixtures, smt2Fixtures } from '../helpers/fixtures.js';
import type { SMT2Formula, JSONFormula } from '../../src/types/index.js';

describe('Backend Workflow Integration Tests', () => {
  describe('SMT2Backend Workflow', () => {
    it('should complete full translation-verification-explanation workflow', async () => {
      const mockClient = createMockSMT2Client();
      const mockZ3 = createUnsatMock();
      const backend = new SMT2Backend({
        client: mockClient,
        z3Adapter: mockZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      const { question, context } = reasoningFixtures.socrates;

      // Step 1: Translate
      const formula = await backend.translate(question, context);
      expect(formula).toBeTruthy();
      expect(typeof formula).toBe('string');

      // Step 2: Verify
      const result = await backend.verify(formula as SMT2Formula);
      expect(result).toBeDefined();
      expect(result.result).toBe('unsat');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);

      // Step 3: Explain
      const explanation = await backend.explain(result, question, context);
      expect(explanation).toBeTruthy();
      expect(typeof explanation).toBe('string');
    });

    it('should handle sat results with model extraction', async () => {
      const mockClient = createMockSMT2Client();
      const mockZ3 = createSatMock('(model\n  (define-fun x () Int 15)\n)');
      const backend = new SMT2Backend({
        client: mockClient,
        z3Adapter: mockZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      const formula = await backend.translate('Is x > 10?', 'x = 15');
      const result = await backend.verify(formula as SMT2Formula);

      expect(result.result).toBe('sat');
      expect(result.rawOutput).toBeTruthy();

      const explanation = await backend.explain(result, 'Is x > 10?', 'x = 15');
      expect(explanation).toBeTruthy();
    });

    it('should preserve formula structure through workflow', async () => {
      const mockClient = createMockSMT2Client(
        '```smt2\n' + smt2Fixtures.simple + '\n```'
      );
      const mockZ3 = createUnsatMock();
      const backend = new SMT2Backend({
        client: mockClient,
        z3Adapter: mockZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      const formula = await backend.translate('test', 'test');

      // Check that formula is extracted from code blocks
      expect(formula).toContain('(declare-const');
      expect(formula).not.toContain('```');
    });
  });

  describe('JSONBackend Workflow', () => {
    it('should complete full translation-verification-explanation workflow', async () => {
      const mockClient = createMockJSONClient();
      const mockZ3 = createUnsatMock();
      const backend = new JSONBackend({
        client: mockClient,
        z3Adapter: mockZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      const { question, context } = reasoningFixtures.socrates;

      // Step 1: Translate
      const formula = await backend.translate(question, context);
      expect(formula).toBeTruthy();

      // Step 2: Verify
      const result = await backend.verify(formula as JSONFormula);
      expect(result).toBeDefined();
      expect(result.result).toBe('unsat');

      // Step 3: Explain
      const explanation = await backend.explain(result, question, context);
      expect(explanation).toBeTruthy();
    });

    it('should validate JSON DSL schema', async () => {
      const mockClient = createMockJSONClient();
      const mockZ3 = createUnsatMock();
      const backend = new JSONBackend({
        client: mockClient,
        z3Adapter: mockZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      const formula = await backend.translate('test', 'test');

      // Formula is already a parsed JSONProgram object
      const parsed = formula as unknown as Record<string, unknown>;
      expect(parsed).toHaveProperty('sorts');
      expect(parsed).toHaveProperty('verifications');
      expect(typeof parsed.verifications).toBe('object');
    });
  });

  describe('Backend Comparison', () => {
    it('should produce consistent verification results across backends', async () => {
      const { question, context } = reasoningFixtures.socrates;

      // SMT2 Backend
      const smt2Client = createMockSMT2Client();
      const smt2Z3 = createUnsatMock();
      const smt2Backend = new SMT2Backend({
        client: smt2Client,
        z3Adapter: smt2Z3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      // JSON Backend
      const jsonClient = createMockJSONClient();
      const jsonZ3 = createUnsatMock();
      const jsonBackend = new JSONBackend({
        client: jsonClient,
        z3Adapter: jsonZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      // Run both backends
      const smt2Formula = await smt2Backend.translate(question, context);
      const smt2Result = await smt2Backend.verify(smt2Formula as SMT2Formula);

      const jsonFormula = await jsonBackend.translate(question, context);
      const jsonResult = await jsonBackend.verify(jsonFormula as JSONFormula);

      // Both should produce same verification result
      expect(smt2Result.result).toBe(jsonResult.result);
      expect(smt2Result.result).toBe('unsat');
    });
  });

  describe('Error Recovery', () => {
    it('should handle malformed LLM responses', async () => {
      const mockClient = createMockSMT2Client('Invalid response without code blocks');
      const mockZ3 = createUnsatMock();
      const backend = new SMT2Backend({
        client: mockClient,
        z3Adapter: mockZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      await expect(backend.translate('test', 'test')).rejects.toThrow();
    });

    it('should handle Z3 verification failures', async () => {
      const mockClient = createMockSMT2Client();
      const failingZ3 = createUnsatMock();
      failingZ3.executeSMT2 = async () => {
        throw new Error('Z3 execution failed');
      };
      const backend = new SMT2Backend({
        client: mockClient,
        z3Adapter: failingZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      const formula = await backend.translate('test', 'test');
      await expect(backend.verify(formula as SMT2Formula)).rejects.toThrow();
    });
  });

  describe('Performance Metrics', () => {
    it('should track execution time for each step', async () => {
      const mockClient = createMockSMT2Client();
      const mockZ3 = createUnsatMock();
      const backend = new SMT2Backend({
        client: mockClient,
        z3Adapter: mockZ3,
        model: 'gpt-4o',
        temperature: 0.0,
        maxTokens: 4096,
      });

      const startTranslate = Date.now();
      const formula = await backend.translate('test', 'test');
      const translateTime = Date.now() - startTranslate;

      const startVerify = Date.now();
      const result = await backend.verify(formula as SMT2Formula);
      const verifyTime = Date.now() - startVerify;

      const startExplain = Date.now();
      await backend.explain(result, 'test', 'test');
      const explainTime = Date.now() - startExplain;

      // All steps should complete reasonably fast in tests
      expect(translateTime).toBeLessThan(5000);
      expect(verifyTime).toBeLessThan(5000);
      expect(explainTime).toBeLessThan(5000);

      // Result should contain execution time
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });
});
