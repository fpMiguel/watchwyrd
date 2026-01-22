/**
 * Watchwyrd - Server Configuration
 *
 * Loads and validates environment variables for server configuration.
 */

import { z } from 'zod';
import crypto from 'crypto';
import 'dotenv/config';

/**
 * Generate a secret key and display setup instructions
 * Called when SECRET_KEY is missing
 */
function handleMissingSecretKey(nodeEnv: string): never {
  const generatedKey = crypto.randomBytes(32).toString('base64url');

  console.error('');
  console.error('❌ SECRET_KEY is required but not set!');
  console.error('');
  console.error('   The SECRET_KEY is used to encrypt user API keys in addon URLs.');
  console.error('   Without it, API keys would be visible in plaintext URLs.');
  console.error('');
  console.error('   To fix this:');
  console.error('   1. Copy .env.example to .env (if not already done)');
  console.error('   2. Add the following line to your .env file:');
  console.error('');
  console.error(`      SECRET_KEY=${generatedKey}`);
  console.error('');

  if (nodeEnv === 'development') {
    console.error('   Tip: Run `cp .env.example .env` then add the SECRET_KEY above.');
  }

  process.exit(1);
}

/**
 * Environment variable schema
 */
const envSchema = z.object({
  PORT: z.string().default('7000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BASE_URL: z.string().default('http://localhost:7000'),
  CACHE_TTL: z.string().default('21600').transform(Number),
  CACHE_MAX_SIZE: z.string().default('1000').transform(Number),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  RATE_LIMIT_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  // Secret key for encrypting user config in URLs (AES-256-GCM)
  // REQUIRED in all environments - no default fallback
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  SECRET_KEY: z.string().optional(),
  // Salt for key derivation (PBKDF2)
  // Each deployment should have a unique salt for additional security
  // Generate with: node -e "console.log(require('crypto').randomBytes(16).toString('base64url'))"
  ENCRYPTION_SALT: z.string().optional(),
});

type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
function loadEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(z.treeifyError(result.error));
    process.exit(1);
  }

  return result.data;
}

const env = loadEnv();

// Require SECRET_KEY in all environments - no silent fallbacks
// Test environment is exempt (uses test fixtures)
if (!env.SECRET_KEY && env.NODE_ENV !== 'test') {
  handleMissingSecretKey(env.NODE_ENV);
}

// Warn if SECRET_KEY has low entropy (less than 32 characters)
if (env.SECRET_KEY && env.SECRET_KEY.length < 32) {
  console.warn('⚠️  WARNING: SECRET_KEY is short (< 32 chars). Consider using a longer key.');
  console.warn(
    "   Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\""
  );
}

/**
 * Server configuration object
 */
export const serverConfig = {
  port: env.PORT,
  host: env.HOST,
  baseUrl: env.BASE_URL,
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  cache: {
    ttl: env.CACHE_TTL,
    maxSize: env.CACHE_MAX_SIZE,
  },

  logging: {
    level: env.LOG_LEVEL,
  },

  rateLimit: {
    enabled: env.RATE_LIMIT_ENABLED,
    max: env.RATE_LIMIT_MAX,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
  },

  // Security: URL config encryption
  security: {
    // SECRET_KEY is validated above - will exit if missing (except in tests)
    secretKey: env.SECRET_KEY as string,
    // Custom salt for PBKDF2 key derivation (falls back to default if not set)
    encryptionSalt: env.ENCRYPTION_SALT,
  },
} as const;
