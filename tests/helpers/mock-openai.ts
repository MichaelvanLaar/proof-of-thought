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

    // Use specific response if available, otherwise use default
    const response = responses[callCount] || { content: defaultResponse };
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

  return createMockOpenAIClient({
    responses: [
      { content: customFormula || defaultFormula },
      { content: defaultExplanation },
    ],
  });
}

/**
 * Creates a mock OpenAI client for JSON backend testing
 */
export function createMockJSONClient(customDSL?: string): OpenAI {
  const defaultDSL = `\`\`\`json
{
  "sorts": {
    "Person": {"type": "uninterpreted"}
  },
  "constants": {
    "Socrates": {"sort": "Person"}
  },
  "functions": {
    "human": {
      "params": [{"name": "x", "sort": "Person"}],
      "return": "Bool"
    },
    "mortal": {
      "params": [{"name": "x", "sort": "Person"}],
      "return": "Bool"
    }
  },
  "assertions": [
    {
      "type": "forall",
      "variables": [{"name": "x", "sort": "Person"}],
      "body": {
        "type": "implies",
        "left": {"type": "app", "name": "human", "args": [{"type": "var", "name": "x"}]},
        "right": {"type": "app", "name": "mortal", "args": [{"type": "var", "name": "x"}]}
      }
    },
    {
      "type": "app",
      "name": "human",
      "args": [{"type": "const", "value": "Socrates"}]
    },
    {
      "type": "not",
      "arg": {
        "type": "app",
        "name": "mortal",
        "args": [{"type": "const", "value": "Socrates"}]
      }
    }
  ]
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
