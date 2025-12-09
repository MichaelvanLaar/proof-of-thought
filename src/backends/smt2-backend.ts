/**
 * SMT2 Backend - SMT-LIB 2.0 format backend
 */

import type OpenAI from 'openai';
import type { Backend, Formula, VerificationResult, SMT2Formula } from '../types/index.js';
import type { Z3Adapter } from '../types/index.js';
import { BackendError, TranslationError, ValidationError, LLMError } from '../types/errors.js';
import { getTokenLimitParam } from '../utils/openai-compat.js';

/**
 * Configuration for SMT2 Backend
 */
export interface SMT2BackendConfig {
  /**
   * OpenAI client for LLM translation
   */
  client: OpenAI;

  /**
   * Z3 adapter for formula verification
   */
  z3Adapter: Z3Adapter;

  /**
   * LLM model to use
   * @default 'gpt-5.1'
   */
  model?: string;

  /**
   * Temperature for LLM sampling
   * @default 0.0
   */
  temperature?: number;

  /**
   * Maximum tokens for LLM response
   * @default 2048
   */
  maxTokens?: number;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * Maximum formula size in bytes
   * @default 1048576 (1MB)
   */
  maxFormulaSize?: number;
}

/**
 * SMT2 Backend implementation using SMT-LIB 2.0 format
 * Translates natural language to SMT2 formulas using LLMs and verifies with Z3
 */
export class SMT2Backend implements Backend {
  readonly type = 'smt2' as const;

  private config: Required<SMT2BackendConfig>;

  constructor(config: SMT2BackendConfig) {
    this.config = {
      client: config.client,
      z3Adapter: config.z3Adapter,
      model: config.model ?? 'gpt-5.1',
      temperature: config.temperature ?? 0.0,
      maxTokens: config.maxTokens ?? 2048,
      verbose: config.verbose ?? false,
      maxFormulaSize: config.maxFormulaSize ?? 1048576, // 1MB default
    };
  }

  /**
   * Sanitize user input to prevent prompt injection attacks
   */
  private sanitizeInput(input: string): string {
    const MAX_INPUT_LENGTH = 10000;

    // Truncate to maximum length
    let sanitized = input.substring(0, MAX_INPUT_LENGTH);

    // Remove potential prompt injection patterns
    sanitized = sanitized
      .replace(/ignore\s+previous\s+instructions/gi, '')
      .replace(/ignore\s+all\s+previous/gi, '')
      .replace(/disregard\s+previous/gi, '')
      .replace(/system\s*:/gi, '')
      .replace(/assistant\s*:/gi, '');

    return sanitized.trim();
  }

  /**
   * Translate natural language question and context to SMT-LIB 2.0 formula
   */
  async translate(question: string, context: string): Promise<Formula> {
    if (!question || question.trim().length === 0) {
      throw new ValidationError('Question cannot be empty', 'question');
    }

    // Sanitize inputs to prevent prompt injection
    const safeQuestion = this.sanitizeInput(question);
    const safeContext = this.sanitizeInput(context);

    const prompt = this.buildTranslationPrompt(safeQuestion, safeContext);

    try {
      const response = await this.config.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.config.temperature,
        ...getTokenLimitParam(this.config.model, this.config.maxTokens),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new TranslationError('LLM returned empty response');
      }

      // Extract SMT2 formula from response (handle code blocks)
      const formula = this.extractSMT2Formula(content);

      // Validate the formula
      this.validateSMT2Formula(formula);

      return formula as SMT2Formula;
    } catch (error) {
      if (error instanceof TranslationError || error instanceof ValidationError) {
        throw error;
      }

      if (error && typeof error === 'object' && 'status' in error) {
        throw new LLMError(
          `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`,
          (error as { status?: number }).status,
          (error as { status?: number }).status === 429 || // Rate limit
            (error as { status?: number }).status === 503 // Service unavailable
        );
      }

      throw new TranslationError(
        `Failed to translate to SMT2: ${error instanceof Error ? error.message : String(error)}`,
        question
      );
    }
  }

  /**
   * Verify an SMT2 formula using Z3 solver
   */
  async verify(formula: Formula): Promise<VerificationResult> {
    const smt2Formula = formula as string;

    // Validate formula before verification
    this.validateSMT2Formula(smt2Formula);

    try {
      // Use Z3 adapter to execute the formula
      const result = await this.config.z3Adapter.executeSMT2(smt2Formula);
      return result;
    } catch (error) {
      throw new BackendError(
        `SMT2 verification failed: ${error instanceof Error ? error.message : String(error)}`,
        'smt2',
        { formula: smt2Formula.substring(0, 200) }
      );
    }
  }

  /**
   * Explain verification result in natural language
   */
  async explain(result: VerificationResult, question: string, context: string): Promise<string> {
    const explanationPrompt = this.buildExplanationPrompt(result, question, context);

    try {
      const response = await this.config.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at explaining logical reasoning results in simple, clear language.',
          },
          {
            role: 'user',
            content: explanationPrompt,
          },
        ],
        temperature: 0.3,
        ...getTokenLimitParam(this.config.model, 500),
      });

      return response.choices[0]?.message?.content ?? 'Unable to generate explanation';
    } catch (_error) {
      // If explanation fails, return a basic explanation
      return this.generateBasicExplanation(result);
    }
  }

  /**
   * Get system prompt for SMT2 translation
   */
  private getSystemPrompt(): string {
    return `You are an expert at translating natural language logical statements into SMT-LIB 2.0 format for Z3 solver.

Your task is to:
1. Analyze the given question and context
2. Identify all entities, properties, and logical relationships
3. Generate a complete SMT-LIB 2.0 formula that represents the logical problem
4. Ensure the formula can be checked for satisfiability

SMT-LIB 2.0 Syntax Rules:
- DO NOT use (set-logic ...) declarations - let Z3 choose automatically
- declare-sort: Always include arity: (declare-sort SortName 0) for 0-arity sorts
- declare-const: (declare-const name Type)
- declare-fun: (declare-fun name (ArgType1 ArgType2...) ReturnType)
- Use built-in types: Int, Bool, Real, String
- For logic with quantifiers, prefer built-in types over custom sorts when possible
- Assertions: (assert formula)
- Commands: (check-sat) and optionally (get-model)

Guidelines:
- Add assertions for all given facts
- Add the query as a final assertion (usually negated to check validity)
- To prove "If A then B", assert A and (not B), then check-sat. If unsat, the implication is valid.
- Use quantifiers (forall/exists) only when necessary
- NEVER include (set-logic ...) - this can cause compatibility issues
- Return ONLY the SMT2 formula, wrapped in a code block

Example 1 (Simple arithmetic):
\`\`\`smt2
(declare-const x Int)
(assert (> x 0))
(check-sat)
(get-model)
\`\`\`

Example 2 (Logical reasoning with predicates):
\`\`\`smt2
(declare-fun Human (String) Bool)
(declare-fun Mortal (String) Bool)

;; All humans are mortal
(assert (forall ((x String)) (=> (Human x) (Mortal x))))

;; Socrates is human
(assert (Human "Socrates"))

;; Query: Is Socrates mortal? (negated to check validity)
(assert (not (Mortal "Socrates")))

(check-sat)
(get-model)
\`\`\``;
  }

  /**
   * Build translation prompt from question and context
   */
  private buildTranslationPrompt(question: string, context: string): string {
    return `Translate the following logical problem into SMT-LIB 2.0 format:

Context:
${context || 'No additional context provided.'}

Question:
${question}

Generate a complete SMT-LIB 2.0 formula that can be checked with Z3 solver.`;
  }

  /**
   * Build explanation prompt from verification result
   */
  private buildExplanationPrompt(
    result: VerificationResult,
    question: string,
    context: string
  ): string {
    // Construct the explanation prompt with full context
    let prompt = `You are explaining the result of a logical reasoning verification to a non-technical user.

IMPORTANT CONTEXT:
We used "proof by refutation" - we tested if the NEGATION of the conclusion leads to a contradiction.
- If UNSAT (unsatisfiable): The negation is impossible, so the original answer is TRUE/YES
- If SAT (satisfiable): The negation is possible, so the original answer is FALSE/NO or UNKNOWN

Original Question: ${question}
Context: ${context || 'None'}
Verification Result: ${result.result.toUpperCase()}
`;

    if (result.model && Object.keys(result.model).length > 0) {
      prompt += `\nCounter-example values:\n`;
      for (const [key, value] of Object.entries(result.model)) {
        prompt += `  ${key} = ${JSON.stringify(value)}\n`;
      }
    }

    prompt += `
Your task:
1. First, clearly state whether the answer to the original question is YES/NO/TRUE/FALSE
2. Then explain WHY in simple, non-technical language
3. Mention that we used "proof by contradiction" if relevant

DO NOT just explain what SAT/UNSAT means technically. Instead, directly answer the user's question.

Example:
Question: "Is Socrates mortal?"
Result: UNSAT
Good answer: "Yes, Socrates is mortal. We proved this by showing that assuming the opposite (Socrates is not mortal) leads to a logical contradiction with the given facts."

Bad answer: "UNSAT means unsatisfiable..."

Provide a clear, direct answer:`;

    return prompt;
  }

  /**
   * Extract SMT2 formula from LLM response (handle code blocks)
   */
  private extractSMT2Formula(content: string): string {
    // Validate content size to prevent ReDoS attacks
    const MAX_CONTENT_LENGTH = 100000; // 100KB
    if (content.length > MAX_CONTENT_LENGTH) {
      throw new ValidationError(
        `LLM response too large (${content.length} chars), maximum is ${MAX_CONTENT_LENGTH}`,
        'content'
      );
    }

    // Try to extract from code block first
    const codeBlockMatch = content.match(/```(?:smt2?|lisp)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1]?.trim() ?? '';
    }

    // If no code block, use string methods to avoid ReDoS
    const declareIndex = content.indexOf('(declare-');
    const checkSatIndex = content.indexOf('(check-sat)');

    if (declareIndex !== -1 && checkSatIndex !== -1 && checkSatIndex > declareIndex) {
      return content.substring(declareIndex, checkSatIndex + 11).trim();
    }

    // Return the whole content if it looks like SMT2
    if (content.includes('(declare-') || content.includes('(assert')) {
      return content.trim();
    }

    throw new TranslationError('Could not extract SMT2 formula from LLM response', content);
  }

  /**
   * Validate SMT2 formula syntax and size
   */
  private validateSMT2Formula(formula: string): void {
    if (!formula || formula.trim().length === 0) {
      throw new ValidationError('SMT2 formula is empty', 'formula');
    }

    // Check formula size to prevent DoS attacks
    const formulaSize = Buffer.byteLength(formula, 'utf8');
    if (formulaSize > this.config.maxFormulaSize) {
      throw new ValidationError(
        `Formula size (${formulaSize} bytes) exceeds maximum allowed size (${this.config.maxFormulaSize} bytes)`,
        'formula'
      );
    }

    // Basic syntax validation
    const openParens = (formula.match(/\(/g) || []).length;
    const closeParens = (formula.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      throw new ValidationError(
        `Unbalanced parentheses in SMT2 formula: ${openParens} open, ${closeParens} close`,
        'formula'
      );
    }

    // Check for required commands
    if (!formula.includes('check-sat')) {
      throw new ValidationError('SMT2 formula must include (check-sat) command', 'formula');
    }

    // Check for at least one declaration or assertion
    if (!formula.includes('declare-') && !formula.includes('assert')) {
      throw new ValidationError(
        'SMT2 formula must include at least one declaration or assertion',
        'formula'
      );
    }
  }

  /**
   * Generate basic explanation when LLM explanation fails
   */
  private generateBasicExplanation(result: VerificationResult): string {
    switch (result.result) {
      case 'sat':
        if (result.model && Object.keys(result.model).length > 0) {
          const modelStr = Object.entries(result.model)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(', ');
          return `The logical statement is satisfiable. Found solution: ${modelStr}`;
        }
        return 'The logical statement is satisfiable (a solution exists).';

      case 'unsat':
        return 'The logical statement is unsatisfiable (no solution exists, or the conclusion is logically valid).';

      case 'unknown':
        return 'Z3 could not determine satisfiability (the problem may be too complex or require more time).';

      default:
        return `Verification result: ${result.result}`;
    }
  }
}
