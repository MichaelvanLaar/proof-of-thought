/**
 * Custom error classes for ProofOfThought library
 *
 * @packageDocumentation
 */

/**
 * Base error class for all ProofOfThought errors
 *
 * All custom errors in the library extend from this base class,
 * providing consistent error handling and additional context.
 *
 * @example
 * ```typescript
 * try {
 *   await pot.query(question, context);
 * } catch (error) {
 *   if (error instanceof ProofOfThoughtError) {
 *     console.error(`Error code: ${error.code}`);
 *     console.error(`Details:`, error.details);
 *   }
 * }
 * ```
 */
export class ProofOfThoughtError extends Error {
  /**
   * Creates a new ProofOfThoughtError
   *
   * @param message - Human-readable error message
   * @param code - Optional error code for programmatic handling
   * @param details - Optional additional error context
   */
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
 *
 * This error is thrown when OpenAI or Azure OpenAI API calls encounter errors
 * such as rate limits, authentication failures, or service unavailability.
 *
 * @example
 * ```typescript
 * try {
 *   await pot.query(question, context);
 * } catch (error) {
 *   if (error instanceof LLMError) {
 *     if (error.retryable) {
 *       // Implement retry logic
 *       console.log(`Retryable error (status ${error.statusCode})`);
 *     }
 *   }
 * }
 * ```
 */
export class LLMError extends ProofOfThoughtError {
  /**
   * Creates a new LLMError
   *
   * @param message - Human-readable error message
   * @param statusCode - Optional HTTP status code from the API
   * @param retryable - Whether the operation can be retried
   * @param details - Optional additional error context
   */
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
 *
 * This error is thrown when Z3 theorem prover encounters errors during
 * formula verification, such as syntax errors or execution failures.
 *
 * @example
 * ```typescript
 * try {
 *   const result = await backend.verify(formula);
 * } catch (error) {
 *   if (error instanceof Z3Error) {
 *     console.error('Z3 solver error:', error.message);
 *     console.error('Solver output:', error.solverOutput);
 *   }
 * }
 * ```
 */
export class Z3Error extends ProofOfThoughtError {
  /**
   * Creates a new Z3Error
   *
   * @param message - Human-readable error message
   * @param solverOutput - Optional raw output from Z3 solver
   * @param details - Optional additional error context
   */
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
 *
 * This error is thrown when Z3 solver exceeds the configured timeout
 * duration while attempting to verify a formula.
 *
 * @example
 * ```typescript
 * const pot = new ProofOfThought({
 *   client,
 *   z3Timeout: 5000 // 5 seconds
 * });
 *
 * try {
 *   await pot.query(complexQuestion, context);
 * } catch (error) {
 *   if (error instanceof Z3TimeoutError) {
 *     console.error(`Timeout after ${error.timeoutMs}ms`);
 *     // Try with simpler query or increase timeout
 *   }
 * }
 * ```
 */
export class Z3TimeoutError extends Z3Error {
  /**
   * Creates a new Z3TimeoutError
   *
   * @param message - Human-readable error message
   * @param timeoutMs - The timeout duration that was exceeded (in milliseconds)
   * @param solverOutput - Optional partial output from Z3 before timeout
   */
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
 *
 * This error is thrown when user-provided inputs do not meet validation
 * requirements, such as empty questions or invalid parameters.
 *
 * @example
 * ```typescript
 * try {
 *   await pot.query('', context); // Empty question
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error(`Invalid ${error.field}: ${error.message}`);
 *   }
 * }
 * ```
 */
export class ValidationError extends ProofOfThoughtError {
  /**
   * Creates a new ValidationError
   *
   * @param message - Human-readable error message
   * @param field - Optional name of the field that failed validation
   * @param details - Optional additional error context
   */
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
 *
 * This error is thrown when ProofOfThought is initialized with invalid
 * configuration options.
 *
 * @example
 * ```typescript
 * try {
 *   const pot = new ProofOfThought({
 *     // Missing required 'client' field
 *     backend: 'smt2'
 *   } as any);
 * } catch (error) {
 *   if (error instanceof ConfigurationError) {
 *     console.error('Configuration error:', error.message);
 *   }
 * }
 * ```
 */
export class ConfigurationError extends ProofOfThoughtError {
  /**
   * Creates a new ConfigurationError
   *
   * @param message - Human-readable error message
   * @param details - Optional additional error context
   */
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error thrown when backend operations fail
 *
 * This error is thrown when a backend (SMT2 or JSON) encounters errors
 * during translation, verification, or explanation phases.
 *
 * @example
 * ```typescript
 * try {
 *   const result = await backend.translate(question, context);
 * } catch (error) {
 *   if (error instanceof BackendError) {
 *     console.error(`${error.backend} backend error:`, error.message);
 *   }
 * }
 * ```
 */
export class BackendError extends ProofOfThoughtError {
  /**
   * Creates a new BackendError
   *
   * @param message - Human-readable error message
   * @param backend - The backend that encountered the error ('smt2' or 'json')
   * @param details - Optional additional error context
   */
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
 *
 * This error is thrown when the LLM fails to translate natural language
 * into a valid formal logic formula (SMT2 or JSON DSL).
 *
 * @example
 * ```typescript
 * try {
 *   const formula = await backend.translate(question, context);
 * } catch (error) {
 *   if (error instanceof TranslationError) {
 *     console.error('Translation failed:', error.message);
 *     console.error('Original text:', error.originalText);
 *   }
 * }
 * ```
 */
export class TranslationError extends ProofOfThoughtError {
  /**
   * Creates a new TranslationError
   *
   * @param message - Human-readable error message
   * @param originalText - Optional original text that failed to translate
   * @param details - Optional additional error context
   */
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
 *
 * This error is thrown when postprocessing methods (self-refine,
 * self-consistency, etc.) encounter errors during execution.
 *
 * @example
 * ```typescript
 * const pot = new ProofOfThought({
 *   client,
 *   postprocessing: ['self-refine']
 * });
 *
 * try {
 *   await pot.query(question, context);
 * } catch (error) {
 *   if (error instanceof PostprocessingError) {
 *     console.error(`${error.method} postprocessing failed`);
 *     // Fallback to base result
 *   }
 * }
 * ```
 */
export class PostprocessingError extends ProofOfThoughtError {
  /**
   * Creates a new PostprocessingError
   *
   * @param message - Human-readable error message
   * @param method - The postprocessing method that failed
   * @param details - Optional additional error context
   */
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
 *
 * This error is thrown when the system cannot find or initialize Z3 solver,
 * either because it's not installed, not in PATH, or WASM is not available.
 *
 * @example
 * ```typescript
 * try {
 *   const pot = new ProofOfThought({ client });
 *   await pot.query(question, context);
 * } catch (error) {
 *   if (error instanceof Z3NotAvailableError) {
 *     console.error('Z3 not available. Please install Z3 solver.');
 *     console.error('See: docs/Z3_INSTALLATION.md');
 *   }
 * }
 * ```
 */
export class Z3NotAvailableError extends Z3Error {
  /**
   * Creates a new Z3NotAvailableError
   *
   * @param message - Human-readable error message
   */
  constructor(message: string = 'Z3 solver is not available or not properly configured') {
    super(message);
    this.name = 'Z3NotAvailableError';
    Object.setPrototypeOf(this, Z3NotAvailableError.prototype);
  }
}

/**
 * Error thrown when parsing Z3 output fails
 *
 * This error is thrown when the system cannot parse Z3 solver output,
 * either due to unexpected format or corrupted data.
 *
 * @example
 * ```typescript
 * try {
 *   const result = await z3Adapter.executeSMT2(formula);
 * } catch (error) {
 *   if (error instanceof ParsingError) {
 *     console.error('Failed to parse Z3 output');
 *     console.error('Raw output:', error.rawOutput);
 *   }
 * }
 * ```
 */
export class ParsingError extends ProofOfThoughtError {
  /**
   * Creates a new ParsingError
   *
   * @param message - Human-readable error message
   * @param rawOutput - Optional raw output that failed to parse
   * @param details - Optional additional error context
   */
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
