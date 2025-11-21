/**
 * ProofOfThought - Main reasoning class
 * High-level API for neurosymbolic reasoning
 */

import type OpenAI from 'openai';
import type {
  ProofOfThoughtConfig,
  ReasoningResponse,
  Backend,
  PostprocessingMethod,
  ReasoningStep,
  SelfRefineConfig,
  SelfConsistencyConfig,
} from '../types/index.js';
import { ConfigurationError, ValidationError } from '../types/errors.js';
import { SMT2Backend } from '../backends/smt2-backend.js';
import { JSONBackend } from '../backends/json-backend.js';
import { createZ3Adapter } from '../adapters/utils.js';
import { SelfRefine } from '../postprocessing/self-refine.js';

/**
 * Main ProofOfThought class for neurosymbolic reasoning
 *
 * @example
 * ```typescript
 * import { ProofOfThought } from '@proof-of-thought/core';
 * import OpenAI from 'openai';
 *
 * const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 * const pot = new ProofOfThought({ client, backend: 'smt2' });
 *
 * const response = await pot.query(
 *   'Is Socrates mortal?',
 *   'All humans are mortal. Socrates is human.'
 * );
 * console.log(response.answer);
 * ```
 */
export class ProofOfThought {
  private readonly config: Required<
    Omit<
      ProofOfThoughtConfig,
      'z3Path' | 'postprocessing' | 'selfRefineConfig' | 'selfConsistencyConfig'
    >
  > & {
    z3Path?: string;
    postprocessing: PostprocessingMethod[];
    selfRefineConfig?: SelfRefineConfig;
    selfConsistencyConfig?: SelfConsistencyConfig;
  };
  private backend?: Backend;
  private selfRefine?: SelfRefine;
  private initialized = false;

  constructor(config: ProofOfThoughtConfig) {
    // Validate configuration
    if (!config.client) {
      throw new ConfigurationError('OpenAI client is required');
    }

    // Set defaults
    this.config = {
      client: config.client,
      backend: config.backend ?? 'smt2',
      model: config.model ?? 'gpt-4o',
      temperature: config.temperature ?? 0.0,
      maxTokens: config.maxTokens ?? 4096,
      z3Timeout: config.z3Timeout ?? 30000,
      postprocessing: config.postprocessing ?? [],
      verbose: config.verbose ?? false,
      z3Path: config.z3Path,
      selfRefineConfig: config.selfRefineConfig,
      selfConsistencyConfig: config.selfConsistencyConfig,
    };
  }

  /**
   * Initialize the reasoning engine
   * Lazy initialization on first query
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create Z3 adapter
    const z3Adapter = createZ3Adapter({
      timeout: this.config.z3Timeout,
      z3Path: this.config.z3Path,
    });

    // Initialize Z3 adapter
    await z3Adapter.initialize();

    // Create backend based on configuration
    if (this.config.backend === 'smt2') {
      this.backend = new SMT2Backend({
        client: this.config.client,
        z3Adapter,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        verbose: this.config.verbose,
      });
    } else if (this.config.backend === 'json') {
      // JSON backend will be implemented in Phase 5
      throw new ConfigurationError(
        'JSON backend not yet implemented. Please use "smt2" backend for now.'
      );
    } else {
      throw new ConfigurationError(`Unknown backend type: ${this.config.backend}`);
    }

    this.initialized = true;

    if (this.config.verbose) {
      console.log(`ProofOfThought initialized with ${this.config.backend} backend`);
      console.log(`Z3 adapter: ${z3Adapter.constructor.name}`);
      console.log(`Model: ${this.config.model}`);
    }
  }

  /**
   * Execute a reasoning query
   *
   * @param question - The question to answer
   * @param context - Optional context for the question
   * @returns Reasoning response with answer, proof, and verification
   */
  async query(question: string, context?: string): Promise<ReasoningResponse> {
    // Validate inputs
    if (!question || question.trim().length === 0) {
      throw new ValidationError('Question cannot be empty', 'question');
    }

    // Initialize if needed
    await this.initialize();

    if (!this.backend) {
      throw new ConfigurationError('Backend not initialized');
    }

    const startTime = Date.now();
    const proof: ReasoningStep[] = [];
    let stepCounter = 0;

    try {
      // Step 1: Translate to formal logic
      if (this.config.verbose) {
        console.log('\n=== Step 1: Translation ===');
        console.log(`Question: ${question}`);
        console.log(`Context: ${context || 'None'}`);
      }

      proof.push({
        step: ++stepCounter,
        description: 'Translating natural language to formal logic',
        prompt: question,
      });

      const formula = await this.backend.translate(question, context ?? '');

      proof.push({
        step: ++stepCounter,
        description: 'Generated formal logic formula',
        formula: String(formula),
      });

      if (this.config.verbose) {
        console.log(`\nFormula:\n${String(formula).substring(0, 500)}...`);
      }

      // Step 2: Verify with Z3
      if (this.config.verbose) {
        console.log('\n=== Step 2: Verification ===');
      }

      proof.push({
        step: ++stepCounter,
        description: 'Verifying formula with Z3 theorem prover',
      });

      const verificationResult = await this.backend.verify(formula);

      proof.push({
        step: ++stepCounter,
        description: `Verification complete: ${verificationResult.result.toUpperCase()}`,
        solverOutput: verificationResult.rawOutput.substring(0, 200),
      });

      if (this.config.verbose) {
        console.log(`Result: ${verificationResult.result}`);
        if (verificationResult.model) {
          console.log('Model:', verificationResult.model);
        }
      }

      // Step 3: Generate explanation
      if (this.config.verbose) {
        console.log('\n=== Step 3: Explanation ===');
      }

      proof.push({
        step: ++stepCounter,
        description: 'Generating natural language explanation',
      });

      const answer = await this.backend.explain(verificationResult);

      proof.push({
        step: ++stepCounter,
        description: 'Explanation generated',
        response: answer,
      });

      if (this.config.verbose) {
        console.log(`Answer: ${answer}`);
      }

      // Build initial response
      let response: ReasoningResponse = {
        answer,
        formula: String(formula),
        proof,
        isVerified: verificationResult.result === 'sat' || verificationResult.result === 'unsat',
        backend: this.config.backend,
        executionTime: Date.now() - startTime,
        model: verificationResult.model,
        tokensUsed: undefined, // Will be tracked in future enhancement
      };

      // Step 4: Apply postprocessing if configured
      if (this.config.postprocessing.length > 0) {
        if (this.config.verbose) {
          console.log(
            `\n=== Step 4: Postprocessing (${this.config.postprocessing.join(', ')}) ===`
          );
        }

        for (const method of this.config.postprocessing) {
          if (method === 'self-refine') {
            // Initialize Self-Refine if needed
            if (!this.selfRefine) {
              this.selfRefine = new SelfRefine(this.config.client, this.config.selfRefineConfig);
            }

            if (this.config.verbose) {
              console.log('\nApplying Self-Refine...');
            }

            response = await this.selfRefine.refine(response, question, context ?? '');

            if (this.config.verbose) {
              console.log(`Refined answer: ${response.answer}`);
            }
          } else {
            // Other postprocessing methods not yet implemented
            response.proof.push({
              step: response.proof.length + 1,
              description: `Postprocessing: ${method} (not yet implemented)`,
            });
          }
        }
      }

      // Update execution time after postprocessing
      response.executionTime = Date.now() - startTime;

      if (this.config.verbose) {
        console.log(`\n=== Total Execution Time: ${response.executionTime}ms ===\n`);
      }

      return response;
    } catch (error) {
      // Add error to proof trace
      proof.push({
        step: ++stepCounter,
        description: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });

      // Re-throw the error with execution time
      const executionTime = Date.now() - startTime;
      if (error instanceof Error) {
        (error as Error & { executionTime?: number }).executionTime = executionTime;
      }
      throw error;
    }
  }

  /**
   * Process multiple queries in batch
   *
   * @param queries - Array of [question, context] pairs
   * @param parallel - Whether to process queries in parallel
   * @returns Array of reasoning responses
   */
  async batch(queries: Array<[string, string?]>, parallel = false): Promise<ReasoningResponse[]> {
    if (queries.length === 0) {
      return [];
    }

    if (this.config.verbose) {
      console.log(
        `\n=== Batch Processing: ${queries.length} queries (${parallel ? 'parallel' : 'sequential'}) ===\n`
      );
    }

    if (parallel) {
      return Promise.all(queries.map(([q, c]) => this.query(q, c)));
    }

    const results: ReasoningResponse[] = [];
    for (let i = 0; i < queries.length; i++) {
      const [question, context] = queries[i]!;
      if (this.config.verbose) {
        console.log(`\n--- Query ${i + 1}/${queries.length} ---`);
      }
      results.push(await this.query(question, context));
    }
    return results;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<typeof this.config> {
    return { ...this.config };
  }

  /**
   * Check if the reasoning engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the backend type
   */
  getBackendType(): 'smt2' | 'json' {
    return this.config.backend;
  }
}
