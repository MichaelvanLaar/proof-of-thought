/**
 * Unit tests for JSON interpreter SMT2 conversion
 */

import { describe, it, expect } from 'vitest';
import { Z3JSONInterpreter } from '../json-interpreter.js';
import { createZ3Adapter } from '../../adapters/utils.js';
import type { JSONProgram } from '../json-dsl-types.js';

describe('Z3JSONInterpreter', () => {
  describe('SMT2 Conversion', () => {
    let interpreter: Z3JSONInterpreter;

    beforeAll(async () => {
      const z3Adapter = await createZ3Adapter({ timeout: 30000 });
      await z3Adapter.initialize();
      interpreter = new Z3JSONInterpreter(z3Adapter);
    });

    it('should convert simple function application', async () => {
      const program: JSONProgram = {
        sorts: { Entity: 'DeclareSort' },
        functions: { Mortal: { domain: ['Entity'], range: 'Bool' } },
        constants: { Socrates: 'Entity' },
        knowledge_base: ['Mortal(Socrates)'],
        verifications: {},
      };

      // Access private method for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interpreterAny = interpreter as any;
      const smt2 = interpreterAny.convertToSMT2(program);

      expect(smt2).toContain('(assert (Mortal Socrates))');
    });

    it('should convert ForAll quantifier correctly', async () => {
      const program: JSONProgram = {
        sorts: { Entity: 'DeclareSort' },
        functions: {
          Human: { domain: ['Entity'], range: 'Bool' },
          Mortal: { domain: ['Entity'], range: 'Bool' },
        },
        constants: {},
        knowledge_base: ['ForAll(x, Implies(Human(x), Mortal(x)))'],
        verifications: {},
      };

      // Access private method for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interpreterAny = interpreter as any;
      const smt2 = interpreterAny.convertToSMT2(program);

      expect(smt2).toContain('(assert (forall ((x Entity)) (=> (Human x) (Mortal x))))');
    });

    it('should convert nested logical operators', async () => {
      const program: JSONProgram = {
        sorts: { Entity: 'DeclareSort' },
        functions: {
          P: { domain: ['Entity'], range: 'Bool' },
          Q: { domain: ['Entity'], range: 'Bool' },
          R: { domain: ['Entity'], range: 'Bool' },
        },
        constants: { a: 'Entity' },
        knowledge_base: ['And(P(a), Or(Q(a), Not(R(a))))'],
        verifications: {},
      };

      // Access private method for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interpreterAny = interpreter as any;
      const smt2 = interpreterAny.convertToSMT2(program);

      expect(smt2).toContain('(assert (and (P a) (or (Q a) (not (R a)))))');
    });

    it('should negate verification queries for proof by refutation', async () => {
      const program: JSONProgram = {
        sorts: { Entity: 'DeclareSort' },
        functions: { Mortal: { domain: ['Entity'], range: 'Bool' } },
        constants: { Socrates: 'Entity' },
        knowledge_base: [],
        verifications: {
          test_query: 'Mortal(Socrates)',
        },
      };

      // Access private method for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interpreterAny = interpreter as any;
      const smt2 = interpreterAny.convertToSMT2(program);

      expect(smt2).toContain('(assert (not (Mortal Socrates)))');
    });

    it('should correctly verify Socrates example (proof by refutation)', async () => {
      const program: JSONProgram = {
        sorts: { Entity: 'DeclareSort' },
        functions: {
          Human: { domain: ['Entity'], range: 'Bool' },
          Mortal: { domain: ['Entity'], range: 'Bool' },
        },
        constants: { Socrates: 'Entity' },
        knowledge_base: ['ForAll(x, Implies(Human(x), Mortal(x)))', 'Human(Socrates)'],
        verifications: {
          is_socrates_mortal: 'Mortal(Socrates)',
        },
      };

      const result = await interpreter.execute(program);

      // Should be UNSAT because we assert NOT(Mortal(Socrates))
      // which contradicts the knowledge base
      expect(result.unsat_count).toBe(1);
      expect(result.sat_count).toBe(0);
      expect(result.verifications.is_socrates_mortal).toBe('unsat');
    });
  });
});
