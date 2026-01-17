/**
 * Watchwyrd - Crypto Utility Tests
 *
 * Tests for AES-256-GCM encryption/decryption of user configs.
 */

import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  isEncrypted,
  encryptConfig,
  decryptConfig,
  generateSecretKey,
} from '../src/utils/crypto.js';

describe('Crypto Utilities', () => {
  const testSecret = 'test-secret-key-for-unit-tests';

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Same text';
      const encrypted1 = encrypt(plaintext, testSecret);
      const encrypted2 = encrypt(plaintext, testSecret);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(decrypt(encrypted1, testSecret)).toBe(plaintext);
      expect(decrypt(encrypted2, testSecret)).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🎬🎥 émojis';
      const encrypted = encrypt(plaintext, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large strings', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = encrypt(plaintext, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail with wrong secret', () => {
      const plaintext = 'Secret message';
      const encrypted = encrypt(plaintext, testSecret);

      expect(() => decrypt(encrypted, 'wrong-secret')).toThrow();
    });

    it('should fail with tampered ciphertext', () => {
      const plaintext = 'Secret message';
      const encrypted = encrypt(plaintext, testSecret);

      // Tamper with the encrypted data
      const tampered = encrypted.slice(0, -5) + 'xxxxx';

      expect(() => decrypt(tampered, testSecret)).toThrow();
    });

    it('should add enc. prefix to encrypted strings', () => {
      const encrypted = encrypt('test', testSecret);
      expect(encrypted.startsWith('enc.')).toBe(true);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted strings', () => {
      const encrypted = encrypt('test', testSecret);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain strings', () => {
      expect(isEncrypted('hello')).toBe(false);
      expect(isEncrypted('enc')).toBe(false);
    });

    it('should return false for base64 strings', () => {
      const base64 = Buffer.from('test').toString('base64');
      expect(isEncrypted(base64)).toBe(false);
    });
  });

  describe('encryptConfig/decryptConfig', () => {
    it('should encrypt and decrypt config objects', () => {
      const config = {
        geminiApiKey: 'AIzaSy123456789',
        geminiModel: 'gemini-2.5-flash',
        timezone: 'America/New_York',
        includeMovies: true,
      };

      const encrypted = encryptConfig(config, testSecret);
      const decrypted = decryptConfig(encrypted, testSecret);

      expect(decrypted).toEqual(config);
    });

    it('should handle complex nested configs', () => {
      const config = {
        apiKey: 'secret123',
        preferences: {
          genres: ['Action', 'Comedy'],
          nested: {
            deep: true,
          },
        },
        numbers: [1, 2, 3],
      };

      const encrypted = encryptConfig(config, testSecret);
      const decrypted = decryptConfig(encrypted, testSecret);

      expect(decrypted).toEqual(config);
    });

    it('should return null for invalid encrypted data', () => {
      const result = decryptConfig('invalid-data', testSecret);
      expect(result).toBeNull();
    });

    it('should return null for unencrypted base64 configs', () => {
      const config = { legacyKey: 'value123' };
      const legacyBase64 = Buffer.from(JSON.stringify(config)).toString('base64');

      const decrypted = decryptConfig(legacyBase64, testSecret);
      expect(decrypted).toBeNull();
    });
  });

  describe('generateSecretKey', () => {
    it('should generate a random key', () => {
      const key1 = generateSecretKey();
      const key2 = generateSecretKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate URL-safe keys', () => {
      const key = generateSecretKey();

      // Should be base64url (no +, /, or =)
      expect(key).not.toMatch(/[+/=]/);
    });

    it('should generate keys of sufficient length', () => {
      const key = generateSecretKey();

      // 32 bytes = ~43 chars in base64url
      expect(key.length).toBeGreaterThanOrEqual(40);
    });

    it('should generate keys usable for encryption', () => {
      const key = generateSecretKey();
      const plaintext = 'Test with generated key';

      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('URL safety', () => {
    it('should produce URL-safe encrypted strings', () => {
      const config = {
        apiKey: 'test-key-with-special-chars!@#$%',
        unicode: '日本語テスト',
      };

      const encrypted = encryptConfig(config, testSecret);

      // Should not contain characters that need URL encoding
      expect(encrypted).not.toMatch(/[^a-zA-Z0-9._-]/);
    });

    it('should work after URL encoding/decoding', () => {
      const config = { key: 'value' };
      const encrypted = encryptConfig(config, testSecret);

      // Simulate URL encoding/decoding
      const urlEncoded = encodeURIComponent(encrypted);
      const urlDecoded = decodeURIComponent(urlEncoded);

      const decrypted = decryptConfig(urlDecoded, testSecret);
      expect(decrypted).toEqual(config);
    });
  });
});
