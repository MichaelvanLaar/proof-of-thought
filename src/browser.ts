/**
 * Browser entry point for ProofOfThought
 * Uses Z3 WASM adapter instead of native bindings
 *
 * @packageDocumentation
 */

// Export main class
export { ProofOfThought } from './reasoning/proof-of-thought.js';

// Export backends
export { SMT2Backend } from './backends/smt2-backend.js';
export { JSONBackend } from './backends/json-backend.js';

// Export postprocessing methods
export { SelfRefine } from './postprocessing/self-refine.js';
export { SelfConsistency } from './postprocessing/self-consistency.js';
export { DecomposedPrompting } from './postprocessing/decomposed.js';
export { LeastToMost } from './postprocessing/least-to-most.js';

// Export WASM adapter
export { Z3WASMAdapter } from './adapters/z3-wasm.js';

// Export types
export type {
  BackendType,
  PostprocessingMethod,
  SMT2Formula,
  JSONFormula,
  Formula,
  ProofOfThoughtConfig,
  ReasoningStep,
  ReasoningResponse,
  VerificationResult,
  SelfRefineConfig,
  SelfConsistencyConfig,
  DecomposedConfig,
  LeastToMostConfig,
  Backend,
  Z3Adapter,
  PostprocessingMetrics,
} from './types/index.js';

// Export JSON DSL types
export type {
  JSONProgram,
  SortDefinition,
  FunctionDeclaration,
  Rule,
  JSONExecutionResult,
  Z3Operator,
} from './backends/json-dsl-types.js';

// Export errors
export {
  ProofOfThoughtError,
  LLMError,
  Z3Error,
  Z3TimeoutError,
  ValidationError,
  ConfigurationError,
  BackendError,
  TranslationError,
  PostprocessingError,
  Z3NotAvailableError,
  ParsingError,
} from './types/errors.js';

// Version
export const VERSION = '0.1.0';

/**
 * Default CDN URLs for Z3 WASM files
 */
export const DEFAULT_Z3_WASM_URLS = {
  // jsdelivr CDN hosting Z3 WASM builds
  jsdelivr: 'https://cdn.jsdelivr.net/npm/z3-solver@4.12.2/build/z3-built.wasm',
  // unpkg CDN
  unpkg: 'https://unpkg.com/z3-solver@4.12.2/build/z3-built.wasm',
  // Local relative path (when bundled with your app)
  local: './z3-built.wasm',
} as const;
