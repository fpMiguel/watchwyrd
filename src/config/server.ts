/**
 * Watchwyrd - Server Configuration
 *
 * Loads and validates environment variables for server configuration.
 */

import { z } from 'zod';
import 'dotenv/config';

/**
 * Generate a default secret key for development
 * In production, SECRET_KEY MUST be set in environment
 */
function getDefaultSecretKey(): string {
  // Use a deterministic key for dev (so URLs work across restarts)
  // This is NOT secure - only for development!
  return 'watchwyrd-dev-secret-key-not-for-production';
}

/**
 * Environment variable schema
 */
const envSchema = z.object({
  PORT: z.string().default('7000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BASE_URL: z.string().default('http://localhost:7000'),
  CACHE_BACKEND: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().optional(),
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
  // IMPORTANT: Set a unique, random value in production!
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  SECRET_KEY: z.string().optional(),
});

/**
 * Parse and validate environment variables
 */
function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

const env = loadEnv();

// Warn if SECRET_KEY is not set in production
if (env.NODE_ENV === 'production' && !env.SECRET_KEY) {
  console.error('⚠️  WARNING: SECRET_KEY not set in production!');
  console.error('   User API keys will NOT be encrypted in URLs.');
  console.error(
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
    backend: env.CACHE_BACKEND,
    redisUrl: env.REDIS_URL,
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
    secretKey: env.SECRET_KEY || getDefaultSecretKey(),
    hasCustomSecretKey: !!env.SECRET_KEY,
  },
} as const;

export type ServerConfig = typeof serverConfig;
