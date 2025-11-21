/**
 * JSON Backend - JSON DSL format backend
 * Executes formulas using structured JSON programs
 */

import type OpenAI from 'openai';
import type {
  Backend,
  Formula,
  JSONFormula,
  VerificationResult,
  Z3Adapter,
} from '../types/index.js';
import { BackendError, TranslationError, Z3Error } from '../types/errors.js';
import { Z3JSONInterpreter } from './json-interpreter.js';
import { validateJSONProgramSafe } from './json-dsl-validators.js';
import type { JSONProgram } from './json-dsl-types.js';

/**
 * JSON DSL Instructions for LLM translation
 */
const JSON_DSL_INSTRUCTIONS = `You are a logical reasoning expert that converts natural language questions into structured JSON programs for Z3 theorem proving.

## JSON Program Structure

Generate a JSON object with the following structure:

\`\`\`json
{
  "sorts": {
    "SortName": "DeclareSort" | "Bool" | "Int" | "Real" | {"BitVec": number} | {"Enum": string[]} | {"Array": {"domain": string, "range": string}}
  },
  "functions": {
    "functionName": {
      "domain": ["Sort1", "Sort2"],
      "range": "ReturnSort"
    }
  },
  "constants": {
    "constantName": "SortName"
  },
  "knowledge_base": [
    "ForAll(x, Implies(predicate1(x), predicate2(x)))",
    "fact1(constant1)"
  ],
  "rules": [
    {
      "antecedent": "condition(x)",
      "consequent": "conclusion(x)",
      "variables": ["x"]
    }
  ],
  "verifications": {
    "query1": "predicate(constant)"
  }
}
\`\`\`

## Translation Steps

1. **Identify Sorts** - Entity types (Person, Number, etc.)
2. **Define Functions** - Properties and predicates (mortal, greater_than, etc.)
3. **Declare Constants** - Specific entities (Socrates, 42, etc.)
4. **Express Knowledge** - Universal facts and rules
5. **State Query** - What to verify

## Allowed Operators

- **Logical**: And, Or, Not, Implies, If
- **Quantifiers**: ForAll(var, expr), Exists(var, expr)
- **Comparison**: Distinct, Eq
- **Arithmetic**: Sum, Product

## Example: Socrates Syllogism

Question: "Is Socrates mortal?"
Context: "All humans are mortal. Socrates is human."

Output:
\`\`\`json
{
  "sorts": {
    "Entity": "DeclareSort"
  },
  "functions": {
    "Human": {"domain": ["Entity"], "range": "Bool"},
    "Mortal": {"domain": ["Entity"], "range": "Bool"}
  },
  "constants": {
    "Socrates": "Entity"
  },
  "knowledge_base": [
    "ForAll(x, Implies(Human(x), Mortal(x)))",
    "Human(Socrates)"
  ],
  "verifications": {
    "is_socrates_mortal": "Mortal(Socrates)"
  }
}
\`\`\`

## Your Task

Convert the given question and context into a valid JSON program. Return ONLY the JSON, no explanations.`;

/**
 * JSON Backend implementation using custom JSON DSL
 * Executes formulas via Z3 API
 */
export class JSONBackend implements Backend {
  readonly type = 'json' as const;

  private interpreter: Z3JSONInterpreter;

  constructor(
    private client: OpenAI,
    private z3Adapter: Z3Adapter,
    private config: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      z3Timeout?: number;
    } = {}
  ) {
    this.interpreter = new Z3JSONInterpreter(z3Adapter);
  }

  /**
   * Translate natural language to JSON DSL formula
   * @param question - The question to translate
   * @param context - Additional context
   * @returns JSON formula
   */
  async translate(question: string, context: string): Promise<Formula> {
    try {
      // Call LLM to generate JSON program
      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o',
        temperature: this.config.temperature ?? 0.0,
        max_tokens: this.config.maxTokens || 4096,
        messages: [
          {
            role: 'system',
            content: JSON_DSL_INSTRUCTIONS,
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nContext: ${context}\n\nGenerate the JSON program:`,
          },
        ],
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new TranslationError(
          'LLM returned empty response',
          question,
          'No content in completion'
        );
      }

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, response];
      const jsonText = jsonMatch[1] || response;

      // Parse and validate JSON
      let program: unknown;
      try {
        program = JSON.parse(jsonText.trim());
      } catch (error) {
        throw new TranslationError(
          'Failed to parse LLM JSON response',
          question,
          error instanceof Error ? error.message : 'Invalid JSON'
        );
      }

      // Validate against schema
      const validation = validateJSONProgramSafe(program);
      if (!validation.success) {
        throw new TranslationError(
          'LLM generated invalid JSON program',
          question,
          JSON.stringify(validation.error.errors, null, 2)
        );
      }

      // Return as branded JSONFormula
      return program as JSONFormula;
    } catch (error) {
      if (error instanceof TranslationError) {
        throw error;
      }
      throw new TranslationError(
        `JSON translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        question,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Verify a JSON formula using Z3
   * @param formula - The JSON formula to verify
   * @returns Verification result
   */
  async verify(formula: Formula): Promise<VerificationResult> {
    try {
      const startTime = Date.now();

      // Execute the JSON program
      const result = await this.interpreter.execute(
        formula as JSONProgram,
        this.config.z3Timeout || 30000
      );

      const executionTime = Date.now() - startTime;

      // Convert to VerificationResult format
      const overallSat = result.sat_count > 0;
      const overallUnsat = result.unsat_count > 0 && result.sat_count === 0;

      return {
        result: overallSat ? 'sat' : overallUnsat ? 'unsat' : 'unknown',
        model: result.model,
        rawOutput: result.rawOutput,
        executionTime,
      };
    } catch (error) {
      throw new Z3Error(
        `JSON verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Explain verification result in natural language
   * @param result - The verification result to explain
   * @returns Natural language explanation
   */
  async explain(result: VerificationResult): Promise<string> {
    try {
      if (result.result === 'sat') {
        if (result.model && Object.keys(result.model).length > 0) {
          const modelStr = Object.entries(result.model)
            .map(([k, v]) => `${k} = ${v}`)
            .join(', ');
          return `The query is satisfiable. Model: ${modelStr}`;
        }
        return 'The query is satisfiable (model extraction not available).';
      } else if (result.result === 'unsat') {
        return 'The query is unsatisfiable. The given constraints cannot be satisfied simultaneously.';
      } else {
        return 'The satisfiability of the query could not be determined (unknown result).';
      }
    } catch (error) {
      throw new BackendError(
        `Failed to explain result: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'json'
      );
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
  }
}
