import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    
    // Setup files for custom matchers
    setupFiles: ['./tests/__helpers__/assertions.ts'],
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/types/**',
        'tests/**',
      ],
    },
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 15000,
  },
});
