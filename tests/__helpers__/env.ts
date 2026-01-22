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
