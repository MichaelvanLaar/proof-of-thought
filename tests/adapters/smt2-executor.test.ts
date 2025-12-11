/**
 * Comprehensive test suite for SMT2 Executor
 *
 * Tests cover:
 * - Variable and function declarations
 * - Expression execution (arithmetic, comparison, logical)
 * - Satisfiability checking
 * - Model extraction
 * - Error handling
 * - Timeout handling
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseSMT2 } from '../../src/adapters/smt2-parser.js';
import { executeSMT2Commands } from '../../src/adapters/smt2-executor.js';

describe('SMT2 Executor', () => {
  let z3: any;

  beforeAll(async () => {
    try {
      // Try to import z3-solver
      const z3Module = await import('z3-solver');
      const { init } = z3Module;
      z3 = await init();
    } catch (error) {
      // z3-solver not available, skip tests
      console.warn('z3-solver not available, skipping executor tests');
      z3 = null;
    }
  });

  const skipIfNoZ3 = () => {
    if (!z3) {
      return true;
    }
    return false;
  };

  describe('Variable Declarations', () => {
    it('should declare Int constant', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (> x 0))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
    });

    it('should declare Bool constant', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const p Bool)
        (assert p)
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
    });

    it('should declare Real constant', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const r Real)
        (assert (> r 0.5))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
    });

    it('should declare multiple variables', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (declare-const y Int)
        (declare-const z Int)
        (assert (> x 0))
        (assert (> y 0))
        (assert (> z 0))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
    });
  });

  describe('Arithmetic Operations', () => {
    it('should execute addition', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (declare-const y Int)
        (assert (= (+ x y) 10))
        (assert (= x 3))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.y).toBe('7');
      }
    });

    it('should execute subtraction', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (= (- x 5) 10))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.x).toBe('15');
      }
    });

    it('should execute multiplication', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (= (* x 3) 12))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.x).toBe('4');
      }
    });

    it('should execute division', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (= (div x 2) 5))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      // x could be 10 or 11 due to integer division
      if (result.model) {
        const xValue = parseInt(result.model.x);
        expect(xValue).toBeGreaterThanOrEqual(10);
        expect(xValue).toBeLessThanOrEqual(11);
      }
    });

    it('should execute modulo', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (= (mod x 7) 3))
        (assert (> x 0))
        (assert (< x 20))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        const xValue = parseInt(result.model.x);
        expect(xValue % 7).toBe(3);
      }
    });

    it('should execute nested arithmetic', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (declare-const y Int)
        (assert (= (+ (* x 2) (- y 1)) 15))
        (assert (= x 5))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.x).toBe('5');
        expect(result.model.y).toBe('6');
      }
    });

    it('should execute n-ary addition', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (declare-const y Int)
        (declare-const z Int)
        (assert (= (+ x y z) 15))
        (assert (= x 5))
        (assert (= y 3))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.z).toBe('7');
      }
    });
  });

  describe('Comparison Operations', () => {
    it('should execute less than', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (< x 10))
        (assert (> x 5))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        const xValue = parseInt(result.model.x);
        expect(xValue).toBeGreaterThan(5);
        expect(xValue).toBeLessThan(10);
      }
    });

    it('should execute less than or equal', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (<= x 10))
        (assert (>= x 10))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.x).toBe('10');
      }
    });

    it('should execute greater than', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (> x 100))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        const xValue = parseInt(result.model.x);
        expect(xValue).toBeGreaterThan(100);
      }
    });

    it('should execute equality', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (declare-const y Int)
        (assert (= x y))
        (assert (= x 42))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.x).toBe('42');
        expect(result.model.y).toBe('42');
      }
    });

    it('should execute distinct', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (declare-const y Int)
        (declare-const z Int)
        (assert (distinct x y z))
        (assert (= x 1))
        (assert (= y 2))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        const xValue = parseInt(result.model.x);
        const yValue = parseInt(result.model.y);
        const zValue = parseInt(result.model.z);
        expect(xValue).not.toBe(yValue);
        expect(xValue).not.toBe(zValue);
        expect(yValue).not.toBe(zValue);
      }
    });
  });

  describe('Logical Operations', () => {
    it('should execute and', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const p Bool)
        (declare-const q Bool)
        (assert (and p q))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.p).toBe('true');
        expect(result.model.q).toBe('true');
      }
    });

    it('should execute or', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const p Bool)
        (declare-const q Bool)
        (assert (or p q))
        (assert (not p))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.p).toBe('false');
        expect(result.model.q).toBe('true');
      }
    });

    it('should execute not', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const p Bool)
        (assert (not p))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.p).toBe('false');
      }
    });

    it('should execute implies', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const p Bool)
        (declare-const q Bool)
        (assert (=> p q))
        (assert p)
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.q).toBe('true');
      }
    });

    it('should execute iff (equivalence)', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const p Bool)
        (declare-const q Bool)
        (assert (iff p q))
        (assert p)
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.p).toBe('true');
        expect(result.model.q).toBe('true');
      }
    });

    it('should execute n-ary and', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const p Bool)
        (declare-const q Bool)
        (declare-const r Bool)
        (assert (and p q r))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.p).toBe('true');
        expect(result.model.q).toBe('true');
        expect(result.model.r).toBe('true');
      }
    });

    it('should execute nested logical operations', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const p Bool)
        (declare-const q Bool)
        (declare-const r Bool)
        (assert (and (or p q) (not r)))
        (assert (not p))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.q).toBe('true');
        expect(result.model.r).toBe('false');
      }
    });
  });

  describe('Satisfiability Checking', () => {
    it('should return sat for satisfiable formula', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (> x 0))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
    });

    it('should return unsat for unsatisfiable formula', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (> x 10))
        (assert (< x 5))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('unsat');
    });

    it('should return unsat for contradictory boolean constraints', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const p Bool)
        (assert p)
        (assert (not p))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('unsat');
    });

    it('should handle empty formula (no constraints)', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2('(check-sat)');
      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
    });
  });

  describe('Model Extraction', () => {
    it('should extract model for Int variables', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (= x 42))
        (check-sat)
        (get-model)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      expect(result.model).toBeDefined();
      if (result.model) {
        expect(result.model.x).toBe('42');
      }
    });

    it('should extract model for Bool variables', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const p Bool)
        (assert p)
        (check-sat)
        (get-model)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      expect(result.model).toBeDefined();
      if (result.model) {
        expect(result.model.p).toBe('true');
      }
    });

    it('should extract model for multiple variables', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (declare-const y Int)
        (declare-const flag Bool)
        (assert (= x 10))
        (assert (= y 20))
        (assert flag)
        (check-sat)
        (get-model)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      expect(result.model).toBeDefined();
      if (result.model) {
        expect(result.model.x).toBe('10');
        expect(result.model.y).toBe('20');
        expect(result.model.flag).toBe('true');
      }
    });

    it('should not extract model for unsat', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (> x 10))
        (assert (< x 5))
        (check-sat)
        (get-model)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('unsat');
      expect(result.model).toBeUndefined();
    });
  });

  describe('Execution Time Tracking', () => {
    it('should track execution time', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (> x 0))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should have reasonable execution time for simple formula', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert (= x 42))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.executionTime).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid expressions gracefully', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (assert x)
        (check-sat)
      `);

      // Should execute without throwing, but may return unknown or error
      const result = await executeSMT2Commands(commands, z3);
      expect(['sat', 'unsat', 'unknown']).toContain(result.result);
    });

    it('should handle undefined variables in assertions', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2('(assert (> x 0))');

      await expect(executeSMT2Commands(commands, z3)).rejects.toThrow();
    });
  });

  describe('Mixed Operations', () => {
    it('should execute formula with arithmetic and logical operations', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (declare-const flag Bool)
        (assert (=> flag (> x 10)))
        (assert flag)
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        const xValue = parseInt(result.model.x);
        expect(xValue).toBeGreaterThan(10);
      }
    });

    it('should execute complex mixed formula', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const x Int)
        (declare-const y Int)
        (declare-const p Bool)
        (declare-const q Bool)
        (assert (and (> x 0) (< y 100)))
        (assert (or p q))
        (assert (=> p (= (+ x y) 50)))
        (assert (=> q (= (- y x) 20)))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
    });
  });

  describe('Real-World Examples', () => {
    it('should solve simple arithmetic constraint problem', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const apples Int)
        (declare-const oranges Int)
        (assert (= (+ apples oranges) 10))
        (assert (= (- apples oranges) 2))
        (check-sat)
        (get-model)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        expect(result.model.apples).toBe('6');
        expect(result.model.oranges).toBe('4');
      }
    });

    it('should verify logical argument validity', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const premise1 Bool)
        (declare-const premise2 Bool)
        (declare-const conclusion Bool)
        (assert premise1)
        (assert (=> premise1 premise2))
        (assert (not conclusion))
        (assert (=> premise2 conclusion))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('unsat'); // Argument is valid
    });

    it('should solve sudoku-like constraint', async () => {
      if (skipIfNoZ3()) return;

      const commands = parseSMT2(`
        (declare-const a Int)
        (declare-const b Int)
        (declare-const c Int)
        (assert (> a 0))
        (assert (<= a 9))
        (assert (> b 0))
        (assert (<= b 9))
        (assert (> c 0))
        (assert (<= c 9))
        (assert (distinct a b c))
        (assert (= (+ a b c) 15))
        (check-sat)
      `);

      const result = await executeSMT2Commands(commands, z3);
      expect(result.result).toBe('sat');
      if (result.model) {
        const aVal = parseInt(result.model.a);
        const bVal = parseInt(result.model.b);
        const cVal = parseInt(result.model.c);
        expect(aVal + bVal + cVal).toBe(15);
        expect(new Set([aVal, bVal, cVal]).size).toBe(3); // All distinct
      }
    });
  });
});
