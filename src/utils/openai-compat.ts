/**
 * OpenAI API compatibility utilities
 *
 * Handles API changes between model versions, particularly the transition
 * from max_tokens to max_completion_tokens in GPT-5+ models.
 */

/**
 * Check if a model uses the new max_completion_tokens parameter (GPT-5+)
 * @param model - The model identifier (e.g., 'gpt-5.1', 'gpt-4o')
 * @returns true if the model requires max_completion_tokens
 */
export function usesMaxCompletionTokens(model: string): boolean {
  // GPT-5 and later use max_completion_tokens
  // Extract major version from model name (e.g., 'gpt-5.1' -> 5)
  const match = model.match(/gpt-(\d+)/i);
  if (match && match[1]) {
    const majorVersion = parseInt(match[1], 10);
    return majorVersion >= 5;
  }

  // Default to max_tokens for unknown models
  return false;
}

/**
 * Build chat completion parameters with correct token parameter name
 * @param model - The model identifier
 * @param maxTokens - Maximum tokens for completion
 * @returns Object with either max_tokens or max_completion_tokens
 */
export function getTokenLimitParam(
  model: string,
  maxTokens: number
): { max_tokens?: number; max_completion_tokens?: number } {
  if (usesMaxCompletionTokens(model)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}
