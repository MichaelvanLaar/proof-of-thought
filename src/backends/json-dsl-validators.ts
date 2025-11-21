/**
 * JSON DSL Validators using Zod
 * Validates JSON programs against the DSL schema
 */

import { z } from 'zod';
import { ALLOWED_Z3_OPERATORS } from './json-dsl-types.js';

/**
 * Sort definition validator
 */
export const sortDefinitionSchema = z.union([
  z.literal('DeclareSort'),
  z.literal('Bool'),
  z.literal('Int'),
  z.literal('Real'),
  z.object({ BitVec: z.number().positive() }),
  z.object({ Enum: z.array(z.string()) }),
  z.object({
    Array: z.object({
      domain: z.string(),
      range: z.string(),
    }),
  }),
]);

/**
 * Function declaration validator
 */
export const functionDeclarationSchema = z.object({
  domain: z.array(z.string()),
  range: z.string(),
});

/**
 * Rule validator
 */
export const ruleSchema = z.object({
  antecedent: z.string(),
  consequent: z.string(),
  variables: z.array(z.string()).optional(),
});

/**
 * Complete JSON program validator
 */
export const jsonProgramSchema = z.object({
  sorts: z.record(z.string(), sortDefinitionSchema),
  functions: z.record(z.string(), functionDeclarationSchema).optional(),
  constants: z.record(z.string(), z.string()).optional(),
  variables: z.array(z.string()).optional(),
  knowledge_base: z.array(z.string()).optional(),
  rules: z.array(ruleSchema).optional(),
  verifications: z.record(z.string(), z.string()),
  actions: z.array(z.string()).optional(),
});

/**
 * Validate a JSON program
 * @param program - The JSON program to validate
 * @returns Validated program or throws error
 */
export function validateJSONProgram(program: unknown) {
  return jsonProgramSchema.parse(program);
}

/**
 * Validate a JSON program with detailed errors
 * @param program - The JSON program to validate
 * @returns Validation result
 */
export function validateJSONProgramSafe(program: unknown) {
  return jsonProgramSchema.safeParse(program);
}

/**
 * Validate expression safety (check for allowed operators only)
 * @param expression - Expression string to validate
 * @returns True if safe, false otherwise
 */
export function isExpressionSafe(expression: string): boolean {
  // Check if expression only contains allowed operators
  // This is a basic check - more sophisticated parsing would be needed for production
  const operatorPattern = new RegExp(
    `\\b(${ALLOWED_Z3_OPERATORS.join('|')})\\b`,
    'g'
  );

  // Extract potential operator names (words starting with capital letter)
  const potentialOperators = expression.match(/\b[A-Z][a-zA-Z0-9_]*\b/g) || [];

  // Check if all operators are in the allowed list
  for (const op of potentialOperators) {
    if (
      !ALLOWED_Z3_OPERATORS.includes(op as never) &&
      !['Bool', 'Int', 'Real', 'Array', 'BitVec'].includes(op)
    ) {
      // Allow sort names and common terms
      if (!/^[A-Z][a-z]+$/.test(op)) {
        // If it looks like an operator but isn't allowed, reject
        return false;
      }
    }
  }

  return true;
}

/**
 * Validate sort reference exists
 * @param sortName - Sort name to check
 * @param sorts - Available sorts
 * @returns True if sort exists
 */
export function isSortValid(
  sortName: string,
  sorts: Record<string, unknown>
): boolean {
  return sortName in sorts || ['Bool', 'Int', 'Real'].includes(sortName);
}
