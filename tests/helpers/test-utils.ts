/**
 * General test utilities
 */

import { expect } from 'vitest';
import type { ReasoningResponse } from '../../src/types/index.js';

/**
 * Checks if Z3 is available in the test environment
 */
export async function isZ3Available(): Promise<boolean> {
  try {
    const { checkZ3Available } = await import('../../src/adapters/utils.js');
    return await checkZ3Available();
  } catch {
    return false;
  }
}

/**
 * Skips a test if Z3 is not available
 */
export async function skipIfZ3NotAvailable(testFn: () => Promise<void>): Promise<void> {
  const available = await isZ3Available();
  if (!available) {
    console.log('⏭️  Skipping test: Z3 not available');
    return;
  }
  await testFn();
}

/**
 * Assertion helpers for common test patterns
 */
export const assertions = {
  /**
   * Asserts that a reasoning response has the expected structure
   */
  isValidReasoningResponse(response: unknown): void {
    expect(response).toBeDefined();
    expect(response).toHaveProperty('answer');
    expect(response).toHaveProperty('formula');
    expect(response).toHaveProperty('proof');
    expect(response).toHaveProperty('backend');
    expect(response).toHaveProperty('isVerified');
    expect(response).toHaveProperty('executionTime');

    const r = response as ReasoningResponse;
    expect(typeof r.answer).toBe('string');
    expect(typeof r.formula).toBe('string');
    expect(Array.isArray(r.proof)).toBe(true);
    expect(['smt2', 'json'].includes(r.backend)).toBe(true);
    expect(typeof r.isVerified).toBe('boolean');
    expect(typeof r.executionTime).toBe('number');
    expect(r.executionTime).toBeGreaterThanOrEqual(0);
  },

  /**
   * Asserts that a proof trace has the expected structure
   */
  isValidProofTrace(proof: unknown): void {
    expect(Array.isArray(proof)).toBe(true);
    expect((proof as unknown[]).length).toBeGreaterThan(0);

    (proof as Array<{ step: number; description: string }>).forEach((step, index) => {
      expect(step).toHaveProperty('step');
      expect(step).toHaveProperty('description');
      expect(typeof step.step).toBe('number');
      expect(typeof step.description).toBe('string');
      expect(step.step).toBe(index + 1);
    });
  },

  /**
   * Asserts that an SMT2 formula is well-formed
   */
  isValidSMT2Formula(formula: string): void {
    expect(typeof formula).toBe('string');
    expect(formula.length).toBeGreaterThan(0);
    // Basic structural checks
    expect(formula).toContain('(');
    expect(formula).toContain(')');
    // Should have balanced parentheses
    const openCount = (formula.match(/\(/g) || []).length;
    const closeCount = (formula.match(/\)/g) || []).length;
    expect(openCount).toBe(closeCount);
  },

  /**
   * Asserts that a JSON DSL object is well-formed
   */
  isValidJSONDSL(dsl: unknown): void {
    expect(typeof dsl).toBe('object');
    expect(dsl).not.toBeNull();
    expect(dsl).toHaveProperty('assertions');
    expect(Array.isArray((dsl as { assertions: unknown }).assertions)).toBe(true);
  },
};

/**
 * Creates a timeout promise for testing timeout scenarios
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Test timeout')), ms);
  });
}

/**
 * Waits for a condition to be true with a timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Condition not met within timeout');
}

/**
 * Creates a spy that tracks call arguments
 */
export function createCallSpy<T extends (...args: unknown[]) => unknown>() {
  const calls: Array<Parameters<T>> = [];
  const spy = ((...args: Parameters<T>) => {
    calls.push(args);
  }) as T & { calls: Array<Parameters<T>> };
  spy.calls = calls;
  return spy;
}

/**
 * Measures execution time of an async function
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
  const start = Date.now();
  const result = await fn();
  const time = Date.now() - start;
  return { result, time };
}

/**
 * Retries an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 100
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Creates a mock console for capturing console output
 */
export function createMockConsole() {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];

  return {
    log: (...args: unknown[]) => logs.push(args.join(' ')),
    error: (...args: unknown[]) => errors.push(args.join(' ')),
    warn: (...args: unknown[]) => warns.push(args.join(' ')),
    getLogs: () => logs,
    getErrors: () => errors,
    getWarns: () => warns,
    clear: () => {
      logs.length = 0;
      errors.length = 0;
      warns.length = 0;
    },
  };
}

/**
 * Normalizes whitespace in strings for comparison
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Checks if two objects are deeply equal (for testing purposes)
 */
export function deepEqual<T>(obj1: T, obj2: T): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}
