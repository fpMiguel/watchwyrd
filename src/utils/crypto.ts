/**
 * Watchwyrd - Cryptographic Utilities
 *
 * Provides AES-256-GCM encryption for securing user configuration in URLs.
 * This prevents API keys from being visible in plaintext URLs.
 *
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - Random IV for each encryption (prevents pattern analysis)
 * - Authentication tag prevents tampering
 * - URL-safe base64 encoding
 */

import crypto from 'crypto';
import { logger } from './logger.js';

// =============================================================================
// Constants
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Prefix to identify encrypted configs (vs legacy base64)
const ENCRYPTED_PREFIX = 'enc.';

// =============================================================================
// Key Derivation
// =============================================================================

/**
 * Derive a 256-bit key from the secret using PBKDF2
 * This allows using any length secret string
 */
function deriveKey(secret: string): Buffer {
  // Use a fixed salt - this is acceptable because:
  // 1. We're not storing passwords, just encrypting config
  // 2. The secret itself should be random and unique per deployment
  const salt = Buffer.from('watchwyrd-config-encryption-v1');
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

// =============================================================================
// Encryption
// =============================================================================

/**
 * Encrypt a string using AES-256-GCM
 *
 * Output format: enc.{base64url(iv + authTag + ciphertext)}
 *
 * @param plaintext - The string to encrypt (typically JSON config)
 * @param secret - The secret key (from SECRET_KEY env var)
 * @returns URL-safe encrypted string with 'enc.' prefix
 */
export function encrypt(plaintext: string, secret: string): string {
  try {
    const key = deriveKey(secret);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Combine: IV (16) + AuthTag (16) + Ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);

    // Use URL-safe base64 encoding
    const base64 = combined.toString('base64url');

    return ENCRYPTED_PREFIX + base64;
  } catch (error) {
    logger.error('Encryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to encrypt configuration');
  }
}

/**
 * Decrypt a string that was encrypted with encrypt()
 *
 * @param ciphertext - The encrypted string (with 'enc.' prefix)
 * @param secret - The secret key (must match the one used for encryption)
 * @returns The original plaintext string
 */
export function decrypt(ciphertext: string, secret: string): string {
  try {
    // Remove prefix
    if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
      throw new Error('Invalid encrypted format - missing prefix');
    }

    const base64 = ciphertext.slice(ENCRYPTED_PREFIX.length);
    const combined = Buffer.from(base64, 'base64url');

    // Minimum size: IV (16) + AuthTag (16) - empty plaintext produces 0-byte ciphertext
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted data - too short');
    }

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const key = deriveKey(secret);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  } catch {
    // Don't log the actual error details for security
    logger.warn('Decryption failed - invalid or corrupted data');
    throw new Error('Failed to decrypt configuration');
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a string is an encrypted config (has enc. prefix)
 */
export function isEncrypted(str: string): boolean {
  return str.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Generate a cryptographically secure random secret key
 * Use this to generate SECRET_KEY for .env
 */
export function generateSecretKey(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Encrypt config object to URL-safe string
 */
export function encryptConfig(config: Record<string, unknown>, secret: string): string {
  const json = JSON.stringify(config);
  return encrypt(json, secret);
}

/**
 * Decrypt URL string to config object
 * Only accepts encrypted format (enc.xxx)
 */
export function decryptConfig(configStr: string, secret: string): Record<string, unknown> | null {
  try {
    if (!isEncrypted(configStr)) {
      logger.warn('Invalid config format - must be encrypted (enc.xxx)');
      return null;
    }

    const json = decrypt(configStr, secret);
    return JSON.parse(json) as Record<string, unknown>;
  } catch (error) {
    logger.warn('Failed to decrypt/parse config', {
      isEncrypted: isEncrypted(configStr),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
