/**
 * Browser entry point for ProofOfThought
 * Uses Z3 WASM adapter instead of native bindings
 *
 * @packageDocumentation
 */

// Note: Browser build will use WASM Z3 adapter
// This will be implemented in Phase 12

export { ProofOfThought } from './reasoning/proof-of-thought.js';

export type {
  BackendType,
  PostprocessingMethod,
  ProofOfThoughtConfig,
  ReasoningResponse,
  VerificationResult,
} from './types/index.js';

export {
  ProofOfThoughtError,
  LLMError,
  Z3Error,
  ValidationError,
  ConfigurationError,
} from './types/errors.js';

// Re-export for browser usage
export const VERSION = '0.1.0';
