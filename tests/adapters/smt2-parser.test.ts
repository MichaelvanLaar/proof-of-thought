/**
 * Comprehensive test suite for SMT2 Parser
 *
 * Tests cover:
 * - Command parsing (declare-const, declare-fun, assert, check-sat, get-model, set-logic)
 * - Expression parsing (variables, constants, applications)
 * - Type parsing (Int, Bool, Real, function types)
 * - Error handling (parse errors, unsupported constructs)
 * - Edge cases (nested expressions, whitespace, comments)
 */

import { describe, it, expect } from 'vitest';
import {
  parseSMT2,
  SMT2ParseError,
  SMT2UnsupportedError,
  type SMT2Command,
  type SMT2Expr,
} from '../../src/adapters/smt2-parser.js';

describe('SMT2 Parser', () => {
  describe('Command Parsing - declare-const', () => {
    it('should parse simple Int constant declaration', () => {
      const result = parseSMT2('(declare-const x Int)');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'declare-const',
        name: 'x',
        sort: 'Int',
      });
    });

    it('should parse Bool constant declaration', () => {
      const result = parseSMT2('(declare-const flag Bool)');
      expect(result).toEqual([
        { type: 'declare-const', name: 'flag', sort: 'Bool' },
      ]);
    });

    it('should parse Real constant declaration', () => {
      const result = parseSMT2('(declare-const pi Real)');
      expect(result).toEqual([
        { type: 'declare-const', name: 'pi', sort: 'Real' },
      ]);
    });

    it('should parse multiple constant declarations', () => {
      const result = parseSMT2(`
        (declare-const x Int)
        (declare-const y Int)
        (declare-const z Bool)
      `);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'declare-const', name: 'x', sort: 'Int' });
      expect(result[1]).toEqual({ type: 'declare-const', name: 'y', sort: 'Int' });
      expect(result[2]).toEqual({ type: 'declare-const', name: 'z', sort: 'Bool' });
    });

    it('should handle variable names with underscores and numbers', () => {
      const result = parseSMT2('(declare-const var_123 Int)');
      expect(result).toEqual([
        { type: 'declare-const', name: 'var_123', sort: 'Int' },
      ]);
    });
  });

  describe('Command Parsing - declare-fun', () => {
    it('should parse zero-argument function (constant)', () => {
      const result = parseSMT2('(declare-fun f () Int)');
      expect(result).toEqual([
        { type: 'declare-fun', name: 'f', params: [], return: 'Int' },
      ]);
    });

    it('should parse single-argument function', () => {
      const result = parseSMT2('(declare-fun f (Int) Bool)');
      expect(result).toEqual([
        { type: 'declare-fun', name: 'f', params: ['Int'], return: 'Bool' },
      ]);
    });

    it('should parse multi-argument function', () => {
      const result = parseSMT2('(declare-fun add (Int Int) Int)');
      expect(result).toEqual([
        { type: 'declare-fun', name: 'add', params: ['Int', 'Int'], return: 'Int' },
      ]);
    });

    it('should parse function with mixed types', () => {
      const result = parseSMT2('(declare-fun cmp (Int Real Bool) Bool)');
      expect(result).toEqual([
        {
          type: 'declare-fun',
          name: 'cmp',
          params: ['Int', 'Real', 'Bool'],
          return: 'Bool',
        },
      ]);
    });
  });

  describe('Command Parsing - assert', () => {
    it('should parse assert with variable', () => {
      const result = parseSMT2('(assert x)');
      expect(result).toEqual([
        { type: 'assert', expr: { type: 'var', name: 'x' } },
      ]);
    });

    it('should parse assert with boolean constant', () => {
      const result = parseSMT2('(assert true)');
      expect(result).toEqual([
        { type: 'assert', expr: { type: 'const', value: true } },
      ]);
    });

    it('should parse assert with numeric constant', () => {
      const result = parseSMT2('(assert 42)');
      expect(result).toEqual([
        { type: 'assert', expr: { type: 'const', value: 42 } },
      ]);
    });

    it('should parse assert with simple application', () => {
      const result = parseSMT2('(assert (> x 0))');
      expect(result[0]).toEqual({
        type: 'assert',
        expr: {
          type: 'app',
          op: '>',
          args: [{ type: 'var', name: 'x' }, { type: 'const', value: 0 }],
        },
      });
    });

    it('should parse assert with nested applications', () => {
      const result = parseSMT2('(assert (and (> x 0) (< x 10)))');
      expect(result[0]).toEqual({
        type: 'assert',
        expr: {
          type: 'app',
          op: 'and',
          args: [
            {
              type: 'app',
              op: '>',
              args: [{ type: 'var', name: 'x' }, { type: 'const', value: 0 }],
            },
            {
              type: 'app',
              op: '<',
              args: [{ type: 'var', name: 'x' }, { type: 'const', value: 10 }],
            },
          ],
        },
      });
    });
  });

  describe('Command Parsing - check-sat and get-model', () => {
    it('should parse check-sat command', () => {
      const result = parseSMT2('(check-sat)');
      expect(result).toEqual([{ type: 'check-sat' }]);
    });

    it('should parse get-model command', () => {
      const result = parseSMT2('(get-model)');
      expect(result).toEqual([{ type: 'get-model' }]);
    });

    it('should parse check-sat and get-model together', () => {
      const result = parseSMT2(`
        (check-sat)
        (get-model)
      `);
      expect(result).toEqual([{ type: 'check-sat' }, { type: 'get-model' }]);
    });
  });

  describe('Command Parsing - set-logic', () => {
    it('should parse set-logic command', () => {
      const result = parseSMT2('(set-logic QF_LIA)');
      expect(result).toEqual([{ type: 'set-logic', logic: 'QF_LIA' }]);
    });

    it('should parse various logic names', () => {
      const logics = ['QF_LIA', 'QF_LIRA', 'QF_NIA', 'QF_BV', 'ALL'];
      logics.forEach((logic) => {
        const result = parseSMT2(`(set-logic ${logic})`);
        expect(result).toEqual([{ type: 'set-logic', logic }]);
      });
    });
  });

  describe('Expression Parsing - Arithmetic Operations', () => {
    it('should parse addition', () => {
      const result = parseSMT2('(assert (+ x y))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '+',
        args: [{ type: 'var', name: 'x' }, { type: 'var', name: 'y' }],
      });
    });

    it('should parse subtraction', () => {
      const result = parseSMT2('(assert (- x 5))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '-',
        args: [{ type: 'var', name: 'x' }, { type: 'const', value: 5 }],
      });
    });

    it('should parse multiplication', () => {
      const result = parseSMT2('(assert (* x 2))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '*',
        args: [{ type: 'var', name: 'x' }, { type: 'const', value: 2 }],
      });
    });

    it('should parse division', () => {
      const result = parseSMT2('(assert (div x 3))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: 'div',
        args: [{ type: 'var', name: 'x' }, { type: 'const', value: 3 }],
      });
    });

    it('should parse modulo', () => {
      const result = parseSMT2('(assert (mod x 7))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: 'mod',
        args: [{ type: 'var', name: 'x' }, { type: 'const', value: 7 }],
      });
    });

    it('should parse nested arithmetic', () => {
      const result = parseSMT2('(assert (+ (* x 2) (- y 1)))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '+',
        args: [
          {
            type: 'app',
            op: '*',
            args: [{ type: 'var', name: 'x' }, { type: 'const', value: 2 }],
          },
          {
            type: 'app',
            op: '-',
            args: [{ type: 'var', name: 'y' }, { type: 'const', value: 1 }],
          },
        ],
      });
    });

    it('should parse n-ary addition', () => {
      const result = parseSMT2('(assert (+ x y z))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '+',
        args: [
          { type: 'var', name: 'x' },
          { type: 'var', name: 'y' },
          { type: 'var', name: 'z' },
        ],
      });
    });
  });

  describe('Expression Parsing - Comparison Operations', () => {
    it('should parse less than', () => {
      const result = parseSMT2('(assert (< x 10))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '<',
        args: [{ type: 'var', name: 'x' }, { type: 'const', value: 10 }],
      });
    });

    it('should parse less than or equal', () => {
      const result = parseSMT2('(assert (<= x 10))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '<=',
        args: [{ type: 'var', name: 'x' }, { type: 'const', value: 10 }],
      });
    });

    it('should parse greater than', () => {
      const result = parseSMT2('(assert (> x 0))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '>',
        args: [{ type: 'var', name: 'x' }, { type: 'const', value: 0 }],
      });
    });

    it('should parse greater than or equal', () => {
      const result = parseSMT2('(assert (>= x 0))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '>=',
        args: [{ type: 'var', name: 'x' }, { type: 'const', value: 0 }],
      });
    });

    it('should parse equality', () => {
      const result = parseSMT2('(assert (= x y))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '=',
        args: [{ type: 'var', name: 'x' }, { type: 'var', name: 'y' }],
      });
    });

    it('should parse distinct', () => {
      const result = parseSMT2('(assert (distinct x y z))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: 'distinct',
        args: [
          { type: 'var', name: 'x' },
          { type: 'var', name: 'y' },
          { type: 'var', name: 'z' },
        ],
      });
    });
  });

  describe('Expression Parsing - Logical Operations', () => {
    it('should parse and', () => {
      const result = parseSMT2('(assert (and p q))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: 'and',
        args: [{ type: 'var', name: 'p' }, { type: 'var', name: 'q' }],
      });
    });

    it('should parse or', () => {
      const result = parseSMT2('(assert (or p q))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: 'or',
        args: [{ type: 'var', name: 'p' }, { type: 'var', name: 'q' }],
      });
    });

    it('should parse not', () => {
      const result = parseSMT2('(assert (not p))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: 'not',
        args: [{ type: 'var', name: 'p' }],
      });
    });

    it('should parse implies (=>)', () => {
      const result = parseSMT2('(assert (=> p q))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '=>',
        args: [{ type: 'var', name: 'p' }, { type: 'var', name: 'q' }],
      });
    });

    it('should parse iff (equivalence)', () => {
      const result = parseSMT2('(assert (iff p q))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: 'iff',
        args: [{ type: 'var', name: 'p' }, { type: 'var', name: 'q' }],
      });
    });

    it('should parse n-ary and', () => {
      const result = parseSMT2('(assert (and p q r))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: 'and',
        args: [
          { type: 'var', name: 'p' },
          { type: 'var', name: 'q' },
          { type: 'var', name: 'r' },
        ],
      });
    });

    it('should parse nested logical operations', () => {
      const result = parseSMT2('(assert (and (or p q) (not r)))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: 'and',
        args: [
          {
            type: 'app',
            op: 'or',
            args: [{ type: 'var', name: 'p' }, { type: 'var', name: 'q' }],
          },
          {
            type: 'app',
            op: 'not',
            args: [{ type: 'var', name: 'r' }],
          },
        ],
      });
    });
  });

  describe('Expression Parsing - Negative Numbers', () => {
    it('should parse negative integer constant', () => {
      const result = parseSMT2('(assert (> x -5))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '>',
        args: [{ type: 'var', name: 'x' }, { type: 'const', value: -5 }],
      });
    });

    it('should parse negative number in arithmetic', () => {
      const result = parseSMT2('(assert (+ x -10))');
      const expr = (result[0] as { type: 'assert'; expr: SMT2Expr }).expr;
      expect(expr).toEqual({
        type: 'app',
        op: '+',
        args: [{ type: 'var', name: 'x' }, { type: 'const', value: -10 }],
      });
    });
  });

  describe('Full Formula Parsing', () => {
    it('should parse complete SAT formula', () => {
      const formula = `
        (declare-const x Int)
        (declare-const y Int)
        (assert (> x 0))
        (assert (< y 10))
        (assert (= (+ x y) 15))
        (check-sat)
        (get-model)
      `;
      const result = parseSMT2(formula);
      expect(result).toHaveLength(7);
      expect(result[0]).toEqual({ type: 'declare-const', name: 'x', sort: 'Int' });
      expect(result[1]).toEqual({ type: 'declare-const', name: 'y', sort: 'Int' });
      expect(result[2].type).toBe('assert');
      expect(result[3].type).toBe('assert');
      expect(result[4].type).toBe('assert');
      expect(result[5]).toEqual({ type: 'check-sat' });
      expect(result[6]).toEqual({ type: 'get-model' });
    });

    it('should parse formula with set-logic', () => {
      const formula = `
        (set-logic QF_LIA)
        (declare-const x Int)
        (assert (> x 0))
        (check-sat)
      `;
      const result = parseSMT2(formula);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ type: 'set-logic', logic: 'QF_LIA' });
    });

    it('should parse complex nested formula', () => {
      const formula = `
        (declare-const a Bool)
        (declare-const b Bool)
        (declare-const c Bool)
        (assert (=> (and a b) (or b c)))
        (check-sat)
      `;
      const result = parseSMT2(formula);
      expect(result).toHaveLength(5);
    });
  });

  describe('Error Handling - Parse Errors', () => {
    it('should throw on unmatched opening parenthesis', () => {
      expect(() => parseSMT2('(declare-const x Int')).toThrow(SMT2ParseError);
    });

    it('should throw on unmatched closing parenthesis', () => {
      expect(() => parseSMT2('declare-const x Int)')).toThrow(SMT2ParseError);
    });

    it('should throw on invalid command', () => {
      expect(() => parseSMT2('(invalid-command x Int)')).toThrow();
    });

    it('should throw on malformed declare-const', () => {
      expect(() => parseSMT2('(declare-const x)')).toThrow();
    });

    it('should throw on malformed assert', () => {
      expect(() => parseSMT2('(assert)')).toThrow();
    });

    it('should throw on empty input', () => {
      const result = parseSMT2('');
      expect(result).toEqual([]);
    });

    it('should throw on whitespace-only input', () => {
      const result = parseSMT2('   \n  \t  ');
      expect(result).toEqual([]);
    });
  });

  describe('Error Handling - Unsupported Constructs', () => {
    it('should detect quantifiers (forall)', () => {
      const formula = '(assert (forall ((x Int)) (> x 0)))';
      expect(() => parseSMT2(formula)).toThrow(SMT2UnsupportedError);
    });

    it('should detect quantifiers (exists)', () => {
      const formula = '(assert (exists ((x Int)) (> x 0)))';
      expect(() => parseSMT2(formula)).toThrow(SMT2UnsupportedError);
    });
  });

  describe('Edge Cases - Whitespace and Formatting', () => {
    it('should handle extra whitespace', () => {
      const result = parseSMT2('(  declare-const   x    Int  )');
      expect(result).toEqual([{ type: 'declare-const', name: 'x', sort: 'Int' }]);
    });

    it('should handle newlines', () => {
      const result = parseSMT2(`
        (declare-const
          x
          Int)
      `);
      expect(result).toEqual([{ type: 'declare-const', name: 'x', sort: 'Int' }]);
    });

    it('should handle tabs', () => {
      const result = parseSMT2('(\tdeclare-const\tx\tInt\t)');
      expect(result).toEqual([{ type: 'declare-const', name: 'x', sort: 'Int' }]);
    });

    it('should handle mixed whitespace', () => {
      const result = parseSMT2('(  \tdeclare-const \n x \t Int  \n)');
      expect(result).toEqual([{ type: 'declare-const', name: 'x', sort: 'Int' }]);
    });
  });

  describe('Edge Cases - Deeply Nested Expressions', () => {
    it('should parse deeply nested and/or', () => {
      const formula = '(assert (and (and (and p q) r) s))';
      const result = parseSMT2(formula);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('assert');
    });

    it('should parse deeply nested arithmetic', () => {
      const formula = '(assert (+ (+ (+ x 1) 2) 3))';
      const result = parseSMT2(formula);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('assert');
    });

    it('should parse very deep nesting (10 levels)', () => {
      const formula = '(assert (and (and (and (and (and (and (and (and (and (and p q) r) s) t) u) v) w) x) y) z))';
      const result = parseSMT2(formula);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('assert');
    });
  });

  describe('Edge Cases - Multiple Commands', () => {
    it('should parse 100 variable declarations', () => {
      const commands = Array.from({ length: 100 }, (_, i) => `(declare-const x${i} Int)`).join('\n');
      const result = parseSMT2(commands);
      expect(result).toHaveLength(100);
      expect(result[0]).toEqual({ type: 'declare-const', name: 'x0', sort: 'Int' });
      expect(result[99]).toEqual({ type: 'declare-const', name: 'x99', sort: 'Int' });
    });

    it('should parse 50 assertions', () => {
      const commands = Array.from({ length: 50 }, (_, i) => `(assert (> x${i} 0))`).join('\n');
      const result = parseSMT2(commands);
      expect(result).toHaveLength(50);
      expect(result.every((cmd) => cmd.type === 'assert')).toBe(true);
    });
  });

  describe('Real-World Examples', () => {
    it('should parse example from SMT2Backend', () => {
      const formula = `
        (declare-const premise1 Bool)
        (declare-const premise2 Bool)
        (declare-const conclusion Bool)
        (assert premise1)
        (assert premise2)
        (assert (not conclusion))
        (check-sat)
      `;
      const result = parseSMT2(formula);
      expect(result).toHaveLength(7);
      expect(result[6]).toEqual({ type: 'check-sat' });
    });

    it('should parse arithmetic reasoning example', () => {
      const formula = `
        (declare-const x Int)
        (declare-const y Int)
        (assert (> x 5))
        (assert (< y 10))
        (assert (= (+ x y) 20))
        (check-sat)
        (get-model)
      `;
      const result = parseSMT2(formula);
      expect(result).toHaveLength(7);
    });

    it('should parse mixed logical and arithmetic', () => {
      const formula = `
        (declare-const flag Bool)
        (declare-const count Int)
        (assert (=> flag (> count 0)))
        (assert (or (not flag) (< count 100)))
        (check-sat)
      `;
      const result = parseSMT2(formula);
      expect(result).toHaveLength(5);
    });
  });
});
