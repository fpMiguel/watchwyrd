/**
 * Watchwyrd - Server Configuration
 *
 * Loads and validates environment variables for server configuration.
 */

import { z } from 'zod';
import crypto from 'crypto';
import pino from 'pino';
import 'dotenv/config';

/**
 * Bootstrap logger for startup validation and warnings.
 * Created before config is loaded because the main logger depends on LOG_LEVEL
 * from config, creating a circular dependency. This logger is replaced by the
 * configured logger once config is fully loaded and the application starts.
 *
 * In development, uses pino-pretty for readable console output.
 * In production, outputs structured JSON for log aggregators.
 */
const startupLogger = pino({
  level: 'info',
  transport: process.env['NODE_ENV'] === 'development' ? { target: 'pino-pretty' } : undefined,
});

/**
 * Display missing required secrets and exit
 */
function handleMissingSecrets(missing: string[]): never {
  startupLogger.error('Required security environment variables are not set!');

  for (const name of missing) {
    if (name === 'SECRET_KEY') {
      const generatedKey = crypto.randomBytes(32).toString('base64url');
      startupLogger.error('SECRET_KEY is required to encrypt user API keys in addon URLs.');
      startupLogger.error(`Add to your .env:  SECRET_KEY=${generatedKey}`);
    }
    if (name === 'ENCRYPTION_SALT') {
      const generatedSalt = crypto.randomBytes(16).toString('base64url');
      startupLogger.error('ENCRYPTION_SALT adds deployment-specific entropy to key derivation.');
      startupLogger.error(`Add to your .env:  ENCRYPTION_SALT=${generatedSalt}`);
    }
  }

  startupLogger.error('Tip: Copy .env.example to .env and add the values above.');
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
  // REQUIRED in all environments - each deployment should have a unique salt
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
    startupLogger.error('Invalid environment configuration:');
    startupLogger.error(z.treeifyError(result.error));
    process.exit(1);
  }

  return result.data;
}

const env = loadEnv();

// Require SECRET_KEY and ENCRYPTION_SALT in ALL environments - fail fast at startup
const missingSecrets: string[] = [];
if (!env.SECRET_KEY) missingSecrets.push('SECRET_KEY');
if (!env.ENCRYPTION_SALT) missingSecrets.push('ENCRYPTION_SALT');

if (missingSecrets.length > 0) {
  handleMissingSecrets(missingSecrets);
}

// At this point, both are guaranteed to exist
const resolvedSecretKey = env.SECRET_KEY!;
const resolvedEncryptionSalt = env.ENCRYPTION_SALT!;

// Warn if SECRET_KEY has low entropy (less than 32 characters)
if (resolvedSecretKey.length < 32) {
  startupLogger.warn('SECRET_KEY is short (< 32 chars). Consider using a longer key.');
  startupLogger.warn(
    "Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\""
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
    secretKey: resolvedSecretKey,
    encryptionSalt: resolvedEncryptionSalt,
  },
} as const;
