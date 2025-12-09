/**
 * Self-Refine Postprocessing
 * Iteratively improves reasoning through feedback loops
 */

import type OpenAI from 'openai';
import { getTokenLimitParam } from '../utils/openai-compat.js';
import type { SelfRefineConfig, ReasoningResponse } from '../types/index.js';
import { PostprocessingError } from '../types/errors.js';

/**
 * Default configuration for Self-Refine
 */
const DEFAULT_CONFIG = {
  maxIterations: 3,
  convergenceThreshold: 0.95,
};

/**
 * Self-Refine postprocessing implementation
 *
 * Implements the Self-Refine technique where the LLM iteratively critiques
 * and improves its own reasoning until convergence or max iterations.
 *
 * @example
 * ```typescript
 * const selfRefine = new SelfRefine(client, {
 *   maxIterations: 3,
 *   convergenceThreshold: 0.95
 * });
 *
 * const refined = await selfRefine.refine(
 *   initialResponse,
 *   question,
 *   context
 * );
 * ```
 */
export class SelfRefine {
  private config: {
    maxIterations: number;
    convergenceThreshold: number;
    critiquePrompt?: string;
  };

  constructor(
    private client: OpenAI,
    config: SelfRefineConfig = {}
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Refine a reasoning response through iterative self-critique
   *
   * @param initialResponse - The initial reasoning response to refine
   * @param question - The original question
   * @param context - The original context
   * @returns Refined reasoning response with improved answer
   */
  async refine(
    initialResponse: ReasoningResponse,
    question: string,
    context: string
  ): Promise<ReasoningResponse> {
    let currentResponse = initialResponse;
    let iteration = 0;
    const refinementHistory: Array<{
      iteration: number;
      answer: string;
      critique: string;
    }> = [];

    try {
      while (iteration < this.config.maxIterations) {
        iteration++;

        // Step 1: Generate critique of current answer
        const critique = await this.generateCritique(
          currentResponse.answer,
          question,
          context,
          currentResponse.formula
        );

        refinementHistory.push({
          iteration,
          answer: currentResponse.answer,
          critique,
        });

        // Check if critique indicates the answer is good enough
        if (this.isSatisfactory(critique)) {
          break;
        }

        // Step 2: Generate improved answer based on critique
        const improvedAnswer = await this.generateImprovedAnswer(
          currentResponse.answer,
          critique,
          question,
          context,
          currentResponse.formula
        );

        // Step 3: Check for convergence
        const similarity = this.calculateSimilarity(currentResponse.answer, improvedAnswer);

        if (similarity >= this.config.convergenceThreshold) {
          // Converged - use improved answer and stop
          currentResponse = {
            ...currentResponse,
            answer: improvedAnswer,
            proof: [
              ...currentResponse.proof,
              {
                step: currentResponse.proof.length + 1,
                description: `Self-Refine iteration ${iteration}: Converged (similarity: ${similarity.toFixed(2)})`,
                response: improvedAnswer,
              },
            ],
          };
          break;
        }

        // Update current response with improved answer
        currentResponse = {
          ...currentResponse,
          answer: improvedAnswer,
          proof: [
            ...currentResponse.proof,
            {
              step: currentResponse.proof.length + 1,
              description: `Self-Refine iteration ${iteration}: Improved answer`,
              response: improvedAnswer,
            },
          ],
        };
      }

      // Add refinement summary to proof
      currentResponse = {
        ...currentResponse,
        proof: [
          ...currentResponse.proof,
          {
            step: currentResponse.proof.length + 1,
            description: `Self-Refine completed after ${iteration} iteration(s)`,
          },
        ],
      };

      return currentResponse;
    } catch (error) {
      throw new PostprocessingError(
        `Self-Refine failed: ${error instanceof Error ? error.message : String(error)}`,
        'self-refine',
        { iteration, refinementHistory }
      );
    }
  }

  /**
   * Generate critique of current answer
   */
  private async generateCritique(
    answer: string,
    question: string,
    context: string,
    formula: string
  ): Promise<string> {
    const prompt =
      this.config.critiquePrompt ||
      this.getDefaultCritiquePrompt(answer, question, context, formula);

    const response = await this.client.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at evaluating logical reasoning. Provide constructive, specific critique.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      ...getTokenLimitParam('gpt-5.1', 1000),
    });

    return response.choices[0]?.message?.content ?? 'Unable to generate critique';
  }

  /**
   * Generate improved answer based on critique
   */
  private async generateImprovedAnswer(
    previousAnswer: string,
    critique: string,
    question: string,
    context: string,
    formula: string
  ): Promise<string> {
    const prompt = `Given the following logical reasoning problem:

Question: ${question}

Context: ${context}

Formula: ${formula.substring(0, 500)}...

Previous Answer: ${previousAnswer}

Critique: ${critique}

Please provide an improved answer that addresses the critique while maintaining logical correctness. Be concise and clear.

Improved Answer:`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at logical reasoning. Provide improved answers based on critique.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      ...getTokenLimitParam('gpt-5.1', 1000),
    });

    return response.choices[0]?.message?.content ?? previousAnswer;
  }

  /**
   * Get default critique prompt
   */
  private getDefaultCritiquePrompt(
    answer: string,
    question: string,
    context: string,
    formula: string
  ): string {
    return `Evaluate the following logical reasoning:

Question: ${question}

Context: ${context}

Formula (excerpt): ${formula.substring(0, 500)}...

Current Answer: ${answer}

Please critique this answer by:
1. Checking if it directly answers the question
2. Verifying logical consistency with the context
3. Identifying any gaps or unclear explanations
4. Suggesting specific improvements

If the answer is already excellent, start your critique with "SATISFACTORY:" followed by brief confirmation.

Critique:`;
  }

  /**
   * Check if critique indicates satisfactory answer
   */
  private isSatisfactory(critique: string): boolean {
    const satisfactoryIndicators = [
      'SATISFACTORY:',
      'excellent',
      'no improvements needed',
      'already correct',
      'well-reasoned',
    ];

    const lowerCritique = critique.toLowerCase();
    return satisfactoryIndicators.some((indicator) =>
      lowerCritique.includes(indicator.toLowerCase())
    );
  }

  /**
   * Calculate similarity between two strings (simple approach)
   * Returns value between 0 and 1
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Normalize strings
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    const s1 = normalize(str1);
    const s2 = normalize(str2);

    // Exact match
    if (s1 === s2) {
      return 1.0;
    }

    // Calculate Jaccard similarity based on words
    const words1 = new Set(s1.split(' '));
    const words2 = new Set(s2.split(' '));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<SelfRefineConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<typeof this.config> {
    return { ...this.config };
  }
}
