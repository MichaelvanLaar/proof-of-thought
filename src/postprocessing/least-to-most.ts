/**
 * Least-to-Most Prompting
 * Solves problems progressively from simple to complex
 */

import type OpenAI from 'openai';
import type { LeastToMostConfig, ReasoningResponse } from '../types/index.js';
import { PostprocessingError } from '../types/errors.js';

/**
 * Default configuration for Least-to-Most
 */
const DEFAULT_CONFIG = {
  numLevels: 3,
  progressionPrompt: undefined,
};

/**
 * Progression level with complexity
 */
interface ProgressionLevel {
  level: number;
  question: string;
  complexity: string;
}

/**
 * Solution at a specific level
 */
interface LevelSolution {
  level: number;
  question: string;
  answer: string;
  response: ReasoningResponse;
}

/**
 * Least-to-Most Prompting implementation
 *
 * Implements the Least-to-Most technique where problems are solved
 * progressively from simplest to most complex, with each level
 * building on solutions from previous levels.
 *
 * @example
 * ```typescript
 * const leastToMost = new LeastToMost(
 *   client,
 *   reasoningEngine,
 *   { numLevels: 3 }
 * );
 *
 * const result = await leastToMost.apply(
 *   'Complex multi-step problem',
 *   'Context'
 * );
 * ```
 */
export class LeastToMost {
  private config: {
    numLevels: number;
    progressionPrompt?: string;
  };

  constructor(
    private client: OpenAI,

    private reasoningEngine: (_question: string, _context: string) => Promise<ReasoningResponse>,
    config: LeastToMostConfig = {}
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Apply least-to-most prompting to solve a complex question
   *
   * @param question - The complex question to solve
   * @param context - The context for reasoning
   * @returns Final reasoning response with progressive solution
   */
  async apply(question: string, context: string): Promise<ReasoningResponse> {
    try {
      const startTime = Date.now();

      // Step 1: Identify progression levels
      const levels = await this.identifyProgression(question, context);

      if (levels.length === 0) {
        throw new PostprocessingError('least-to-most', 'Failed to identify progression levels', {
          question,
        });
      }

      // Step 2: Solve each level progressively
      const solutions: LevelSolution[] = [];

      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        if (!level) {
          continue;
        }

        // Build context including previous solutions
        const enrichedContext = this.buildProgressiveContext(context, solutions, level);

        // Solve this level
        const levelResponse = await this.reasoningEngine(level.question, enrichedContext);

        solutions.push({
          level: level.level,
          question: level.question,
          answer: levelResponse.answer,
          response: levelResponse,
        });
      }

      // Step 3: Synthesize final answer from all levels
      const finalAnswer = await this.synthesizeSolution(question, context, solutions);

      const executionTime = Date.now() - startTime;

      // Step 4: Build final response
      return this.buildFinalResponse(question, finalAnswer, solutions, levels, executionTime);
    } catch (error) {
      if (error instanceof PostprocessingError) {
        throw error;
      }
      throw new PostprocessingError(
        'least-to-most',
        `Failed to apply least-to-most prompting: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { question, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Identify progression levels from simple to complex
   */
  private async identifyProgression(
    question: string,
    context: string
  ): Promise<ProgressionLevel[]> {
    const prompt =
      this.config.progressionPrompt ||
      `You are an expert at breaking down complex problems into progressive levels of complexity.

Given a question, identify ${this.config.numLevels} levels of sub-problems, progressing from simplest to most complex.
Each level should build on the previous level's solution.

Question: ${question}
Context: ${context}

Generate a numbered list of sub-questions, ordered from simplest (level 1) to most complex (level ${this.config.numLevels}).
Format each as:
1. [Complexity: simple/medium/complex] Sub-question text
2. [Complexity: simple/medium/complex] Sub-question text

Output ONLY the numbered list, no explanations.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseProgression(response);
    } catch (error) {
      throw new PostprocessingError(
        'least-to-most',
        `Failed to identify progression: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { question, error: error instanceof Error ? error.stack : undefined }
      );
    }
  }

  /**
   * Parse progression levels from LLM response
   */
  private parseProgression(response: string): ProgressionLevel[] {
    const levels: ProgressionLevel[] = [];
    const lines = response.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      // Match: 1. [Complexity: simple] Question text
      const match = line.match(/^\s*(\d+)[.)]\s*\[Complexity:\s*(\w+)\]\s*(.+)$/);
      if (match) {
        const [, levelStr, complexity, questionText] = match;
        const level = parseInt(levelStr || '0', 10);
        if (level > 0 && questionText) {
          levels.push({
            level,
            question: questionText.trim(),
            complexity: complexity?.toLowerCase() || 'unknown',
          });
        }
      }
    }

    // Sort by level to ensure correct order
    return levels.sort((a, b) => a.level - b.level);
  }

  /**
   * Build context with previous solutions
   */
  private buildProgressiveContext(
    baseContext: string,
    solutions: LevelSolution[],
    currentLevel: ProgressionLevel
  ): string {
    if (solutions.length === 0) {
      return baseContext;
    }

    let progressiveContext = baseContext + '\n\n## Previous Solutions:\n';

    for (const sol of solutions) {
      progressiveContext += `\nLevel ${sol.level}: ${sol.question}\nAnswer: ${sol.answer}\n`;
    }

    progressiveContext += `\n## Current Level:\nLevel ${currentLevel.level} (${currentLevel.complexity}): ${currentLevel.question}\n`;
    progressiveContext += '\nUse the previous solutions to help solve this level.';

    return progressiveContext;
  }

  /**
   * Synthesize final solution from all levels
   */
  private async synthesizeSolution(
    originalQuestion: string,
    context: string,
    solutions: LevelSolution[]
  ): Promise<string> {
    const solutionSummary = solutions
      .map((sol) => `Level ${sol.level}: ${sol.question}\nAnswer: ${sol.answer}`)
      .join('\n\n');

    const synthesisPrompt = `You have solved a complex problem by breaking it down into progressive levels.

Original Question: ${originalQuestion}
Context: ${context}

Solutions by Level:
${solutionSummary}

Synthesize these progressive solutions into a clear, comprehensive answer to the original question.
Focus on how each level built upon the previous one to reach the final solution.

Provide ONLY the final synthesized answer, no explanations of the process.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: synthesisPrompt,
          },
        ],
      });

      const finalAnswer = completion.choices[0]?.message?.content || '';
      return finalAnswer.trim();
    } catch (_error) {
      // Fallback: use the last level's answer
      const lastSolution = solutions[solutions.length - 1];
      return lastSolution?.answer || 'Unable to synthesize final answer';
    }
  }

  /**
   * Build final response with combined proof
   */
  private buildFinalResponse(
    _originalQuestion: string,
    finalAnswer: string,
    solutions: LevelSolution[],
    levels: ProgressionLevel[],
    totalExecutionTime: number
  ): ReasoningResponse {
    // Combine all proofs from progressive levels
    const combinedProof: ReasoningResponse['proof'] = [
      {
        step: 1,
        description: 'Identified progression levels',
        prompt: `Progression: ${levels.map((l) => `Level ${l.level} (${l.complexity})`).join(' → ')}`,
      },
    ];

    // Add each level's solution to the proof
    let stepNumber = 2;
    for (const sol of solutions) {
      const level = levels.find((l) => l.level === sol.level);

      // Add level identification
      combinedProof.push({
        step: stepNumber++,
        description: `Level ${sol.level} (${level?.complexity || 'unknown'}): ${sol.question}`,
      });

      // Add level's proof steps
      for (const proofStep of sol.response.proof) {
        combinedProof.push({
          ...proofStep,
          step: stepNumber++,
          description: `  ${proofStep.description}`,
        });
      }

      // Add level's answer
      combinedProof.push({
        step: stepNumber++,
        description: `Level ${sol.level} Answer: ${sol.answer}`,
      });
    }

    // Add synthesis step
    combinedProof.push({
      step: stepNumber,
      description: 'Synthesized final answer from progressive levels',
    });

    // Use the last solution's metadata as base
    const baseResponse = solutions[solutions.length - 1]?.response;

    if (!baseResponse) {
      // Fallback if no solutions (shouldn't happen, but for type safety)
      return {
        answer: finalAnswer,
        formula: '',
        proof: combinedProof,
        isVerified: false,
        backend: 'smt2' as const,
        executionTime: totalExecutionTime,
      };
    }

    return {
      answer: finalAnswer,
      formula: baseResponse.formula,
      proof: combinedProof,
      isVerified: solutions.every((sol) => sol.response.isVerified),
      backend: baseResponse.backend,
      executionTime: totalExecutionTime,
      model: baseResponse.model,
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<LeastToMostConfig>): void {
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
