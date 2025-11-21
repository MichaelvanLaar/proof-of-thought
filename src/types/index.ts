/**
 * Core type definitions for ProofOfThought TypeScript library
 */

import type OpenAI from 'openai';

/**
 * Supported backend types for theorem proving
 */
export type BackendType = 'smt2' | 'json';

/**
 * Supported postprocessing enhancement methods
 */
export type PostprocessingMethod =
  | 'self-refine'
  | 'self-consistency'
  | 'decomposed'
  | 'least-to-most';

/**
 * Branded type for SMT2 formulas to prevent mixing with JSON formulas
 */
export type SMT2Formula = string & { readonly __brand: 'SMT2Formula' };

/**
 * Branded type for JSON formulas to prevent mixing with SMT2 formulas
 */
export type JSONFormula = object & { readonly __brand: 'JSONFormula' };

/**
 * Union type for all formula types
 */
export type Formula = SMT2Formula | JSONFormula;

/**
 * Configuration options for ProofOfThought instance
 */
export interface ProofOfThoughtConfig {
  /**
   * OpenAI or Azure OpenAI client instance
   */
  client: OpenAI;

  /**
   * Backend type to use for theorem proving
   * @default 'smt2'
   */
  backend?: BackendType;

  /**
   * LLM model to use for reasoning
   * @default 'gpt-4o'
   */
  model?: string;

  /**
   * Temperature for LLM sampling
   * @default 0.0
   */
  temperature?: number;

  /**
   * Maximum tokens for LLM responses
   * @default 4096
   */
  maxTokens?: number;

  /**
   * Timeout for Z3 solver operations (milliseconds)
   * @default 30000
   */
  z3Timeout?: number;

  /**
   * Postprocessing methods to apply
   * @default []
   */
  postprocessing?: PostprocessingMethod[];

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * Custom Z3 executable path (Node.js only)
   */
  z3Path?: string;
}

/**
 * Reasoning step in the proof trace
 */
export interface ReasoningStep {
  /**
   * Step number in the reasoning process
   */
  step: number;

  /**
   * Description of what this step does
   */
  description: string;

  /**
   * LLM prompt used (if applicable)
   */
  prompt?: string;

  /**
   * LLM response (if applicable)
   */
  response?: string;

  /**
   * Generated formula (if applicable)
   */
  formula?: string;

  /**
   * Z3 solver output (if applicable)
   */
  solverOutput?: string;
}

/**
 * Response from a reasoning query
 */
export interface ReasoningResponse {
  /**
   * The final answer to the question
   */
  answer: string;

  /**
   * The logical formula generated
   */
  formula: string;

  /**
   * Proof steps showing the reasoning process
   */
  proof: ReasoningStep[];

  /**
   * Whether the formula was verified by Z3
   */
  isVerified: boolean;

  /**
   * Backend used for verification
   */
  backend: BackendType;

  /**
   * Execution time in milliseconds
   */
  executionTime: number;

  /**
   * Model values from Z3 (if satisfiable)
   */
  model?: Record<string, unknown>;

  /**
   * Confidence score (if using self-consistency)
   */
  confidence?: number;

  /**
   * Number of LLM tokens used
   */
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Result from Z3 solver verification
 */
export interface VerificationResult {
  /**
   * Satisfiability result: sat, unsat, or unknown
   */
  result: 'sat' | 'unsat' | 'unknown';

  /**
   * Model values if satisfiable
   */
  model?: Record<string, unknown>;

  /**
   * Raw solver output
   */
  rawOutput: string;

  /**
   * Execution time in milliseconds
   */
  executionTime: number;

  /**
   * Any error messages from the solver
   */
  error?: string;
}

/**
 * Configuration for self-refine postprocessing
 */
export interface SelfRefineConfig {
  /**
   * Maximum refinement iterations
   * @default 3
   */
  maxIterations?: number;

  /**
   * Convergence threshold (similarity between iterations)
   * @default 0.95
   */
  convergenceThreshold?: number;

  /**
   * Custom critique prompt template
   */
  critiquePrompt?: string;
}

/**
 * Configuration for self-consistency postprocessing
 */
export interface SelfConsistencyConfig {
  /**
   * Number of reasoning paths to generate
   * @default 5
   */
  numSamples?: number;

  /**
   * Temperature for sampling diversity
   * @default 0.7
   */
  temperature?: number;

  /**
   * Voting method: 'majority' or 'weighted'
   * @default 'majority'
   */
  votingMethod?: 'majority' | 'weighted';
}

/**
 * Configuration for decomposed prompting
 */
export interface DecomposedConfig {
  /**
   * Maximum number of sub-questions to generate
   * @default 5
   */
  maxSubQuestions?: number;

  /**
   * Custom decomposition prompt template
   */
  decompositionPrompt?: string;
}

/**
 * Configuration for least-to-most prompting
 */
export interface LeastToMostConfig {
  /**
   * Number of complexity levels
   * @default 3
   */
  numLevels?: number;

  /**
   * Custom progression prompt template
   */
  progressionPrompt?: string;
}

/**
 * Backend interface that all theorem proving backends must implement
 */
export interface Backend {
  /**
   * Backend type identifier
   */
  readonly type: BackendType;

  /**
   * Translate natural language to formal logic formula
   */
  translate(question: string, context: string): Promise<Formula>;

  /**
   * Verify a formula using Z3 solver
   */
  verify(formula: Formula): Promise<VerificationResult>;

  /**
   * Explain verification result in natural language
   */
  explain(result: VerificationResult): Promise<string>;
}

/**
 * Z3 adapter interface for environment-specific Z3 integration
 */
export interface Z3Adapter {
  /**
   * Initialize the Z3 solver
   */
  initialize(): Promise<void>;

  /**
   * Execute SMT2 formula
   */
  executeSMT2(formula: string): Promise<VerificationResult>;

  /**
   * Execute JSON formula
   */
  executeJSON(formula: object): Promise<VerificationResult>;

  /**
   * Check if Z3 is available and properly configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get Z3 version information
   */
  getVersion(): Promise<string>;

  /**
   * Cleanup resources
   */
  dispose(): Promise<void>;
}
