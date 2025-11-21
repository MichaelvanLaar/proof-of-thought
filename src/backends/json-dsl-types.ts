/**
 * JSON DSL Type Definitions
 * Defines the structure for JSON-based logical formulas
 */

/**
 * Sort definition types
 */
export type SortDefinition =
  | 'DeclareSort' // Custom uninterpreted sort
  | 'Bool' // Boolean sort
  | 'Int' // Integer sort
  | 'Real' // Real number sort
  | { BitVec: number } // Bitvector with size
  | { Enum: string[] } // Enumeration with values
  | { Array: { domain: string; range: string } }; // Array sort

/**
 * Function declaration with domain and range
 */
export interface FunctionDeclaration {
  /**
   * Domain sorts (parameter types)
   */
  domain: string[];

  /**
   * Range sort (return type)
   */
  range: string;
}

/**
 * Rule with optional quantification
 */
export interface Rule {
  /**
   * Rule antecedent (premise)
   */
  antecedent: string;

  /**
   * Rule consequent (conclusion)
   */
  consequent: string;

  /**
   * Optional quantified variables
   */
  variables?: string[];
}

/**
 * Complete JSON DSL program structure
 */
export interface JSONProgram {
  /**
   * Sort definitions (type system)
   */
  sorts: Record<string, SortDefinition>;

  /**
   * Function and predicate declarations
   */
  functions?: Record<string, FunctionDeclaration>;

  /**
   * Constant definitions with their sorts
   */
  constants?: Record<string, string>;

  /**
   * Variables for quantification
   */
  variables?: string[];

  /**
   * Knowledge base assertions
   */
  knowledge_base?: string[];

  /**
   * Conditional rules (implications)
   */
  rules?: Rule[];

  /**
   * Verification queries
   */
  verifications: Record<string, string>;

  /**
   * Optional post-processing actions
   */
  actions?: string[];
}

/**
 * Result from JSON program execution
 */
export interface JSONExecutionResult {
  /**
   * Verification results for each query
   */
  verifications: Record<string, 'sat' | 'unsat' | 'unknown'>;

  /**
   * Model values if satisfiable
   */
  model?: Record<string, unknown>;

  /**
   * Number of satisfied verifications
   */
  sat_count: number;

  /**
   * Number of unsatisfied verifications
   */
  unsat_count: number;

  /**
   * Raw Z3 output
   */
  rawOutput: string;

  /**
   * Execution time in milliseconds
   */
  executionTime: number;
}

/**
 * Allowed Z3 operators (security whitelist)
 */
export const ALLOWED_Z3_OPERATORS = [
  // Logical operators
  'And',
  'Or',
  'Not',
  'Implies',
  'If',
  // Quantifiers
  'ForAll',
  'Exists',
  // Comparison
  'Distinct',
  'Eq',
  // Arithmetic
  'Sum',
  'Product',
  // Advanced
  'Function',
  'Array',
  'BitVecVal',
] as const;

export type Z3Operator = (typeof ALLOWED_Z3_OPERATORS)[number];
