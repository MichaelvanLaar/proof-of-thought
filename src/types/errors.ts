/**
 * Custom error classes for ProofOfThought library
 */

/**
 * Base error class for all ProofOfThought errors
 */
export class ProofOfThoughtError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProofOfThoughtError';
    Object.setPrototypeOf(this, ProofOfThoughtError.prototype);
  }
}

/**
 * Error thrown when LLM API calls fail
 */
export class LLMError extends ProofOfThoughtError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    details?: Record<string, unknown>
  ) {
    super(message, 'LLM_ERROR', details);
    this.name = 'LLMError';
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

/**
 * Error thrown when Z3 solver operations fail
 */
export class Z3Error extends ProofOfThoughtError {
  constructor(
    message: string,
    public readonly solverOutput?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'Z3_ERROR', details);
    this.name = 'Z3Error';
    Object.setPrototypeOf(this, Z3Error.prototype);
  }
}

/**
 * Error thrown when Z3 solver times out
 */
export class Z3TimeoutError extends Z3Error {
  constructor(
    message: string = 'Z3 solver operation timed out',
    public readonly timeoutMs: number,
    solverOutput?: string
  ) {
    super(message, solverOutput, { timeoutMs });
    this.name = 'Z3TimeoutError';
    Object.setPrototypeOf(this, Z3TimeoutError.prototype);
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends ProofOfThoughtError {
  constructor(
    message: string,
    public readonly field?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends ProofOfThoughtError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error thrown when backend operations fail
 */
export class BackendError extends ProofOfThoughtError {
  constructor(
    message: string,
    public readonly backend: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'BACKEND_ERROR', details);
    this.name = 'BackendError';
    Object.setPrototypeOf(this, BackendError.prototype);
  }
}

/**
 * Error thrown when formula translation fails
 */
export class TranslationError extends ProofOfThoughtError {
  constructor(
    message: string,
    public readonly originalText?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'TRANSLATION_ERROR', details);
    this.name = 'TranslationError';
    Object.setPrototypeOf(this, TranslationError.prototype);
  }
}

/**
 * Error thrown when postprocessing fails
 */
export class PostprocessingError extends ProofOfThoughtError {
  constructor(
    message: string,
    public readonly method: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'POSTPROCESSING_ERROR', details);
    this.name = 'PostprocessingError';
    Object.setPrototypeOf(this, PostprocessingError.prototype);
  }
}

/**
 * Error thrown when Z3 is not available or not properly configured
 */
export class Z3NotAvailableError extends Z3Error {
  constructor(message: string = 'Z3 solver is not available or not properly configured') {
    super(message);
    this.name = 'Z3NotAvailableError';
    Object.setPrototypeOf(this, Z3NotAvailableError.prototype);
  }
}

/**
 * Error thrown when parsing Z3 output fails
 */
export class ParsingError extends ProofOfThoughtError {
  constructor(
    message: string,
    public readonly rawOutput?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'PARSING_ERROR', details);
    this.name = 'ParsingError';
    Object.setPrototypeOf(this, ParsingError.prototype);
  }
}
