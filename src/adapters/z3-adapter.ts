/**
 * Z3 Adapter - Abstract interface for Z3 solver integration
 */

import type { Z3Adapter, VerificationResult } from '../types/index.js';

/**
 * Abstract base class for Z3 adapters
 * Provides unified interface for different Z3 integration strategies
 */
export abstract class AbstractZ3Adapter implements Z3Adapter {
  abstract initialize(): Promise<void>;
  abstract executeSMT2(formula: string): Promise<VerificationResult>;
  abstract executeJSON(formula: object): Promise<VerificationResult>;
  abstract isAvailable(): Promise<boolean>;
  abstract getVersion(): Promise<string>;
  abstract dispose(): Promise<void>;
}
