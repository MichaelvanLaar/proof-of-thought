/**
 * Decomposed Prompting
 * Breaks complex questions into sub-problems and solves them sequentially
 */

import type OpenAI from 'openai';
import type { DecomposedConfig, ReasoningResponse } from '../types/index.js';
import { PostprocessingError } from '../types/errors.js';

/**
 * Default configuration for Decomposed Prompting
 */
const DEFAULT_CONFIG = {
  maxSubQuestions: 5,
  decompositionPrompt: undefined,
};

/**
 * Sub-question with context from previous answers
 */
interface SubQuestion {
  question: string;
  order: number;
  dependencies: number[]; // Indices of questions this depends on
}

/**
 * Decomposed Prompting implementation
 *
 * Breaks down complex questions into simpler sub-questions, solves each
 * sequentially while building context, and combines results.
 *
 * @example
 * ```typescript
 * const decomposed = new DecomposedPrompting(client, reasoningEngine, {
 *   maxSubQuestions: 5
 * });
 *
 * const result = await decomposed.apply(
 *   'Complex multi-part question',
 *   'Context'
 * );
 * ```
 */
export class DecomposedPrompting {
  private config: {
    maxSubQuestions: number;
    decompositionPrompt?: string;
  };

  // eslint-disable-next-line no-unused-vars
  constructor(
    private client: OpenAI,
    // eslint-disable-next-line no-unused-vars
    private reasoningEngine: (_question: string, _context: string) => Promise<ReasoningResponse>,
    config: DecomposedConfig = {}
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Apply decomposed prompting to break down and solve a complex question
   *
   * @param question - The complex question to decompose
   * @param context - The context for reasoning
   * @returns Final reasoning response with combined answer
   */
  async apply(question: string, context: string): Promise<ReasoningResponse> {
    try {
      // Step 1: Decompose the question into sub-questions
      const subQuestions = await this.decompose(question, context);

      if (subQuestions.length === 0) {
        throw new PostprocessingError(
          'Failed to decompose question into sub-questions',
          'decomposed',
          { question }
        );
      }

      // Step 2: Solve each sub-question sequentially
      const subAnswers: Array<{ question: string; answer: string; response: ReasoningResponse }> =
        [];

      for (let i = 0; i < subQuestions.length; i++) {
        const subQ = subQuestions[i]!;

        // Build context including previous answers
        const enrichedContext = this.buildEnrichedContext(context, subAnswers, subQ.dependencies);

        // Solve the sub-question
        const subResponse = await this.reasoningEngine(subQ.question, enrichedContext);

        subAnswers.push({
          question: subQ.question,
          answer: subResponse.answer,
          response: subResponse,
        });
      }

      // Step 3: Combine results into final answer
      const finalAnswer = await this.combineResults(question, context, subAnswers);

      // Step 4: Build final response with combined proof
      const finalResponse = this.buildFinalResponse(
        question,
        finalAnswer,
        subAnswers,
        subQuestions
      );

      return finalResponse;
    } catch (error) {
      throw new PostprocessingError(
        `Decomposed Prompting failed: ${error instanceof Error ? error.message : String(error)}`,
        'decomposed',
        { question, context }
      );
    }
  }

  /**
   * Decompose a complex question into simpler sub-questions
   *
   * @param question - The complex question
   * @param context - The context
   * @returns Array of sub-questions with dependencies
   */
  async decompose(question: string, context: string): Promise<SubQuestion[]> {
    const prompt = this.buildDecompositionPrompt(question, context);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: this.getDecompositionSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for consistent decomposition
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new PostprocessingError('Failed to get decomposition from LLM', 'decomposed', {
        question,
      });
    }

    return this.parseSubQuestions(content);
  }

  /**
   * Build decomposition prompt
   */
  private buildDecompositionPrompt(question: string, context: string): string {
    if (this.config.decompositionPrompt) {
      return this.config.decompositionPrompt
        .replace('{question}', question)
        .replace('{context}', context);
    }

    return `Given the following complex question, break it down into ${this.config.maxSubQuestions} or fewer simpler sub-questions that need to be answered sequentially to solve the main question.

Main Question: ${question}

Context: ${context}

For each sub-question:
1. Make it self-contained and clear
2. Order them logically (simpler/foundational questions first)
3. Indicate which previous sub-questions it depends on (if any)

Format your response as a numbered list:
1. [Sub-question 1]
2. [Sub-question 2] (depends on: 1)
3. [Sub-question 3]

Keep the decomposition focused and avoid creating too many sub-questions.`;
  }

  /**
   * System prompt for decomposition
   */
  private getDecompositionSystemPrompt(): string {
    return `You are an expert at breaking down complex questions into simpler sub-questions.

Your task is to decompose complex questions into a logical sequence of simpler sub-questions that:
1. Are easier to answer individually
2. Build on each other when necessary
3. Lead to answering the main question when combined

Guidelines:
- Keep sub-questions clear and self-contained
- Order them logically (foundational questions first)
- Indicate dependencies explicitly
- Aim for 2-5 sub-questions typically
- Each sub-question should be significantly simpler than the main question`;
  }

  /**
   * Parse sub-questions from LLM response
   */
  private parseSubQuestions(content: string): SubQuestion[] {
    const subQuestions: SubQuestion[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Match patterns like: "1. Question text" or "1) Question text"
      const match = line.match(/^\s*(\d+)[\.)]\s*(.+?)(?:\s*\(depends on:\s*([0-9,\s]+)\))?\s*$/);

      if (match) {
        const order = parseInt(match[1]!, 10);
        const question = match[2]!.trim();
        const depsStr = match[3];

        const dependencies: number[] = [];
        if (depsStr) {
          // Parse comma-separated dependencies like "1, 2"
          const deps = depsStr
            .split(',')
            .map((d) => parseInt(d.trim(), 10))
            .filter((d) => !isNaN(d));
          dependencies.push(...deps);
        }

        subQuestions.push({ question, order, dependencies });
      }
    }

    // Sort by order
    subQuestions.sort((a, b) => a.order - b.order);

    // Limit to maxSubQuestions
    return subQuestions.slice(0, this.config.maxSubQuestions);
  }

  /**
   * Build enriched context including relevant previous answers
   */
  private buildEnrichedContext(
    originalContext: string,
    previousAnswers: Array<{ question: string; answer: string }>,
    dependencies: number[]
  ): string {
    let enriched = originalContext;

    if (dependencies.length > 0 && previousAnswers.length > 0) {
      enriched += '\n\nPrevious findings:';
      for (const dep of dependencies) {
        const depIndex = dep - 1; // Convert 1-based to 0-based
        if (depIndex >= 0 && depIndex < previousAnswers.length) {
          const prev = previousAnswers[depIndex]!;
          enriched += `\n\nQ: ${prev.question}\nA: ${prev.answer}`;
        }
      }
    } else if (previousAnswers.length > 0) {
      // Include all previous answers if no explicit dependencies
      enriched += '\n\nPrevious findings:';
      for (const prev of previousAnswers) {
        enriched += `\n\nQ: ${prev.question}\nA: ${prev.answer}`;
      }
    }

    return enriched;
  }

  /**
   * Combine sub-answers into final answer
   */
  private async combineResults(
    originalQuestion: string,
    originalContext: string,
    subAnswers: Array<{ question: string; answer: string }>
  ): Promise<string> {
    const prompt = `Original Question: ${originalQuestion}

Original Context: ${originalContext}

I broke this down into sub-questions and found the following answers:

${subAnswers
  .map(
    (sa, idx) => `${idx + 1}. Q: ${sa.question}
   A: ${sa.answer}`
  )
  .join('\n\n')}

Based on these sub-answers, provide a comprehensive answer to the original question. Synthesize the information logically and ensure the answer directly addresses the main question.`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at synthesizing information from multiple sources to answer complex questions comprehensively.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const finalAnswer = response.choices[0]?.message?.content;
    if (!finalAnswer) {
      throw new PostprocessingError('Failed to combine results from LLM', 'decomposed', {
        originalQuestion,
      });
    }

    return finalAnswer.trim();
  }

  /**
   * Build final response with combined proof
   */
  private buildFinalResponse(
    _originalQuestion: string,
    finalAnswer: string,
    subAnswers: Array<{ question: string; answer: string; response: ReasoningResponse }>,
    subQuestions: SubQuestion[]
  ): ReasoningResponse {
    // Combine all proofs from sub-questions
    const combinedProof: ReasoningResponse['proof'] = [
      {
        step: 1,
        description: `Decomposed Prompting: Breaking down complex question into ${subQuestions.length} sub-questions`,
      },
    ];

    let stepCounter = 1;

    // Add each sub-question's proof
    for (let i = 0; i < subAnswers.length; i++) {
      const subAnswer = subAnswers[i]!;
      const subQuestion = subQuestions[i]!;

      combinedProof.push({
        step: ++stepCounter,
        description: `Sub-question ${i + 1}: ${subQuestion.question}`,
        prompt: subQuestion.question,
      });

      // Add key proof steps from this sub-question (first and last)
      if (subAnswer.response.proof.length > 0) {
        const firstStep = subAnswer.response.proof[0];
        if (firstStep) {
          combinedProof.push({
            step: ++stepCounter,
            description: `  ${firstStep.description}`,
          });
        }

        const lastStep = subAnswer.response.proof[subAnswer.response.proof.length - 1];
        if (lastStep && lastStep !== firstStep) {
          combinedProof.push({
            step: ++stepCounter,
            description: `  ${lastStep.description}`,
          });
        }
      }

      combinedProof.push({
        step: ++stepCounter,
        description: `Sub-answer ${i + 1}: ${subAnswer.answer.substring(0, 100)}${subAnswer.answer.length > 100 ? '...' : ''}`,
        response: subAnswer.answer,
      });
    }

    combinedProof.push({
      step: ++stepCounter,
      description: 'Combining sub-answers into final comprehensive answer',
    });

    combinedProof.push({
      step: ++stepCounter,
      description: 'Decomposed Prompting completed',
      response: finalAnswer,
    });

    // Calculate combined execution time
    const totalExecutionTime = subAnswers.reduce((sum, sa) => sum + sa.response.executionTime, 0);

    // Use the first sub-answer's metadata as base
    const baseResponse = subAnswers[0]?.response;

    if (!baseResponse) {
      // Fallback if no sub-answers (shouldn't happen, but for type safety)
      return {
        answer: finalAnswer,
        formula: '',
        proof: combinedProof,
        isVerified: true,
        backend: 'smt2' as const,
        executionTime: totalExecutionTime,
      };
    }

    return {
      answer: finalAnswer,
      formula: baseResponse.formula,
      proof: combinedProof,
      isVerified: subAnswers.every((sa) => sa.response.isVerified),
      backend: baseResponse.backend,
      executionTime: totalExecutionTime,
      model: baseResponse.model,
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<DecomposedConfig>): void {
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
