/**
 * Mock Z3 adapter for testing without requiring Z3 installation
 */

import { vi } from 'vitest';
import type { Z3Adapter, VerificationResult } from '../../src/adapters/z3-adapter.js';
import type { SMT2Formula } from '../../src/types/index.js';

export interface MockZ3Options {
  result?: 'sat' | 'unsat' | 'unknown';
  model?: string;
  delay?: number;
  shouldFail?: boolean;
  failureMessage?: string;
}

/**
 * Creates a mock Z3 adapter for testing
 */
export class MockZ3Adapter implements Z3Adapter {
  private options: MockZ3Options;

  constructor(options: MockZ3Options = {}) {
    this.options = {
      result: 'unsat',
      model: '',
      delay: 0,
      shouldFail: false,
      failureMessage: 'Mock Z3 error',
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.options.delay) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delay));
    }
    if (this.options.shouldFail) {
      throw new Error(this.options.failureMessage);
    }
  }

  async executeSMT2(formula: string): Promise<VerificationResult> {
    if (this.options.delay) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delay));
    }

    if (this.options.shouldFail) {
      throw new Error(this.options.failureMessage);
    }

    const result: VerificationResult = {
      result: this.options.result || 'unsat',
      rawOutput: this.options.model || (this.options.result || 'unsat'),
      executionTime: this.options.delay || 10,
    };

    return result;
  }

  async executeJSON(formula: object): Promise<VerificationResult> {
    if (this.options.delay) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delay));
    }

    if (this.options.shouldFail) {
      throw new Error(this.options.failureMessage);
    }

    const result: VerificationResult = {
      result: this.options.result || 'unsat',
      rawOutput: this.options.model || (this.options.result || 'unsat'),
      executionTime: this.options.delay || 10,
    };

    return result;
  }

  async verify(formula: SMT2Formula): Promise<VerificationResult> {
    return this.executeSMT2(formula);
  }

  async isAvailable(): Promise<boolean> {
    return !this.options.shouldFail;
  }

  async getVersion(): Promise<string> {
    return '4.12.5';
  }

  async dispose(): Promise<void> {
    // No-op for mock
  }
}

/**
 * Creates a mock Z3 adapter that returns sat
 */
export function createSatMock(model = '(model\n  (define-fun x () Int 15)\n)'): MockZ3Adapter {
  return new MockZ3Adapter({ result: 'sat', model });
}

/**
 * Creates a mock Z3 adapter that returns unsat
 */
export function createUnsatMock(): MockZ3Adapter {
  return new MockZ3Adapter({ result: 'unsat' });
}

/**
 * Creates a mock Z3 adapter that returns unknown
 */
export function createUnknownMock(): MockZ3Adapter {
  return new MockZ3Adapter({ result: 'unknown' });
}

/**
 * Creates a mock Z3 adapter that fails
 */
export function createFailingMock(message = 'Z3 error'): MockZ3Adapter {
  return new MockZ3Adapter({ shouldFail: true, failureMessage: message });
}

/**
 * Creates a mock Z3 adapter with custom delay
 */
export function createDelayedMock(delay: number, result: 'sat' | 'unsat' | 'unknown' = 'unsat'): MockZ3Adapter {
  return new MockZ3Adapter({ delay, result });
}
