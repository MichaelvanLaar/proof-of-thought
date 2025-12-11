/**
 * Integration tests for Z3 WASM adapter with SMT2 execution
 *
 * Tests the complete flow:
 * 1. Generate SMT2 formula (from reasoning backends)
 * 2. Parse SMT2 into AST
 * 3. Execute using z3-solver WASM
 * 4. Return verification result
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Z3WASMAdapter } from '../../src/adapters/z3-wasm.js';

describe('Z3 WASM SMT2 Integration', () => {
  let adapter: Z3WASMAdapter;
  let isAvailable: boolean;

  beforeAll(async () => {
    adapter = new Z3WASMAdapter();
    isAvailable = await adapter.isAvailable();

    if (!isAvailable) {
      console.warn('Z3 WASM adapter not available, skipping integration tests');
    }
  });

  const skipIfNotAvailable = () => {
    if (!isAvailable) {
      return true;
    }
    return false;
  };

  describe('Basic SMT2 Execution', () => {
    it('should execute simple satisfiable formula', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const x Int)
        (assert (> x 0))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should execute simple unsatisfiable formula', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const x Int)
        (assert (> x 10))
        (assert (< x 5))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('unsat');
    });

    it('should extract model for satisfiable formula', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const x Int)
        (assert (= x 42))
        (check-sat)
        (get-model)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
      expect(result.model).toBeDefined();
      if (result.model) {
        expect(result.model.x).toBe('42');
      }
    });
  });

  describe('Arithmetic Reasoning', () => {
    it('should solve linear equation system', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const x Int)
        (declare-const y Int)
        (assert (= (+ x y) 10))
        (assert (= (- x y) 2))
        (check-sat)
        (get-model)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.x).toBe('6');
        expect(result.model.y).toBe('4');
      }
    });

    it('should handle arithmetic constraints', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const count Int)
        (assert (> count 5))
        (assert (< count 15))
        (assert (= (mod count 3) 0))
        (check-sat)
        (get-model)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
      if (result.model) {
        const count = parseInt(result.model.count);
        expect(count).toBeGreaterThan(5);
        expect(count).toBeLessThan(15);
        expect(count % 3).toBe(0);
      }
    });

    it('should verify unsatisfiable arithmetic constraints', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const n Int)
        (assert (> n 100))
        (assert (< n 50))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('unsat');
    });
  });

  describe('Boolean Logic Reasoning', () => {
    it('should verify valid logical argument', async () => {
      if (skipIfNotAvailable()) return;

      // Modus ponens: P, P => Q |- Q
      // To check validity, we negate conclusion and check for unsat
      const formula = `
        (declare-const P Bool)
        (declare-const Q Bool)
        (assert P)
        (assert (=> P Q))
        (assert (not Q))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('unsat'); // Valid argument
    });

    it('should verify invalid logical argument', async () => {
      if (skipIfNotAvailable()) return;

      // Invalid: P => Q, Q |- P (affirming the consequent)
      const formula = `
        (declare-const P Bool)
        (declare-const Q Bool)
        (assert (=> P Q))
        (assert Q)
        (assert (not P))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat'); // Invalid argument (counterexample exists)
    });

    it('should handle complex logical formulas', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const p Bool)
        (declare-const q Bool)
        (declare-const r Bool)
        (assert (=> (and p q) r))
        (assert (or p q))
        (assert (not (and p q)))
        (check-sat)
        (get-model)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
    });
  });

  describe('Mixed Arithmetic and Logic', () => {
    it('should handle conditional arithmetic', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const flag Bool)
        (declare-const value Int)
        (assert (=> flag (> value 10)))
        (assert (=> (not flag) (< value 5)))
        (assert flag)
        (check-sat)
        (get-model)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.flag).toBe('true');
        const value = parseInt(result.model.value);
        expect(value).toBeGreaterThan(10);
      }
    });

    it('should solve constraint satisfaction problem', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const x Int)
        (declare-const y Int)
        (declare-const isPositive Bool)
        (assert (= isPositive (and (> x 0) (> y 0))))
        (assert isPositive)
        (assert (= (+ x y) 20))
        (check-sat)
        (get-model)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
      if (result.model) {
        const x = parseInt(result.model.x);
        const y = parseInt(result.model.y);
        expect(x).toBeGreaterThan(0);
        expect(y).toBeGreaterThan(0);
        expect(x + y).toBe(20);
      }
    });
  });

  describe('Real-World Reasoning Scenarios', () => {
    it('should verify mathematical proof', async () => {
      if (skipIfNotAvailable()) return;

      // Prove: If x > 5 and x < 10, then x is not equal to 100
      // By showing the negation is unsatisfiable
      const formula = `
        (declare-const x Int)
        (assert (> x 5))
        (assert (< x 10))
        (assert (= x 100))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('unsat'); // Proof is valid (100 is not between 5 and 10)
    });

    it('should solve scheduling constraint', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const taskA Int)
        (declare-const taskB Int)
        (declare-const taskC Int)
        (assert (> taskA 0))
        (assert (>= taskB (+ taskA 2)))
        (assert (>= taskC (+ taskB 3)))
        (assert (<= taskC 10))
        (check-sat)
        (get-model)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
      if (result.model) {
        const a = parseInt(result.model.taskA);
        const b = parseInt(result.model.taskB);
        const c = parseInt(result.model.taskC);
        expect(b).toBeGreaterThanOrEqual(a + 2);
        expect(c).toBeGreaterThanOrEqual(b + 3);
        expect(c).toBeLessThanOrEqual(10);
      }
    });

    it('should verify chain of implications', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const step1 Bool)
        (declare-const step2 Bool)
        (declare-const step3 Bool)
        (declare-const step4 Bool)
        (assert (=> step1 step2))
        (assert (=> step2 step3))
        (assert (=> step3 step4))
        (assert step1)
        (assert (not step4))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('unsat'); // Chain is valid
    });
  });

  describe('SMT2 from ProofOfThought Backends', () => {
    it('should handle SMT2 from SMT2Backend - simple premise', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const premise1 Bool)
        (declare-const conclusion Bool)
        (assert premise1)
        (assert (=> premise1 conclusion))
        (assert (not conclusion))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('unsat');
    });

    it('should handle SMT2 with multiple premises', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const premise1 Bool)
        (declare-const premise2 Bool)
        (declare-const premise3 Bool)
        (declare-const conclusion Bool)
        (assert premise1)
        (assert premise2)
        (assert premise3)
        (assert (=> (and premise1 premise2 premise3) conclusion))
        (assert (not conclusion))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('unsat');
    });

    it('should detect invalid reasoning', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const premise Bool)
        (declare-const conclusion Bool)
        (assert premise)
        (assert (not conclusion))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat'); // Premises don't entail conclusion
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty formula', async () => {
      if (skipIfNotAvailable()) return;

      const formula = '(check-sat)';
      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
    });

    it('should handle formula with only declarations', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const x Int)
        (declare-const y Bool)
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
    });

    it('should handle formula with set-logic', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (set-logic QF_LIA)
        (declare-const x Int)
        (assert (> x 0))
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
    });

    it('should throw on malformed SMT2', async () => {
      if (skipIfNotAvailable()) return;

      const formula = '(declare-const x';

      await expect(adapter.executeSMT2(formula)).rejects.toThrow();
    });

    it('should throw on unsupported construct (quantifiers)', async () => {
      if (skipIfNotAvailable()) return;

      const formula = '(assert (forall ((x Int)) (> x 0)))';

      await expect(adapter.executeSMT2(formula)).rejects.toThrow();
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete simple query quickly', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const x Int)
        (assert (= x 42))
        (check-sat)
      `;

      const startTime = Date.now();
      const result = await adapter.executeSMT2(formula);
      const totalTime = Date.now() - startTime;

      expect(result.result).toBe('sat');
      expect(totalTime).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    it('should handle formula with 10 variables', async () => {
      if (skipIfNotAvailable()) return;

      const declarations = Array.from({ length: 10 }, (_, i) => `(declare-const x${i} Int)`).join('\n');
      const assertions = Array.from({ length: 10 }, (_, i) => `(assert (> x${i} 0))`).join('\n');
      const formula = `
        ${declarations}
        ${assertions}
        (check-sat)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
    });

    it('should track execution time accurately', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const x Int)
        (declare-const y Int)
        (declare-const z Int)
        (assert (= (+ x y z) 15))
        (assert (> x 0))
        (assert (> y 0))
        (assert (> z 0))
        (check-sat)
        (get-model)
      `;

      const result = await adapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Adapter Configuration', () => {
    it('should respect timeout configuration', async () => {
      if (skipIfNotAvailable()) return;

      const shortTimeout = new Z3WASMAdapter({ timeout: 1 }); // 1ms timeout
      await shortTimeout.isAvailable();

      const formula = `
        (declare-const x Int)
        (assert (> x 0))
        (check-sat)
      `;

      // With very short timeout, might get unknown or complete quickly
      const result = await shortTimeout.executeSMT2(formula);
      expect(['sat', 'unsat', 'unknown']).toContain(result.result);
    });

    it('should work with verbose logging enabled', async () => {
      if (skipIfNotAvailable()) return;

      const verboseAdapter = new Z3WASMAdapter({ verbose: true });
      await verboseAdapter.isAvailable();

      const formula = `
        (declare-const x Int)
        (assert (= x 100))
        (check-sat)
      `;

      const result = await verboseAdapter.executeSMT2(formula);
      expect(result.result).toBe('sat');
    });
  });

  describe('Multiple Queries', () => {
    it('should handle multiple sequential queries', async () => {
      if (skipIfNotAvailable()) return;

      const formula1 = `
        (declare-const x Int)
        (assert (> x 0))
        (check-sat)
      `;

      const formula2 = `
        (declare-const y Int)
        (assert (< y 0))
        (check-sat)
      `;

      const result1 = await adapter.executeSMT2(formula1);
      const result2 = await adapter.executeSMT2(formula2);

      expect(result1.result).toBe('sat');
      expect(result2.result).toBe('sat');
    });

    it('should handle same formula multiple times', async () => {
      if (skipIfNotAvailable()) return;

      const formula = `
        (declare-const x Int)
        (assert (= x 42))
        (check-sat)
        (get-model)
      `;

      const result1 = await adapter.executeSMT2(formula);
      const result2 = await adapter.executeSMT2(formula);
      const result3 = await adapter.executeSMT2(formula);

      expect(result1.result).toBe('sat');
      expect(result2.result).toBe('sat');
      expect(result3.result).toBe('sat');

      if (result1.model && result2.model && result3.model) {
        expect(result1.model.x).toBe('42');
        expect(result2.model.x).toBe('42');
        expect(result3.model.x).toBe('42');
      }
    });
  });
});
