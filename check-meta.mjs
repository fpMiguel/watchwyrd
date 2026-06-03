import { encryptConfig, decrypt } from './dist/utils/crypto.js';
const secret = 'test-secret-key-for-unit-tests';
const config = { apiKey: 'test-key' };
const encrypted = encryptConfig(config, secret);
const json = decrypt(encrypted, secret);
console.log('Decrypted JSON:', json);
const parsed = JSON.parse(json);
console.log('Has _meta:', '_meta' in parsed);
console.log('_meta value:', parsed._meta);
