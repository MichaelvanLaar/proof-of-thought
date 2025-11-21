/**
 * ProofOfThought - TypeScript port
 * Neurosymbolic program synthesis combining LLMs with Z3 theorem proving
 *
 * @packageDocumentation
 */

// Export main class
export { ProofOfThought } from './reasoning/proof-of-thought.js';

// Export postprocessing methods
export { SelfRefine } from './postprocessing/self-refine.js';
export { SelfConsistency } from './postprocessing/self-consistency.js';
export { DecomposedPrompting } from './postprocessing/decomposed.js';

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
} from './types/index.js';

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
