/**
 * Tests for JSON DSL validators
 */

import { describe, it, expect } from 'vitest';
import {
  validateJSONProgram,
  validateJSONProgramSafe,
  isExpressionSafe,
  isSortValid,
} from '../../src/backends/json-dsl-validators.js';
import type { JSONProgram } from '../../src/backends/json-dsl-types.js';

describe('JSON DSL Validators', () => {
  describe('validateJSONProgram', () => {
    it('should validate a correct JSON program', () => {
      const program: JSONProgram = {
        sorts: {
          Entity: 'DeclareSort',
        },
        functions: {
          Mortal: {
            domain: ['Entity'],
            range: 'Bool',
          },
        },
        constants: {
          Socrates: 'Entity',
        },
        verifications: {
          query1: 'Mortal(Socrates)',
        },
      };

      expect(() => validateJSONProgram(program)).not.toThrow();
    });

    it('should throw on missing sorts', () => {
      const program = {
        verifications: {
          query1: 'true',
        },
      };

      expect(() => validateJSONProgram(program)).toThrow();
    });

    it('should throw on missing verifications', () => {
      const program = {
        sorts: {
          Entity: 'DeclareSort',
        },
      };

      expect(() => validateJSONProgram(program)).toThrow();
    });

    it('should accept optional fields', () => {
      const program: JSONProgram = {
        sorts: {
          Entity: 'DeclareSort',
        },
        functions: {
          Human: { domain: ['Entity'], range: 'Bool' },
        },
        constants: {
          Socrates: 'Entity',
        },
        knowledge_base: ['Human(Socrates)'],
        rules: [
          {
            antecedent: 'Human(x)',
            consequent: 'Mortal(x)',
            variables: ['x'],
          },
        ],
        verifications: {
          query1: 'Mortal(Socrates)',
        },
      };

      expect(() => validateJSONProgram(program)).not.toThrow();
    });

    it('should validate BitVec sort', () => {
      const program: JSONProgram = {
        sorts: {
          Bits8: { BitVec: 8 },
        },
        verifications: {
          query1: 'true',
        },
      };

      expect(() => validateJSONProgram(program)).not.toThrow();
    });

    it('should validate Enum sort', () => {
      const program: JSONProgram = {
        sorts: {
          Color: { Enum: ['Red', 'Green', 'Blue'] },
        },
        verifications: {
          query1: 'true',
        },
      };

      expect(() => validateJSONProgram(program)).not.toThrow();
    });

    it('should validate Array sort', () => {
      const program: JSONProgram = {
        sorts: {
          IntArray: { Array: { domain: 'Int', range: 'Int' } },
        },
        verifications: {
          query1: 'true',
        },
      };

      expect(() => validateJSONProgram(program)).not.toThrow();
    });
  });

  describe('validateJSONProgramSafe', () => {
    it('should return success for valid program', () => {
      const program: JSONProgram = {
        sorts: {
          Entity: 'DeclareSort',
        },
        verifications: {
          query1: 'true',
        },
      };

      const result = validateJSONProgramSafe(program);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(program);
      }
    });

    it('should return error for invalid program', () => {
      const program = {
        sorts: {},
        // Missing verifications
      };

      const result = validateJSONProgramSafe(program);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('isExpressionSafe', () => {
    it('should allow safe expressions with ForAll', () => {
      expect(isExpressionSafe('ForAll(x, Implies(Human(x), Mortal(x)))')).toBe(true);
    });

    it('should allow safe expressions with Exists', () => {
      expect(isExpressionSafe('Exists(x, And(Human(x), Mortal(x)))')).toBe(true);
    });

    it('should allow safe expressions with logical operators', () => {
      expect(isExpressionSafe('And(a, Or(b, Not(c)))')).toBe(true);
      expect(isExpressionSafe('Implies(a, b)')).toBe(true);
      expect(isExpressionSafe('If(cond, then, else)')).toBe(true);
    });

    it('should allow safe expressions with built-in sorts', () => {
      expect(isExpressionSafe('Bool(x)')).toBe(true);
      expect(isExpressionSafe('Int(42)')).toBe(true);
    });

    it('should allow expressions with valid predicates', () => {
      expect(isExpressionSafe('Mortal(Socrates)')).toBe(true);
      expect(isExpressionSafe('Human(x)')).toBe(true);
    });
  });

  describe('isSortValid', () => {
    const sorts = {
      Entity: 'DeclareSort' as const,
      Person: 'DeclareSort' as const,
    };

    it('should accept custom sorts', () => {
      expect(isSortValid('Entity', sorts)).toBe(true);
      expect(isSortValid('Person', sorts)).toBe(true);
    });

    it('should accept built-in sorts', () => {
      expect(isSortValid('Bool', {})).toBe(true);
      expect(isSortValid('Int', {})).toBe(true);
      expect(isSortValid('Real', {})).toBe(true);
    });

    it('should reject undefined sorts', () => {
      expect(isSortValid('UnknownSort', sorts)).toBe(false);
    });
  });
});
