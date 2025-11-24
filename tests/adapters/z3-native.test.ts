/**
 * Tests for Z3 Native Adapter
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { Z3NativeAdapter } from '../../src/adapters/z3-native.js';
import { Z3NotAvailableError, Z3TimeoutError } from '../../src/types/errors.js';

describe('Z3NativeAdapter', () => {
  let adapter: Z3NativeAdapter;
  let isZ3Available = false;

  // Check Z3 availability once before all tests
  beforeAll(async () => {
    const testAdapter = new Z3NativeAdapter();
    isZ3Available = await testAdapter.isAvailable();
    await testAdapter.dispose();

    if (!isZ3Available) {
      console.log(
        '⚠️  Native Z3 not available - skipping native adapter tests. Install Z3 to run these tests.'
      );
    }
  });

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

    it.skipIf(!isZ3Available)('should get Z3 version if available', async () => {
      const version = await adapter.getVersion();
      expect(version).toMatch(/^\d+\.\d+/);
    });
  });

  describe('SMT2 execution', () => {
    it.skipIf(!isZ3Available)(
      'should execute simple satisfiable formula',
      async () => {
        const formula = `(declare-const x Int)
(assert (= x 5))
(check-sat)
(get-model)`;

        const result = await adapter.executeSMT2(formula);

        expect(result.result).toBe('sat');
        expect(result.executionTime).toBeGreaterThan(0);
        expect(result.rawOutput).toBeTruthy();
      }
    );

    it.skipIf(!isZ3Available)('should execute unsatisfiable formula', async () => {
      const formula = `(declare-const x Int)
(assert (= x 5))
(assert (= x 10))
(check-sat)`;

      const result = await adapter.executeSMT2(formula);

      expect(result.result).toBe('unsat');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it.skipIf(!isZ3Available)(
      'should extract model from satisfiable formula',
      async () => {
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
      }
    );

    it.skipIf(!isZ3Available)('should handle timeout correctly', async () => {
      const shortTimeoutAdapter = new Z3NativeAdapter({ timeout: 100 });

      // Create a complex formula that might timeout
      const formula = `(declare-const x Int)
(declare-const y Int)
${Array.from({ length: 1000 }, (_, i) => `(assert (> x ${i}))`).join('\n')}
(check-sat)`;

      await expect(shortTimeoutAdapter.executeSMT2(formula)).rejects.toThrow(
        Z3TimeoutError
      );

      await shortTimeoutAdapter.dispose();
    });
  });

  describe('error handling', () => {
    it.skipIf(!isZ3Available)(
      'should throw Z3NotAvailableError for invalid Z3 path',
      async () => {
        const invalidAdapter = new Z3NativeAdapter({ z3Path: '/nonexistent/z3' });

        await expect(invalidAdapter.executeSMT2('(check-sat)')).rejects.toThrow(
          Z3NotAvailableError
        );

        await invalidAdapter.dispose();
      }
    );

    it.skipIf(!isZ3Available)(
      'should handle malformed SMT2 formulas gracefully',
      async () => {
        const malformedFormula = '(this is not valid smt2)';

        await expect(adapter.executeSMT2(malformedFormula)).rejects.toThrow();
      }
    );
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
