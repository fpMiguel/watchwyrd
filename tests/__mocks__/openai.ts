/**
 * Mock OpenAI SDK
 *
 * Factory functions for creating controllable mock instances
 * of the openai SDK for testing OpenAIProvider.
 */

import { vi } from 'vitest';

/**
 * Create a fully controllable mock for the OpenAI SDK.
 * Returns both the mock constructor and inner mock functions.
 */
export function createMockOpenAI() {
  const mockCreate = vi.fn();

  const OpenAI = vi.fn(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));

  return {
    OpenAI,
    mockCreate,
  };
}

/**
 * Configure the mock chat.completions.create to return a successful response
 * with the given content string.
 */
export function setupOpenAISuccess(
  mockCreate: ReturnType<typeof vi.fn>,
  content: string
) {
  mockCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  });
}

/**
 * Configure the mock to return a response with null content (empty).
 */
export function setupOpenAIEmptyResponse(
  mockCreate: ReturnType<typeof vi.fn>
) {
  mockCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: null,
        },
      },
    ],
  });
}

/**
 * Configure the mock to throw an error.
 */
export function setupOpenAIError(
  mockCreate: ReturnType<typeof vi.fn>,
  errorMessage: string
) {
  mockCreate.mockRejectedValue(new Error(errorMessage));
}

/**
 * Configure the mock for a streaming response (choices with no content).
 */
export function setupOpenAIEmptyChoices(
  mockCreate: ReturnType<typeof vi.fn>
) {
  mockCreate.mockResolvedValue({
    choices: [],
  });
}