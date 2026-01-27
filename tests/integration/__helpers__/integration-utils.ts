/**
 * Shared Integration Test Utilities
 *
 * Common helpers for all integration tests (Cinemeta, AI Providers, etc.)
 * Reduces code duplication and ensures consistent patterns.
 */

import { expect } from 'vitest';
import type {
  AIResponse,
  AIRecommendation,
  ContentType,
  AIProvider,
  UserConfig,
} from '../../../src/types/index.js';
import { buildCatalogPrompt, type CatalogVariant } from '../../../src/prompts/index.js';
import { MINIMAL_CONTEXT } from '../../__fixtures__/configs.js';

// =============================================================================
// Constants
// =============================================================================

/** Standard timeouts for integration tests */
export const TIMEOUTS = {
  /** API key validation calls */
  validation: 30_000,
  /** Single recommendation generation */
  generation: 60_000,
  /** Cross-provider or batch operations */
  batch: 120_000,
} as const;

/** Skip condition for all integration tests */
export const SKIP_INTEGRATION = process.env['RUN_API_TESTS'] !== 'true';

/** Record mode for capturing responses to fixtures */
export const RECORD_MODE = process.env['RECORD_RESPONSES'] === 'true';

// =============================================================================
// Recording Utilities
// =============================================================================

/**
 * Log a response for fixture capture when RECORD_MODE is enabled.
 * Use consistent labels for easy identification.
 *
 * @example
 * recordResponse('gemini:movie:fornow:5', response);
 * recordResponse('cinemeta:lookup:the-matrix:1999', result);
 */
export function recordResponse(label: string, response: unknown): void {
  if (RECORD_MODE) {
    console.log(`\n📝 RECORDED: ${label}`);
    console.log(JSON.stringify(response, null, 2));
  }
}

/**
 * Print a banner when record mode is active (call in beforeAll)
 */
export function printRecordModeBanner(testSuiteName: string): void {
  if (RECORD_MODE) {
    const paddedName = testSuiteName.substring(0, 58).padEnd(58);
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    RECORD MODE ENABLED                       ║
╠══════════════════════════════════════════════════════════════╣
║ ${paddedName} ║
║ Responses will be logged. Copy to fixtures when done.       ║
╚══════════════════════════════════════════════════════════════╝`);
  }
}

/**
 * Print skip reason for visibility in test output
 */
export function logSkipReason(provider: string, reason: string): void {
  console.log(`⏭️  Skipping ${provider}: ${reason}`);
}

// =============================================================================
// Prompt Building
// =============================================================================

/**
 * Build a test prompt for recommendation generation.
 * Uses MINIMAL_CONTEXT for consistency across tests.
 */
export function buildTestPrompt(
  config: UserConfig,
  contentType: ContentType,
  count: number,
  variant: CatalogVariant = 'fornow'
): string {
  return buildCatalogPrompt({
    variant,
    context: MINIMAL_CONTEXT,
    contentType,
    count,
    config,
  });
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert that an AIResponse has valid structure.
 * Validates metadata and recommendation array.
 */
export function expectValidAIResponse(
  response: AIResponse,
  expectedProvider: AIProvider,
  options: { minRecommendations?: number; checkModel?: string } = {}
): void {
  const { minRecommendations = 1, checkModel } = options;

  // Response exists
  expect(response).toBeDefined();

  // Recommendations array
  expect(response.recommendations).toBeInstanceOf(Array);
  expect(response.recommendations.length).toBeGreaterThanOrEqual(minRecommendations);

  // Metadata
  expect(response.metadata).toBeDefined();
  expect(response.metadata.providerUsed).toBe(expectedProvider);
  expect(response.metadata.generatedAt).toBeTruthy();
  expect(response.metadata.modelUsed).toBeTruthy();

  if (checkModel) {
    expect(response.metadata.modelUsed).toBe(checkModel);
  }

  // Total candidates should be reasonable
  expect(response.metadata.totalCandidatesConsidered).toBeGreaterThanOrEqual(
    response.recommendations.length
  );
}

/**
 * Assert that a recommendation has all required fields with valid values.
 */
export function expectValidRecommendation(rec: AIRecommendation): void {
  // Required fields
  expect(rec.title).toBeTruthy();
  expect(typeof rec.title).toBe('string');

  expect(rec.year).toBeTypeOf('number');
  expect(rec.year).toBeGreaterThan(1900);
  expect(rec.year).toBeLessThanOrEqual(new Date().getFullYear() + 2); // Allow upcoming releases

  // Genres should be an array (may be empty in some responses)
  expect(rec.genres).toBeInstanceOf(Array);

  // IMDb ID format (if present)
  if (rec.imdbId) {
    expect(rec.imdbId).toMatch(/^tt\d{7,}$/);
  }

  // Explanation (if present) should be meaningful
  if (rec.explanation) {
    expect(rec.explanation.length).toBeGreaterThan(10);
  }

  // Confidence score (if present) should be 0-1
  if (rec.confidenceScore !== undefined) {
    expect(rec.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(rec.confidenceScore).toBeLessThanOrEqual(1);
  }
}

/**
 * Assert that all recommendations in a response are valid.
 */
export function expectAllRecommendationsValid(response: AIResponse): void {
  for (const rec of response.recommendations) {
    expectValidRecommendation(rec);
  }
}

/**
 * Assert API key validation result for valid key.
 */
export function expectValidKeyResult(result: { valid: boolean; error?: string }): void {
  expect(result.valid).toBe(true);
  expect(result.error).toBeUndefined();
}

/**
 * Assert API key validation result for invalid key.
 */
export function expectInvalidKeyResult(result: { valid: boolean; error?: string }): void {
  expect(result.valid).toBe(false);
  expect(result.error).toBeTruthy();
  expect(typeof result.error).toBe('string');
}

// =============================================================================
// Retry Utility (for flaky network conditions)
// =============================================================================

/**
 * Retry an async operation with exponential backoff.
 * Useful for integration tests that may fail due to transient network issues.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 1000, onRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        onRetry?.(attempt + 1, lastError);
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
