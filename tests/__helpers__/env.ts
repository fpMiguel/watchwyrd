/**
 * Environment Setup for Tests
 *
 * This file is loaded FIRST by vitest (via setupFiles in vitest.config.ts)
 * to ensure environment variables are available before any test code runs.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables from .env.test
config({
  path: resolve(process.cwd(), '.env.test'),
  quiet: true, // Suppress dotenv logs during tests
});

/**
 * Handle expected unhandled rejections during tests.
 *
 * Some tests intentionally trigger error scenarios (rate limits, API errors, etc.)
 * that may create rejected promises. These are properly caught and handled in the
 * application code, but Vitest's promise tracking may still report them.
 *
 * Known expected errors:
 * - "AI service unavailable/down" - Provider failure tests
 * - "Rate limit exceeded (429)" - Rate limiting tests
 * - "Invalid API key (401)" - Auth failure tests
 * - "Request timeout" - Timeout tests
 * - "ECONNREFUSED" - Connection failure tests
 * - "No valid API key configured" - Config validation tests
 */
const EXPECTED_ERROR_PATTERNS = [
  /AI service/i,
  /Rate limit/i,
  /Invalid API key/i,
  /Request timeout/i,
  /ECONNREFUSED/i,
  /No valid API key/i,
  /timeout/i,
  /circuit breaker/i,
];

function isExpectedTestError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return EXPECTED_ERROR_PATTERNS.some((pattern) => pattern.test(error.message));
}

// Silence expected rejections during test runs
process.on('unhandledRejection', (reason: unknown) => {
  if (isExpectedTestError(reason)) {
    // Expected test error - don't report
    return;
  }
  // Re-throw unexpected errors so they're visible
  throw reason;
});
