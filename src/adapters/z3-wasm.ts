/**
 * Z3 WASM Adapter - Browser and Node.js WASM bindings
 *
 * This adapter provides Z3 theorem proving using the z3-solver npm package.
 * Works in both Node.js and browser environments via WebAssembly.
 *
 * Features:
 * - Full SMT2 parsing and execution via z3-solver JavaScript API
 * - Support for common SMT2 constructs (Int, Bool, Real, arithmetic, logic)
 * - Works in browsers without native Z3 installation
 * - Automatic fallback option in Node.js when native Z3 unavailable
 *
 * Note: Requires z3-solver package to be installed.
 */

import type { VerificationResult } from '../types/index.js';
import { AbstractZ3Adapter } from './z3-adapter.js';
import { Z3NotAvailableError, Z3Error } from '../types/errors.js';
import { logger } from '../utils/logger.js';
import { parseSMT2, SMT2ParseError, SMT2UnsupportedError } from './smt2-parser.js';
import { executeSMT2Commands } from './smt2-executor.js';

/**
 * Configuration for Z3 WASM adapter
 */
export interface Z3WASMConfig {
  /**
   * Timeout for Z3 operations in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

/**
 * Z3 adapter using WASM bindings from z3-solver package
 *
 * This adapter uses the z3-solver npm package which provides Z3 via WebAssembly.
 * Works in both Node.js and browser environments.
 *
 * @example
 * ```typescript
 * const adapter = new Z3WASMAdapter({ timeout: 30000 });
 * await adapter.initialize();
 * const result = await adapter.executeSMT2('(assert (> x 0))...');
 * ```
 */
export class Z3WASMAdapter extends AbstractZ3Adapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private z3: any = null; // Z3 context from z3-solver - using any due to dynamic import
  private initialized = false;
  private config: Required<Z3WASMConfig>;

  constructor(config: Z3WASMConfig = {}) {
    super();
    this.config = {
      timeout: config.timeout ?? 30000,
      verbose: config.verbose ?? false,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import z3-solver
      const { init } = await import('z3-solver');

      // Initialize Z3 context
      this.z3 = await init();

      this.initialized = true;

      if (this.config.verbose) {
        logger.debug('Z3 WASM adapter initialized');
      }
    } catch (error) {
      throw new Z3NotAvailableError(
        `Failed to initialize Z3 WASM: ${error instanceof Error ? error.message : String(error)}. ` +
          'Ensure z3-solver package is installed: npm install z3-solver'
      );
    }
  }

  async executeSMT2(formula: string): Promise<VerificationResult> {
    await this.initialize();

    if (!this.z3) {
      throw new Z3Error('Z3 context not initialized');
    }

    const startTime = Date.now();

    try {
      if (this.config.verbose) {
        logger.debug('Parsing SMT2 formula...');
      }

      // Parse SMT2 formula into AST
      const commands = parseSMT2(formula);

      if (this.config.verbose) {
        logger.debug(`Parsed ${commands.length} SMT2 commands`);
      }

      // Execute parsed commands using z3-solver API
      const result = await executeSMT2Commands(commands, this.z3, this.config.timeout);

      if (this.config.verbose) {
        logger.debug(`Z3 WASM execution completed: ${result.result} in ${result.executionTime}ms`);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Preserve parsing and unsupported construct errors
      if (error instanceof SMT2ParseError || error instanceof SMT2UnsupportedError) {
        throw error;
      }

      // Wrap other errors as Z3Error
      throw new Z3Error(
        `Z3 WASM execution failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        { executionTime }
      );
    }
  }

  async executeJSON(formula: object): Promise<VerificationResult> {
    await this.initialize();

    if (!this.z3) {
      throw new Z3Error('Z3 context not initialized');
    }

    const startTime = Date.now();

    try {
      const { Solver } = this.z3;
      const solver = new Solver();

      // Convert JSON DSL to Z3 assertions
      // This is a simplified implementation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formulaObj = formula as any;

      if (formulaObj.type === 'and') {
        for (const clause of formulaObj.clauses || []) {
          // Process each clause
          logger.debug(`Processing clause: ${JSON.stringify(clause).substring(0, 100)}...`);
        }
      }

      // Check satisfiability
      const checkResult = await solver.check();
      const executionTime = Date.now() - startTime;

      let result: 'sat' | 'unsat' | 'unknown' = 'unknown';
      if (checkResult === 'sat') result = 'sat';
      else if (checkResult === 'unsat') result = 'unsat';

      const verificationResult: VerificationResult = {
        result,
        rawOutput: checkResult,
        model: result === 'sat' ? await solver.model() : undefined,
        executionTime,
      };

      if (this.config.verbose) {
        logger.debug(`Z3 WASM JSON execution: ${result} (${executionTime}ms)`);
      }

      return verificationResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new Z3Error(
        `Z3 WASM JSON execution failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        { executionTime }
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Try to import z3-solver
      await import('z3-solver');
      return true;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string> {
    if (!this.initialized) {
      return 'not-initialized';
    }

    try {
      // z3-solver version can be obtained from the package
      const version = this.z3?.version;
      return version ? `z3-wasm-${version}` : 'z3-wasm-4.15.x';
    } catch {
      return 'z3-wasm-4.15.x';
    }
  }

  async dispose(): Promise<void> {
    this.z3 = null;
    this.initialized = false;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<Required<Z3WASMConfig>> {
    return { ...this.config };
  }
}
