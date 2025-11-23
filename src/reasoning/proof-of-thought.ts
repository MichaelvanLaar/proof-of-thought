/**
 * ProofOfThought - Main reasoning class
 * High-level API for neurosymbolic reasoning
 */

import type {
  ProofOfThoughtConfig,
  ReasoningResponse,
  Backend,
  PostprocessingMethod,
  ReasoningStep,
  SelfRefineConfig,
  SelfConsistencyConfig,
  DecomposedConfig,
  LeastToMostConfig,
  Z3Adapter,
} from '../types/index.js';
import { ConfigurationError, ValidationError } from '../types/errors.js';
import { SMT2Backend } from '../backends/smt2-backend.js';
import { JSONBackend } from '../backends/json-backend.js';
import { createZ3Adapter } from '../adapters/utils.js';
import { SelfRefine } from '../postprocessing/self-refine.js';
import { SelfConsistency } from '../postprocessing/self-consistency.js';
import { DecomposedPrompting } from '../postprocessing/decomposed.js';
import { LeastToMost } from '../postprocessing/least-to-most.js';

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
      | 'z3Path'
      | 'z3Adapter'
      | 'postprocessing'
      | 'selfRefineConfig'
      | 'selfConsistencyConfig'
      | 'decomposedConfig'
      | 'leastToMostConfig'
    >
  > & {
    z3Path?: string;
    z3Adapter?: Z3Adapter;
    postprocessing: PostprocessingMethod[];
    selfRefineConfig?: SelfRefineConfig;
    selfConsistencyConfig?: SelfConsistencyConfig;
    decomposedConfig?: DecomposedConfig;
    leastToMostConfig?: LeastToMostConfig;
  };
  private backend?: Backend;
  private selfRefine?: SelfRefine;
  private selfConsistency?: SelfConsistency;
  private decomposed?: DecomposedPrompting;
  private leastToMost?: LeastToMost;
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
      z3Adapter: config.z3Adapter,
      selfRefineConfig: config.selfRefineConfig,
      selfConsistencyConfig: config.selfConsistencyConfig,
      decomposedConfig: config.decomposedConfig,
      leastToMostConfig: config.leastToMostConfig,
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

    let z3Adapter: Z3Adapter | undefined;

    // Check if backend is already a Backend instance
    if (typeof this.config.backend === 'object' && this.config.backend !== null) {
      // Backend instance provided directly
      this.backend = this.config.backend;
    } else {
      // Create backend from type string
      // Check if Z3 adapter was provided in config
      if (this.config.z3Adapter) {
        z3Adapter = this.config.z3Adapter;
      } else {
        // Create Z3 adapter
        z3Adapter = await createZ3Adapter({
          timeout: this.config.z3Timeout,
          z3Path: this.config.z3Path,
        });

        // Initialize Z3 adapter
        await z3Adapter.initialize();
      }

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
        this.backend = new JSONBackend({
          client: this.config.client,
          z3Adapter,
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          z3Timeout: this.config.z3Timeout,
        });
      } else {
        throw new ConfigurationError(`Unknown backend type: ${this.config.backend}`);
      }
    }

    this.initialized = true;

    if (this.config.verbose) {
      console.log(`ProofOfThought initialized with ${this.getBackendType()} backend`);
      if (z3Adapter) {
        console.log(`Z3 adapter: ${z3Adapter.constructor.name}`);
      }
      console.log(`Model: ${this.config.model}`);
    }
  }

  /**
   * Execute a reasoning query
   *
   * @param question - The question to answer
   * @param context - Optional context for the question
   * @param temperature - Optional temperature override for sampling
   * @returns Reasoning response with answer, proof, and verification
   */
  async query(
    question: string,
    context?: string,
    temperature?: number
  ): Promise<ReasoningResponse> {
    // Validate inputs
    if (!question || question.trim().length === 0) {
      throw new ValidationError('Question cannot be empty', 'question');
    }

    // Initialize if needed
    await this.initialize();

    // Check if self-consistency is enabled
    if (this.config.postprocessing.includes('self-consistency')) {
      return this.queryWithSelfConsistency(question, context);
    }

    // Normal query flow
    return this.queryInternal(question, context, temperature);
  }

  /**
   * Internal query logic (without self-consistency)
   */
  private async queryInternal(
    question: string,
    context?: string,
    _temperature?: number
  ): Promise<ReasoningResponse> {
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
      // Extract backend type from config (could be string or Backend instance)
      const backendType: 'smt2' | 'json' =
        typeof this.config.backend === 'string' ? this.config.backend : this.backend!.type;

      let response: ReasoningResponse = {
        answer,
        formula: String(formula),
        proof,
        isVerified: verificationResult.result === 'sat' || verificationResult.result === 'unsat',
        backend: backendType,
        executionTime: Date.now() - startTime,
        model: verificationResult.model,
        tokensUsed: undefined, // Will be tracked in future enhancement
      };

      // Step 4: Apply postprocessing if configured
      const baseResponse = { ...response }; // Save base response for fallback
      const baseReasoningTime = response.executionTime;

      if (this.config.postprocessing.length > 0) {
        if (this.config.verbose) {
          console.log(
            `\n=== Step 4: Postprocessing (${this.config.postprocessing.join(', ')}) ===`
          );
        }

        // Initialize metrics tracking
        const methodsApplied: PostprocessingMethod[] = [];
        const methodExecutionTimes: Record<string, number> = {};
        const methodMetrics: {
          selfRefineIterations?: number;
          selfConsistencySamples?: number;
          decomposedSubQuestions?: number;
          leastToMostLevels?: number;
        } = {};

        for (const method of this.config.postprocessing) {
          const methodStartTime = Date.now();

          try {
            if (method === 'self-refine') {
              // Initialize Self-Refine if needed
              if (!this.selfRefine) {
                this.selfRefine = new SelfRefine(this.config.client, this.config.selfRefineConfig);
              }

              if (this.config.verbose) {
                console.log('\nApplying Self-Refine...');
              }

              response = await this.selfRefine.refine(response, question, context ?? '');

              // Extract metrics: count refinement iterations from proof
              const refinementSteps = response.proof.filter((p) =>
                p.description.includes('Refinement iteration')
              );
              methodMetrics.selfRefineIterations = refinementSteps.length;

              if (this.config.verbose) {
                console.log(`Refined answer: ${response.answer}`);
              }

              methodsApplied.push(method);
              methodExecutionTimes[method] = Date.now() - methodStartTime;
            } else if (method === 'decomposed') {
              // Initialize Decomposed Prompting if needed
              if (!this.decomposed) {
                // Create reasoning engine wrapper that excludes decomposed
                const reasoningEngine = async (
                  q: string,
                  c: string
                ): Promise<ReasoningResponse> => {
                  // Temporarily exclude decomposed from postprocessing to avoid recursion
                  const originalPostprocessing = this.config.postprocessing;
                  this.config.postprocessing = originalPostprocessing.filter(
                    (m) => m !== 'decomposed'
                  );

                  try {
                    return await this.queryInternal(q, c);
                  } finally {
                    this.config.postprocessing = originalPostprocessing;
                  }
                };

                this.decomposed = new DecomposedPrompting(
                  this.config.client,
                  reasoningEngine,
                  this.config.decomposedConfig
                );
              }

              if (this.config.verbose) {
                console.log('\nApplying Decomposed Prompting...');
              }

              // Decomposed prompting replaces the entire response
              response = await this.decomposed.apply(question, context ?? '');

              // Extract metrics: count sub-questions from proof
              const subQuestionSteps = response.proof.filter((p) =>
                p.description.includes('Sub-question')
              );
              methodMetrics.decomposedSubQuestions = subQuestionSteps.length;

              if (this.config.verbose) {
                console.log(`Decomposed answer: ${response.answer}`);
              }

              methodsApplied.push(method);
              methodExecutionTimes[method] = Date.now() - methodStartTime;
            } else if (method === 'least-to-most') {
              // Initialize Least-to-Most if needed
              if (!this.leastToMost) {
                // Create reasoning engine wrapper that excludes least-to-most
                const reasoningEngine = async (
                  q: string,
                  c: string
                ): Promise<ReasoningResponse> => {
                  // Temporarily exclude least-to-most from postprocessing to avoid recursion
                  const originalPostprocessing = this.config.postprocessing;
                  this.config.postprocessing = originalPostprocessing.filter(
                    (m) => m !== 'least-to-most'
                  );

                  try {
                    return await this.queryInternal(q, c);
                  } finally {
                    this.config.postprocessing = originalPostprocessing;
                  }
                };

                this.leastToMost = new LeastToMost(
                  this.config.client,
                  reasoningEngine,
                  this.config.leastToMostConfig
                );
              }

              if (this.config.verbose) {
                console.log('\nApplying Least-to-Most Prompting...');
              }

              // Least-to-most replaces the entire response
              response = await this.leastToMost.apply(question, context ?? '');

              // Extract metrics: count progression levels from proof
              const levelSteps = response.proof.filter((p) => p.description.includes('Level '));
              methodMetrics.leastToMostLevels = levelSteps.length;

              if (this.config.verbose) {
                console.log(`Least-to-Most answer: ${response.answer}`);
              }

              methodsApplied.push(method);
              methodExecutionTimes[method] = Date.now() - methodStartTime;
            } else {
              // Other postprocessing methods not yet implemented
              response.proof.push({
                step: response.proof.length + 1,
                description: `Postprocessing: ${method} (not yet implemented)`,
              });
            }
          } catch (error) {
            // Error handling: fallback to base result
            if (this.config.verbose) {
              console.error(`\nError in ${method} postprocessing:`, error);
              console.log(
                `Falling back to ${methodsApplied.length > 0 ? 'previous' : 'base'} result`
              );
            }

            // Add error to proof trace
            response.proof.push({
              step: response.proof.length + 1,
              description: `Postprocessing error in ${method}: ${error instanceof Error ? error.message : 'Unknown error'}. Using fallback result.`,
            });

            // Continue with next method (don't fail entire query)
          }
        }

        // Add postprocessing metrics to response
        const totalPostprocessingTime = Object.values(methodExecutionTimes).reduce(
          (sum, time) => sum + time,
          0
        );

        // Calculate comparative effectiveness
        const baseResultInfo = {
          answer: baseResponse.answer,
          isVerified: baseResponse.isVerified,
          proofSteps: baseResponse.proof.length,
        };

        const finalResultInfo = {
          answer: response.answer,
          isVerified: response.isVerified,
          proofSteps: response.proof.length,
        };

        const improvements = {
          answerChanged: baseResponse.answer !== response.answer,
          verificationImproved: !baseResponse.isVerified && response.isVerified,
          verificationWorsened: baseResponse.isVerified && !response.isVerified,
          proofExpanded: response.proof.length > baseResponse.proof.length,
        };

        response.postprocessingMetrics = {
          methodsApplied,
          methodExecutionTimes,
          methodMetrics,
          baseReasoningTime,
          totalPostprocessingTime,
          baseResult: baseResultInfo,
          finalResult: finalResultInfo,
          improvements,
        };
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
   * Query with self-consistency (generates multiple paths and aggregates)
   */
  private async queryWithSelfConsistency(
    question: string,
    context?: string
  ): Promise<ReasoningResponse> {
    // Initialize Self-Consistency if needed
    if (!this.selfConsistency) {
      // Create reasoning engine wrapper that excludes self-consistency
      const reasoningEngine = async (
        q: string,
        c: string,
        temp?: number
      ): Promise<ReasoningResponse> => {
        // Temporarily exclude self-consistency from postprocessing to avoid recursion
        const originalPostprocessing = this.config.postprocessing;
        this.config.postprocessing = originalPostprocessing.filter((m) => m !== 'self-consistency');

        try {
          return await this.queryInternal(q, c, temp);
        } finally {
          this.config.postprocessing = originalPostprocessing;
        }
      };

      this.selfConsistency = new SelfConsistency(
        this.config.client,
        reasoningEngine,
        this.config.selfConsistencyConfig
      );
    }

    if (this.config.verbose) {
      console.log('\n=== Self-Consistency: Generating multiple reasoning paths ===');
      const config = this.selfConsistency.getConfig();
      console.log(`Samples: ${config.numSamples}, Voting: ${config.votingMethod}`);
    }

    return this.selfConsistency.apply(question, context ?? '');
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
    if (typeof this.config.backend === 'string') {
      return this.config.backend;
    }
    return this.config.backend.type;
  }
}
