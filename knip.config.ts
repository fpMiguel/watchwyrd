import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/index.ts'],
  project: ['src/**/*.ts'],
  ignore: ['src/**/*.test.ts', 'tests/**/*'],
  ignoreDependencies: [
    'pino-pretty', // Runtime logger transport
    '@types/*', // Type definitions
    '@eslint/js', // ESLint config import
    'stremio-addon-sdk', // Used for types only
  ],
  // Ignore exports in barrel files (public API surface)
  ignoreExportsUsedInFile: true,
};

export default config;
