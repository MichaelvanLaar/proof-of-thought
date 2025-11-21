/**
 * Self-Consistency Postprocessing
 * Generates multiple reasoning paths and uses majority voting
 */

import type OpenAI from 'openai';
import type { SelfConsistencyConfig, ReasoningResponse } from '../types/index.js';
import { PostprocessingError } from '../types/errors.js';

/**
 * Default configuration for Self-Consistency
 */
const DEFAULT_CONFIG: Required<SelfConsistencyConfig> = {
  numSamples: 5,
  temperature: 0.7,
  votingMethod: 'majority',
};

/**
 * Self-Consistency postprocessing implementation
 *
 * Implements the Self-Consistency technique where multiple reasoning paths are
 * generated with temperature sampling, and the most consistent answer is selected
 * through majority voting.
 *
 * @example
 * ```typescript
 * const selfConsistency = new SelfConsistency(reasoningEngine, {
 *   numSamples: 5,
 *   temperature: 0.7,
 *   votingMethod: 'majority'
 * });
 *
 * const result = await selfConsistency.apply(
 *   question,
 *   context
 * );
 * ```
 */
export class SelfConsistency {
  private config: Required<SelfConsistencyConfig>;

  constructor(
    _client: OpenAI, // Kept for API consistency but not used
    private reasoningEngine: (
      question: string,
      context: string,
      temperature?: number
    ) => Promise<ReasoningResponse>,
    config: SelfConsistencyConfig = {}
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Apply self-consistency by generating multiple reasoning paths
   *
   * @param question - The question to answer
   * @param context - The context for reasoning
   * @returns Enhanced reasoning response with confidence score
   */
  async apply(question: string, context: string): Promise<ReasoningResponse> {
    const paths: ReasoningResponse[] = [];

    try {
      // Step 1: Generate multiple reasoning paths
      for (let i = 0; i < this.config.numSamples; i++) {
        const response = await this.reasoningEngine(question, context, this.config.temperature);
        paths.push(response);
      }

      // Step 2: Aggregate answers using voting
      const aggregation = this.aggregate(paths);

      // Step 3: Find the response with the selected answer
      const selectedResponse = this.findBestResponse(paths, aggregation.answer);

      // Step 4: Build final response with confidence score
      return {
        ...selectedResponse,
        answer: aggregation.answer,
        confidence: aggregation.confidence,
        proof: [
          ...selectedResponse.proof,
          {
            step: selectedResponse.proof.length + 1,
            description: `Self-Consistency: Generated ${this.config.numSamples} paths, selected answer with ${(aggregation.confidence * 100).toFixed(1)}% confidence`,
          },
        ],
      };
    } catch (error) {
      throw new PostprocessingError(
        `Self-Consistency failed: ${error instanceof Error ? error.message : String(error)}`,
        'self-consistency',
        { numSamples: this.config.numSamples, pathsGenerated: paths.length }
      );
    }
  }

  /**
   * Aggregate multiple reasoning paths using voting
   *
   * @param paths - Array of reasoning responses
   * @returns Selected answer with confidence score
   */
  aggregate(paths: ReasoningResponse[]): { answer: string; confidence: number } {
    if (paths.length === 0) {
      throw new PostprocessingError(
        'Cannot aggregate empty paths',
        'self-consistency',
        { pathsLength: 0 }
      );
    }

    if (this.config.votingMethod === 'majority') {
      return this.majorityVote(paths);
    } else if (this.config.votingMethod === 'weighted') {
      return this.weightedVote(paths);
    }

    throw new PostprocessingError(
      `Unknown voting method: ${this.config.votingMethod}`,
      'self-consistency',
      { votingMethod: this.config.votingMethod }
    );
  }

  /**
   * Majority voting: Select the most common answer
   */
  private majorityVote(paths: ReasoningResponse[]): { answer: string; confidence: number } {
    // Count occurrences of each answer (normalized)
    const answerCounts = new Map<string, number>();
    const originalAnswers = new Map<string, string>(); // Track original formatting

    for (const path of paths) {
      const normalized = this.normalizeAnswer(path.answer);
      answerCounts.set(normalized, (answerCounts.get(normalized) || 0) + 1);
      if (!originalAnswers.has(normalized)) {
        originalAnswers.set(normalized, path.answer);
      }
    }

    // Find the answer with the most votes
    let maxVotes = 0;
    let selectedAnswer = '';

    for (const [normalized, count] of answerCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        selectedAnswer = normalized;
      }
    }

    // Calculate confidence as the proportion of votes for the selected answer
    const confidence = maxVotes / paths.length;

    return {
      answer: originalAnswers.get(selectedAnswer) || selectedAnswer,
      confidence,
    };
  }

  /**
   * Weighted voting: Consider verification status and execution time
   */
  private weightedVote(paths: ReasoningResponse[]): { answer: string; confidence: number } {
    // Assign weights based on verification status and execution time
    const answerWeights = new Map<string, number>();
    const originalAnswers = new Map<string, string>();
    let totalWeight = 0;

    for (const path of paths) {
      const normalized = this.normalizeAnswer(path.answer);

      // Calculate weight
      let weight = 1.0;

      // Bonus for verified answers
      if (path.isVerified) {
        weight *= 1.5;
      }

      // Bonus for faster execution (inverse of execution time, normalized)
      const maxExecutionTime = Math.max(...paths.map((p) => p.executionTime));
      const timeBonus = 1.0 + (maxExecutionTime - path.executionTime) / maxExecutionTime;
      weight *= timeBonus;

      answerWeights.set(normalized, (answerWeights.get(normalized) || 0) + weight);
      totalWeight += weight;

      if (!originalAnswers.has(normalized)) {
        originalAnswers.set(normalized, path.answer);
      }
    }

    // Find the answer with the highest weight
    let maxWeight = 0;
    let selectedAnswer = '';

    for (const [normalized, weight] of answerWeights.entries()) {
      if (weight > maxWeight) {
        maxWeight = weight;
        selectedAnswer = normalized;
      }
    }

    // Calculate confidence as the proportion of weight for the selected answer
    const confidence = maxWeight / totalWeight;

    return {
      answer: originalAnswers.get(selectedAnswer) || selectedAnswer,
      confidence,
    };
  }

  /**
   * Normalize answer for comparison
   * Removes extra whitespace, punctuation, and converts to lowercase
   */
  private normalizeAnswer(answer: string): string {
    return answer
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.,!?;:]+$/, ''); // Remove trailing punctuation
  }

  /**
   * Find the best response that matches the selected answer
   */
  private findBestResponse(
    paths: ReasoningResponse[],
    selectedAnswer: string
  ): ReasoningResponse {
    const normalizedSelected = this.normalizeAnswer(selectedAnswer);

    // Find all responses with the selected answer
    const matchingResponses = paths.filter(
      (p) => this.normalizeAnswer(p.answer) === normalizedSelected
    );

    if (matchingResponses.length === 0) {
      // Fallback to first response if no exact match
      return paths[0]!;
    }

    // Return the verified response with the shortest execution time
    matchingResponses.sort((a, b) => {
      // Prioritize verified responses
      if (a.isVerified !== b.isVerified) {
        return a.isVerified ? -1 : 1;
      }
      // Then sort by execution time
      return a.executionTime - b.executionTime;
    });

    return matchingResponses[0]!;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<SelfConsistencyConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<SelfConsistencyConfig>> {
    return { ...this.config };
  }

  /**
   * Get individual paths for analysis
   * Useful for debugging and understanding the voting process
   */
  async generatePaths(question: string, context: string): Promise<ReasoningResponse[]> {
    const paths: ReasoningResponse[] = [];

    for (let i = 0; i < this.config.numSamples; i++) {
      const response = await this.reasoningEngine(question, context, this.config.temperature);
      paths.push(response);
    }

    return paths;
  }
}
