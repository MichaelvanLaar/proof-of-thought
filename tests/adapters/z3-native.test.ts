/**
 * Tests for Z3 Native Adapter
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Z3NativeAdapter } from '../../src/adapters/z3-native.js';
import { Z3NotAvailableError, Z3TimeoutError } from '../../src/types/errors.js';

describe('Z3NativeAdapter', () => {
  let adapter: Z3NativeAdapter;

  beforeEach(() => {
    adapter = new Z3NativeAdapter({ timeout: 5000 });
  });

  afterEach(async () => {
    await adapter.dispose();
  });

  describe('initialization', () => {
    it('should check if Z3 is available', async () => {
      const available = await adapter.isAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should get Z3 version if available', async () => {
      const available = await adapter.isAvailable();
      if (available) {
        const version = await adapter.getVersion();
        expect(version).toMatch(/^\d+\.\d+/);
      }
    });
  });

  describe('SMT2 execution', () => {
    it('should execute simple satisfiable formula', async () => {
      const available = await adapter.isAvailable();
      if (!available) {
        console.log('Skipping test: Z3 not available');
        return;
      }

      const formula = `(declare-const x Int)
(assert (= x 5))
(check-sat)
(get-model)`;

      const result = await adapter.executeSMT2(formula);

      expect(result.result).toBe('sat');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.rawOutput).toBeTruthy();
    });

    it('should execute unsatisfiable formula', async () => {
      const available = await adapter.isAvailable();
      if (!available) {
        console.log('Skipping test: Z3 not available');
        return;
      }

      const formula = `(declare-const x Int)
(assert (= x 5))
(assert (= x 10))
(check-sat)`;

      const result = await adapter.executeSMT2(formula);

      expect(result.result).toBe('unsat');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should extract model from satisfiable formula', async () => {
      const available = await adapter.isAvailable();
      if (!available) {
        console.log('Skipping test: Z3 not available');
        return;
      }

      const formula = `(declare-const x Int)
(declare-const y Bool)
(assert (= x 42))
(assert (= y true))
(check-sat)
(get-model)`;

      const result = await adapter.executeSMT2(formula);

      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.x).toBe(42);
        expect(result.model.y).toBe(true);
      }
    });

    it('should handle timeout correctly', async () => {
      const available = await adapter.isAvailable();
      if (!available) {
        console.log('Skipping test: Z3 not available');
        return;
      }

      const shortTimeoutAdapter = new Z3NativeAdapter({ timeout: 100 });

      // Create a complex formula that might timeout
      const formula = `(declare-const x Int)
(declare-const y Int)
${Array.from({ length: 1000 }, (_, i) => `(assert (> x ${i}))`).join('\n')}
(check-sat)`;

      await expect(shortTimeoutAdapter.executeSMT2(formula)).rejects.toThrow(Z3TimeoutError);

      await shortTimeoutAdapter.dispose();
    });
  });

  describe('error handling', () => {
    it('should throw Z3NotAvailableError for invalid Z3 path', async () => {
      const invalidAdapter = new Z3NativeAdapter({ z3Path: '/nonexistent/z3' });

      await expect(invalidAdapter.executeSMT2('(check-sat)')).rejects.toThrow(
        Z3NotAvailableError
      );

      await invalidAdapter.dispose();
    });

    it('should handle malformed SMT2 formulas gracefully', async () => {
      const available = await adapter.isAvailable();
      if (!available) {
        console.log('Skipping test: Z3 not available');
        return;
      }

      const malformedFormula = '(this is not valid smt2)';

      await expect(adapter.executeSMT2(malformedFormula)).rejects.toThrow();
    });
  });

  describe('lifecycle', () => {
    it('should initialize only once', async () => {
      await adapter.initialize();
      await adapter.initialize(); // Should not throw
      expect(true).toBe(true);
    });

    it('should dispose cleanly', async () => {
      await adapter.initialize();
      await adapter.dispose();
      expect(true).toBe(true);
    });
  });
});
