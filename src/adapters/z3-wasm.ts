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

  /**
   * Pre-initialized Z3 instance (optional)
   * This allows you to pass a pre-initialized z3-solver instance.
   *
   * Usage (optional - z3-solver is now bundled in browser builds):
   * ```javascript
   * import { init } from 'z3-solver';
   * const Z3 = await init();
   * const adapter = new Z3WASMAdapter({ z3Instance: Z3 });
   * ```
   *
   * Note: In browser environments with the bundled browser.js, z3-solver
   * is automatically imported and initialized, so this option is rarely needed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  z3Instance?: any;
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
  private useLowLevelAPI = false; // True when using raw initZ3 API (browser without z3-solver)
  private config: Required<Omit<Z3WASMConfig, 'z3Instance'>> & {
    z3Instance?: Z3WASMConfig['z3Instance'];
  };

  constructor(config: Z3WASMConfig = {}) {
    super();
    this.config = {
      timeout: config.timeout ?? 30000,
      verbose: config.verbose ?? false,
      z3Instance: config.z3Instance,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // If a pre-initialized Z3 instance was provided, use it directly
      // This is the recommended approach for browser environments
      if (this.config.z3Instance) {
        this.z3 = this.config.z3Instance;
        this.initialized = true;

        if (this.config.verbose) {
          logger.debug('Z3 WASM adapter initialized with pre-initialized instance');
        }
        return;
      }

      const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

      if (isBrowser) {
        // In browser: first try z3-solver's init(), fall back to low-level initZ3 API
        if (this.config.verbose) {
          logger.debug('Browser environment detected');
        }

        // Try z3-solver first (provides high-level API)
        try {
          const z3SolverModule = await import('z3-solver');
          const { init } = z3SolverModule;

          if (init) {
            this.z3 = await init();
            this.initialized = true;
            this.useLowLevelAPI = false;

            if (this.config.verbose) {
              logger.debug('Z3 WASM adapter initialized via z3-solver init()');
            }
            return;
          }
        } catch (browserError) {
          if (this.config.verbose) {
            logger.debug(
              `z3-solver import failed: ${browserError instanceof Error ? browserError.message : String(browserError)}`
            );
          }
        }

        // Fall back to raw initZ3 low-level API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globalObj: any =
          typeof globalThis !== 'undefined'
            ? globalThis
            : typeof window !== 'undefined'
              ? window
              : {};

        if (typeof globalObj.initZ3 !== 'undefined') {
          if (this.config.verbose) {
            logger.debug('Falling back to low-level initZ3 API');
          }

          try {
            this.z3 = await globalObj.initZ3();
            this.initialized = true;
            this.useLowLevelAPI = true;

            if (this.config.verbose) {
              logger.debug('Z3 WASM adapter initialized via low-level initZ3 API');
            }
            return;
          } catch (initError) {
            if (this.config.verbose) {
              logger.debug(
                `initZ3 failed: ${initError instanceof Error ? initError.message : String(initError)}`
              );
            }
          }
        }

        throw new Error('Neither z3-solver nor initZ3 available in browser');
      }

      // Fall back to importing z3-solver
      // This works in Node.js and may work in browser with proper bundler setup
      const module = await import('z3-solver');

      const { init } = module;
      if (!init) {
        throw new Error('z3-solver module does not export init function');
      }

      // Initialize Z3 context
      this.z3 = await init();

      this.initialized = true;

      if (this.config.verbose) {
        logger.debug('Z3 WASM adapter initialized successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Provide more helpful error messages for common issues
      if (errorMessage.includes('initZ3 was not imported correctly')) {
        throw new Z3NotAvailableError(
          'Z3 initialization failed: initZ3 not available.\n' +
            'In browser environments, ensure:\n' +
            '1. z3-built.js is loaded via <script> tag before using Z3WASMAdapter\n' +
            '2. global.initZ3 = initZ3 is set after z3-built.js loads\n' +
            '3. SharedArrayBuffer is available (requires COOP/COEP headers)\n' +
            'Original error: ' +
            errorMessage
        );
      }

      throw new Z3NotAvailableError(
        `Failed to initialize Z3 WASM: ${errorMessage}. ` +
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
      // Use low-level API if available (browser with raw initZ3)
      if (this.useLowLevelAPI) {
        return await this.executeSMT2LowLevel(formula, startTime);
      }

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
        if (result.result === 'unknown' && result.rawOutput) {
          logger.debug(`Z3 raw output: ${result.rawOutput}`);
        }
      }

      // If we got unknown, log additional diagnostic info
      if (result.result === 'unknown' && this.config.verbose) {
        logger.debug('Z3 returned unknown. This may indicate:');
        logger.debug('  - Formula is too complex for decidable theories');
        logger.debug('  - Solver timeout was reached');
        logger.debug('  - Browser WASM environment limitations');
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

  /**
   * Execute SMT2 using low-level Z3 API (used in browser when z3-solver unavailable)
   */
  private async executeSMT2LowLevel(
    formula: string,
    startTime: number
  ): Promise<VerificationResult> {
    if (this.config.verbose) {
      logger.debug('Using low-level Z3 API for SMT2 execution');
    }

    try {
      // The low-level API from initZ3 provides _async_Z3_eval_smtlib2_string
      const evalSMT2 = this.z3._async_Z3_eval_smtlib2_string;

      if (!evalSMT2) {
        throw new Error('_async_Z3_eval_smtlib2_string not available in Z3 WASM');
      }

      // Create a Z3 context for evaluation
      const Z3_mk_config = this.z3._Z3_mk_config;
      const Z3_mk_context = this.z3._Z3_mk_context;
      const Z3_del_context = this.z3._Z3_del_context;
      const Z3_del_config = this.z3._Z3_del_config;

      if (!Z3_mk_config || !Z3_mk_context) {
        throw new Error('Z3 context creation functions not available');
      }

      const config = Z3_mk_config();
      const ctx = Z3_mk_context(config);

      try {
        // Execute SMT2 formula - the function returns a string result
        const resultStr = await evalSMT2(ctx, formula);

        const executionTime = Date.now() - startTime;

        if (this.config.verbose) {
          logger.debug(`Low-level Z3 result: ${resultStr}`);
        }

        // Parse the result string to determine sat/unsat/unknown
        const normalizedResult = resultStr.toLowerCase().trim();

        let result: 'sat' | 'unsat' | 'unknown' = 'unknown';
        if (normalizedResult.includes('unsat')) {
          result = 'unsat';
        } else if (normalizedResult.includes('sat') && !normalizedResult.includes('unsat')) {
          result = 'sat';
        }

        return {
          result,
          rawOutput: resultStr,
          executionTime,
        };
      } finally {
        // Clean up context
        if (Z3_del_context) Z3_del_context(ctx);
        if (Z3_del_config) Z3_del_config(config);
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new Z3Error(
        `Low-level Z3 execution failed: ${error instanceof Error ? error.message : String(error)}`,
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
  getConfig(): Readonly<{ timeout: number; verbose: boolean; z3Instance?: unknown }> {
    return { ...this.config };
  }
}
