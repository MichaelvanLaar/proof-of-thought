/**
 * Mock OpenAI client for deterministic testing
 */

import { vi } from 'vitest';
import type OpenAI from 'openai';

export interface MockOpenAIResponse {
  content: string;
  role?: 'assistant' | 'user' | 'system';
}

export interface MockOpenAIOptions {
  responses?: MockOpenAIResponse[];
  defaultResponse?: string;
  delay?: number;
  shouldFail?: boolean;
  failureMessage?: string;
}

/**
 * Creates a mock OpenAI client with configurable responses
 */
export function createMockOpenAIClient(options: MockOpenAIOptions = {}): OpenAI {
  const {
    responses = [],
    defaultResponse = 'Mock response',
    delay = 0,
    shouldFail = false,
    failureMessage = 'Mock API error',
  } = options;

  let callCount = 0;

  const mockCreate = vi.fn().mockImplementation(async (params: unknown) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (shouldFail) {
      throw new Error(failureMessage);
    }

    const messages = (params as { messages: Array<{ role: string; content: string }> }).messages;
    const lastMessage = messages[messages.length - 1];

    // Use specific response if available, cycle through responses if needed, or use default
    const response =
      responses.length > 0
        ? responses[callCount % responses.length]
        : { content: defaultResponse };
    callCount++;

    return {
      id: `chatcmpl-mock-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: {
            role: response.role || 'assistant',
            content: response.content,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: lastMessage?.content.length || 0,
        completion_tokens: response.content.length,
        total_tokens: (lastMessage?.content.length || 0) + response.content.length,
      },
    };
  });

  return {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  } as unknown as OpenAI;
}

/**
 * Creates a mock OpenAI client for SMT2 backend testing
 *
 * Uses smart detection of request type (translate vs explain) from prompt content
 * to return appropriate responses regardless of call order (supports parallel execution).
 */
export function createMockSMT2Client(customFormula?: string): OpenAI {
  const defaultFormula = `\`\`\`smt2
(declare-const human_Socrates Bool)
(declare-const mortal_Socrates Bool)
(declare-fun human (Bool) Bool)
(declare-fun mortal (Bool) Bool)
(assert (forall ((x Bool)) (=> (human x) (mortal x))))
(assert (human human_Socrates))
(assert (not mortal_Socrates))
(check-sat)
(get-model)
\`\`\``;

  const defaultExplanation =
    'The logical statement is unsatisfiable, which means the conclusion is logically valid. If all humans are mortal and Socrates is human, then Socrates must be mortal.';

  const mockCreate = vi.fn().mockImplementation(async (params: unknown) => {
    const messages = (params as { messages: Array<{ role: string; content: string }> }).messages;
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content || '';

    // Detect request type from prompt content
    let responseContent: string;
    if (content.includes('Translate') || content.includes('SMT-LIB')) {
      // Translation request -> return formula
      responseContent = customFormula || defaultFormula;
    } else if (content.includes('Explain') || content.includes('reasoning result')) {
      // Explanation request -> return explanation
      responseContent = defaultExplanation;
    } else {
      // Fallback
      responseContent = defaultFormula;
    }

    return {
      id: `chatcmpl-mock-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: responseContent,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: content.length,
        completion_tokens: responseContent.length,
        total_tokens: content.length + responseContent.length,
      },
    };
  });

  return {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  } as unknown as OpenAI;
}

/**
 * Creates a mock OpenAI client for JSON backend testing
 */
export function createMockJSONClient(customDSL?: string): OpenAI {
  const defaultDSL = `\`\`\`json
{
  "sorts": {
    "Entity": "DeclareSort"
  },
  "functions": {
    "Human": {
      "domain": ["Entity"],
      "range": "Bool"
    },
    "Mortal": {
      "domain": ["Entity"],
      "range": "Bool"
    }
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
\`\`\``;

  const defaultExplanation =
    'The logical statement is unsatisfiable, which means the conclusion is logically valid.';

  return createMockOpenAIClient({
    responses: [{ content: customDSL || defaultDSL }, { content: defaultExplanation }],
  });
}

/**
 * Resets all mock call counts and history
 */
export function resetMocks(): void {
  vi.clearAllMocks();
}
