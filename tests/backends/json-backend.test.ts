/**
 * Tests for JSON Backend
 */

import { describe, it, expect, vi } from 'vitest';
import { JSONBackend } from '../../src/backends/json-backend.js';
import type { JSONProgram } from '../../src/backends/json-dsl-types.js';
import type { Z3Adapter } from '../../src/types/index.js';
import type OpenAI from 'openai';

// Mock Z3 Adapter
function createMockZ3Adapter(): Z3Adapter {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    executeSMT2: vi.fn().mockResolvedValue({
      result: 'sat' as const,
      rawOutput: 'sat\n(model\n  (define-fun Socrates () Entity Socrates)\n)',
      executionTime: 100,
    }),
    executeJSON: vi.fn().mockResolvedValue({
      result: 'sat' as const,
      rawOutput: 'sat',
      executionTime: 100,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    getVersion: vi.fn().mockResolvedValue('4.12.2'),
    dispose: vi.fn().mockResolvedValue(undefined),
  };
}

// Mock OpenAI Client
function createMockOpenAIClient(): OpenAI {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sorts: {
                    Entity: 'DeclareSort',
                  },
                  functions: {
                    Human: { domain: ['Entity'], range: 'Bool' },
                    Mortal: { domain: ['Entity'], range: 'Bool' },
                  },
                  constants: {
                    Socrates: 'Entity',
                  },
                  knowledge_base: [
                    'ForAll(x, Implies(Human(x), Mortal(x)))',
                    'Human(Socrates)',
                  ],
                  verifications: {
                    is_socrates_mortal: 'Mortal(Socrates)',
                  },
                }),
              },
            },
          ],
        }),
      },
    },
  } as unknown as OpenAI;
}

describe('JSONBackend', () => {
  describe('translate', () => {
    it('should translate natural language to JSON formula', async () => {
      const client = createMockOpenAIClient();
      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter);

      const formula = await backend.translate(
        'Is Socrates mortal?',
        'All humans are mortal. Socrates is human.'
      );

      expect(formula).toBeDefined();
      const program = formula as unknown as JSONProgram;
      expect(program.sorts).toBeDefined();
      expect(program.verifications).toBeDefined();
    });

    it('should handle JSON in markdown code blocks', async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: '```json\n' + JSON.stringify({
                      sorts: { Entity: 'DeclareSort' },
                      verifications: { query1: 'true' },
                    }) + '\n```',
                  },
                },
              ],
            }),
          },
        },
      } as unknown as OpenAI;

      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter);

      const formula = await backend.translate('test', 'context');
      expect(formula).toBeDefined();
    });

    it('should throw TranslationError on invalid JSON', async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'invalid json {',
                  },
                },
              ],
            }),
          },
        },
      } as unknown as OpenAI;

      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter);

      await expect(backend.translate('test', 'context')).rejects.toThrow('Failed to parse');
    });

    it('should throw TranslationError on invalid schema', async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({ invalid: 'schema' }),
                  },
                },
              ],
            }),
          },
        },
      } as unknown as OpenAI;

      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter);

      await expect(backend.translate('test', 'context')).rejects.toThrow('invalid JSON program');
    });
  });

  describe('verify', () => {
    it('should verify a JSON formula', async () => {
      const client = createMockOpenAIClient();
      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter);

      const formula: JSONProgram = {
        sorts: {
          Entity: 'DeclareSort',
        },
        functions: {
          Mortal: { domain: ['Entity'], range: 'Bool' },
        },
        constants: {
          Socrates: 'Entity',
        },
        knowledge_base: ['Mortal(Socrates)'],
        verifications: {
          query1: 'Mortal(Socrates)',
        },
      };

      const result = await backend.verify(formula as never);
      expect(result.result).toBe('sat');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('explain', () => {
    it('should explain sat result with model', async () => {
      const client = createMockOpenAIClient();
      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter);

      const explanation = await backend.explain({
        result: 'sat',
        model: { Socrates: 'Entity', Mortal: 'true' },
        rawOutput: 'sat',
        executionTime: 100,
      });

      expect(explanation).toContain('satisfiable');
      expect(explanation).toContain('Socrates');
    });

    it('should explain sat result without model', async () => {
      const client = createMockOpenAIClient();
      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter);

      const explanation = await backend.explain({
        result: 'sat',
        rawOutput: 'sat',
        executionTime: 100,
      });

      expect(explanation).toContain('satisfiable');
    });

    it('should explain unsat result', async () => {
      const client = createMockOpenAIClient();
      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter);

      const explanation = await backend.explain({
        result: 'unsat',
        rawOutput: 'unsat',
        executionTime: 100,
      });

      expect(explanation).toContain('unsatisfiable');
    });

    it('should explain unknown result', async () => {
      const client = createMockOpenAIClient();
      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter);

      const explanation = await backend.explain({
        result: 'unknown',
        rawOutput: 'unknown',
        executionTime: 100,
      });

      expect(explanation).toContain('unknown');
    });
  });

  describe('configuration', () => {
    it('should get configuration', () => {
      const client = createMockOpenAIClient();
      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter, {
        model: 'gpt-4o',
        temperature: 0.5,
      });

      const config = backend.getConfig();
      expect(config.model).toBe('gpt-4o');
      expect(config.temperature).toBe(0.5);
    });

    it('should set configuration', () => {
      const client = createMockOpenAIClient();
      const z3Adapter = createMockZ3Adapter();
      const backend = new JSONBackend(client, z3Adapter);

      backend.setConfig({ temperature: 0.7 });
      const config = backend.getConfig();
      expect(config.temperature).toBe(0.7);
    });
  });
});
