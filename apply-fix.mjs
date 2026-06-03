import { readFile, writeFile } from 'node:fs/promises';
const path = './src/utils/crypto.ts';
const content = await readFile(path, 'utf8');
const oldCode = `export function encryptConfig(config: Record<string, unknown>, secret: string): string {
  const json = JSON.stringify(config);
  return encrypt(json, secret);
}`;
const newCode = `export function encryptConfig(config: Record<string, unknown>, secret: string): string {
  const enrichedConfig: Record<string, unknown> = {
    ...config,
    _meta: {
      version: 2,
      createdAt: Date.now(),
    },
  };
  const json = JSON.stringify(enrichedConfig);
  return encrypt(json, secret);
}`;
const newContent = content.replace(oldCode, newCode);
await writeFile(path, newContent);
console.log('File updated');
