/**
 * Z3 Native Adapter - Node.js native bindings
 */

import type { VerificationResult } from '../types/index.js';
import { AbstractZ3Adapter } from './z3-adapter.js';
import { Z3NotAvailableError, Z3Error, Z3TimeoutError } from '../types/errors.js';

/**
 * Configuration for Z3 native adapter
 */
interface Z3NativeConfig {
  timeout?: number;
  memoryLimit?: number;
  z3Path?: string;
}

/**
 * Z3 adapter for Node.js using native bindings or CLI
 */
export class Z3NativeAdapter extends AbstractZ3Adapter {
  private z3Instance: unknown = null;
  private config: Z3NativeConfig;
  private initialized = false;

  constructor(config: Z3NativeConfig = {}) {
    super();
    this.config = {
      timeout: config.timeout ?? 30000,
      memoryLimit: config.memoryLimit,
      z3Path: config.z3Path,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Try to import z3-solver package
      const { init } = await import('z3-solver');
      this.z3Instance = await init();
      this.initialized = true;
    } catch (_error) {
      // If z3-solver not available, we'll fall back to CLI execution
      const available = await this.isAvailable();
      if (!available) {
        throw new Z3NotAvailableError(
          'Z3 solver not available. Please install z3-solver package or ensure z3 is in PATH'
        );
      }
      this.initialized = true;
    }
  }

  async executeSMT2(formula: string): Promise<VerificationResult> {
    await this.initialize();

    const startTime = Date.now();

    try {
      // If we have z3-solver package, use it
      if (this.z3Instance) {
        return await this.executeSMT2WithPackage(formula);
      }

      // Otherwise fall back to CLI execution
      return await this.executeSMT2WithCLI(formula);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof Z3Error) {
        throw error;
      }

      throw new Z3Error(
        `Z3 SMT2 execution failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        { executionTime }
      );
    }
  }

  private async executeSMT2WithPackage(formula: string): Promise<VerificationResult> {
    const startTime = Date.now();

    try {
      // z3-solver package doesn't directly support SMT2 string execution
      // We need to fall back to CLI for SMT2 formulas
      // The package is better suited for programmatic API usage
      return await this.executeSMT2WithCLI(formula);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new Z3Error(
        `Z3 package execution failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        { executionTime }
      );
    }
  }

  private async executeSMT2WithCLI(formula: string): Promise<VerificationResult> {
    const startTime = Date.now();
    const { spawn } = await import('child_process');

    return new Promise<VerificationResult>((resolve, reject) => {
      const z3Path = this.config.z3Path ?? 'z3';
      const z3Process = spawn(z3Path, ['-in', '-smt2']);

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        z3Process.kill('SIGTERM');
        reject(
          new Z3TimeoutError(
            `Z3 execution timed out after ${this.config.timeout}ms`,
            this.config.timeout ?? 30000,
            stdout
          )
        );
      }, this.config.timeout);

      z3Process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      z3Process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      z3Process.on('error', (error) => {
        clearTimeout(timeoutHandle);
        if (!timedOut) {
          reject(new Z3NotAvailableError(`Failed to execute Z3: ${error.message}`));
        }
      });

      z3Process.on('close', (code) => {
        clearTimeout(timeoutHandle);
        if (timedOut) {
          return; // Already handled by timeout
        }

        const executionTime = Date.now() - startTime;

        if (code !== 0) {
          reject(
            new Z3Error(`Z3 exited with code ${code}: ${stderr}`, stdout, {
              exitCode: code,
              stderr,
              executionTime,
            })
          );
          return;
        }

        try {
          const result = this.parseSMT2Output(stdout);
          resolve({
            ...result,
            executionTime,
            rawOutput: stdout,
          });
        } catch (error) {
          reject(error);
        }
      });

      // Write formula to stdin
      z3Process.stdin.write(formula);
      z3Process.stdin.end();
    });
  }

  private parseSMT2Output(output: string): Omit<VerificationResult, 'executionTime'> {
    const lines = output.trim().split('\n');

    // Look for sat/unsat/unknown result
    let result: 'sat' | 'unsat' | 'unknown' = 'unknown';
    let model: Record<string, unknown> | undefined;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'sat') {
        result = 'sat';
      } else if (trimmed === 'unsat') {
        result = 'unsat';
      } else if (trimmed === 'unknown') {
        result = 'unknown';
      }
    }

    // If sat, try to extract model
    if (result === 'sat') {
      model = this.extractModel(output);
    }

    return {
      result,
      model,
      rawOutput: output,
    };
  }

  private extractModel(output: string): Record<string, unknown> | undefined {
    // Parse Z3 model output
    // Format is typically:
    // (model
    //   (define-fun x () Int 5)
    //   (define-fun y () Bool true)
    // )
    const model: Record<string, unknown> = {};
    const definePattern = /\(define-fun\s+(\w+)\s+\(\)\s+(\w+)\s+(.+?)\)/g;

    let match;
    while ((match = definePattern.exec(output)) !== null) {
      const name = match[1];
      const type = match[2];
      const value = match[3];
      if (name && type && value) {
        model[name] = this.parseValue(value.trim(), type);
      }
    }

    return Object.keys(model).length > 0 ? model : undefined;
  }

  private parseValue(value: string, type: string): unknown {
    // Parse value based on type
    if (type === 'Int') {
      return parseInt(value, 10);
    } else if (type === 'Bool') {
      return value === 'true';
    } else if (type === 'Real') {
      return parseFloat(value);
    } else {
      // Return as string for other types
      return value;
    }
  }

  async executeJSON(_formula: object): Promise<VerificationResult> {
    await this.initialize();

    // JSON execution will require Z3 API
    // For now, convert to SMT2 and execute
    throw new Z3Error('JSON formula execution not yet implemented for native adapter');
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Try to import z3-solver
      await import('z3-solver');
      return true;
    } catch {
      // Check if z3 CLI is available
      try {
        const { spawn } = await import('child_process');
        const z3Path = this.config.z3Path ?? 'z3';

        return new Promise<boolean>((resolve) => {
          const z3Process = spawn(z3Path, ['--version']);
          let found = false;

          z3Process.on('error', () => {
            resolve(false);
          });

          z3Process.stdout.on('data', () => {
            found = true;
          });

          z3Process.on('close', () => {
            resolve(found);
          });

          // Timeout after 2 seconds
          setTimeout(() => {
            z3Process.kill();
            resolve(false);
          }, 2000);
        });
      } catch {
        return false;
      }
    }
  }

  async getVersion(): Promise<string> {
    // z3-solver package doesn't expose version in exports, use CLI
    // Try CLI
    const { spawn } = await import('child_process');
    const z3Path = this.config.z3Path ?? 'z3';

    return new Promise<string>((resolve, reject) => {
      const z3Process = spawn(z3Path, ['--version']);
      let output = '';

      z3Process.stdout.on('data', (data) => {
        output += data.toString();
      });

      z3Process.on('error', (error) => {
        reject(new Z3NotAvailableError(`Failed to get Z3 version: ${error.message}`));
      });

      z3Process.on('close', (code) => {
        if (code !== 0) {
          reject(new Z3NotAvailableError('Failed to get Z3 version'));
          return;
        }

        // Parse version from output (e.g., "Z3 version 4.12.5 - 64 bit")
        const versionMatch = output.match(/Z3 version ([\d.]+)/);
        if (versionMatch) {
          resolve(versionMatch[1] ?? 'unknown');
        } else {
          resolve('unknown');
        }
      });

      // Timeout after 2 seconds
      setTimeout(() => {
        z3Process.kill();
        reject(new Z3NotAvailableError('Z3 version check timed out'));
      }, 2000);
    });
  }

  async dispose(): Promise<void> {
    // Clean up Z3 instance if needed
    this.z3Instance = null;
    this.initialized = false;
  }
}
