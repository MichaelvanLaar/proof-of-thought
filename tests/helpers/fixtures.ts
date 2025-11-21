/**
 * Test fixtures for common test scenarios
 */

/**
 * Common reasoning questions and contexts
 */
export const reasoningFixtures = {
  socrates: {
    question: 'Is Socrates mortal?',
    context: 'All humans are mortal. Socrates is human.',
    expectedAnswer: true,
  },
  logical: {
    question: 'Does the conclusion follow logically?',
    context: 'If it rains, the ground is wet. It is raining.',
    expectedAnswer: true,
  },
  mathematical: {
    question: 'Is x greater than 10?',
    context: 'x = 15',
    expectedAnswer: true,
  },
  contradiction: {
    question: 'Can both statements be true?',
    context: 'Statement A: It is sunny. Statement B: It is raining and there are no clouds.',
    expectedAnswer: false,
  },
};

/**
 * SMT2 formula examples
 */
export const smt2Fixtures = {
  simple: `(declare-const p Bool)
(assert p)
(check-sat)`,

  socrates: `(declare-const human_Socrates Bool)
(declare-const mortal_Socrates Bool)
(declare-fun human (Bool) Bool)
(declare-fun mortal (Bool) Bool)
(assert (forall ((x Bool)) (=> (human x) (mortal x))))
(assert (human human_Socrates))
(assert (not mortal_Socrates))
(check-sat)`,

  arithmetic: `(declare-const x Int)
(assert (> x 10))
(assert (< x 5))
(check-sat)`,

  satisfiable: `(declare-const x Int)
(assert (> x 0))
(check-sat)`,

  unsatisfiable: `(declare-const x Int)
(assert (> x 10))
(assert (< x 5))
(check-sat)`,
};

/**
 * JSON DSL formula examples
 */
export const jsonDSLFixtures = {
  simple: {
    sorts: {},
    constants: {
      p: { sort: 'Bool' },
    },
    functions: {},
    assertions: [
      {
        type: 'const',
        value: 'p',
      },
    ],
  },

  socrates: {
    sorts: {
      Person: { type: 'uninterpreted' },
    },
    constants: {
      Socrates: { sort: 'Person' },
    },
    functions: {
      human: {
        params: [{ name: 'x', sort: 'Person' }],
        return: 'Bool',
      },
      mortal: {
        params: [{ name: 'x', sort: 'Person' }],
        return: 'Bool',
      },
    },
    assertions: [
      {
        type: 'forall',
        variables: [{ name: 'x', sort: 'Person' }],
        body: {
          type: 'implies',
          left: {
            type: 'app',
            name: 'human',
            args: [{ type: 'var', name: 'x' }],
          },
          right: {
            type: 'app',
            name: 'mortal',
            args: [{ type: 'var', name: 'x' }],
          },
        },
      },
      {
        type: 'app',
        name: 'human',
        args: [{ type: 'const', value: 'Socrates' }],
      },
      {
        type: 'not',
        arg: {
          type: 'app',
          name: 'mortal',
          args: [{ type: 'const', value: 'Socrates' }],
        },
      },
    ],
  },

  arithmetic: {
    sorts: {},
    constants: {
      x: { sort: 'Int' },
    },
    functions: {},
    assertions: [
      {
        type: 'and',
        args: [
          {
            type: 'app',
            name: '>',
            args: [
              { type: 'const', value: 'x' },
              { type: 'int', value: 10 },
            ],
          },
          {
            type: 'app',
            name: '<',
            args: [
              { type: 'const', value: 'x' },
              { type: 'int', value: 5 },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * Z3 solver output examples
 */
export const z3OutputFixtures = {
  sat: 'sat\n(model\n  (define-fun x () Int 15)\n)',
  unsat: 'unsat',
  unknown: 'unknown',
  timeout: 'timeout',
  error: 'error: invalid syntax',
};

/**
 * Expected reasoning responses
 */
export const responseFixtures = {
  valid: {
    answer: 'The conclusion is logically valid.',
    formula: smt2Fixtures.socrates,
    proof: [
      { step: 1, description: 'Translating natural language to logical formula' },
      { step: 2, description: 'Verifying formula with Z3 solver' },
      { step: 3, description: 'Generating natural language explanation' },
    ],
    backend: 'smt2' as const,
    isVerified: true,
    executionTime: 100,
  },
  invalid: {
    answer: 'The conclusion is not logically valid.',
    formula: smt2Fixtures.satisfiable,
    proof: [
      { step: 1, description: 'Translating natural language to logical formula' },
      { step: 2, description: 'Verifying formula with Z3 solver' },
      { step: 3, description: 'Generating natural language explanation' },
    ],
    backend: 'smt2' as const,
    isVerified: false,
    executionTime: 100,
  },
};

/**
 * Error message fixtures
 */
export const errorFixtures = {
  invalidFormula: 'Invalid SMT2 formula syntax',
  z3Timeout: 'Z3 solver timeout exceeded',
  llmError: 'OpenAI API error',
  configError: 'Invalid configuration',
  validationError: 'Validation failed',
};

/**
 * Configuration fixtures
 */
export const configFixtures = {
  default: {
    backend: 'smt2' as const,
    model: 'gpt-4o',
    temperature: 0.0,
    maxTokens: 4096,
    z3Timeout: 30000,
    verbose: false,
  },
  custom: {
    backend: 'json' as const,
    model: 'gpt-4',
    temperature: 0.5,
    maxTokens: 2048,
    z3Timeout: 60000,
    verbose: true,
  },
  minimal: {
    backend: 'smt2' as const,
  },
};
