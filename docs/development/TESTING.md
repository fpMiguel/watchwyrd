# Testing Guide

## Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## Test Structure

```
tests/
├── __fixtures__/       # Reusable test data
│   ├── catalogs.ts     # Sample catalog responses
│   ├── configs.ts      # Test config objects
│   ├── recommendations.ts  # Sample recommendation data
│   └── recorded/       # Recorded API responses for mocks
├── __mocks__/          # Mock implementations
│   ├── google-genai.ts # Gemini SDK mock
│   ├── openai.ts       # OpenAI SDK mock
│   └── perplexity.ts   # Perplexity SDK mock
├── __helpers__/        # Test utilities
│   ├── env.ts          # Test environment setup
│   ├── testApp.ts      # Express app factory for integration
│   ├── assertions.ts   # Shared assertion helpers
│   └── index.ts        # Aggregate exports
├── providers/          # Per-provider unit tests
│   ├── gemini.test.ts
│   ├── openai.test.ts
│   └── perplexity.test.ts
├── integration/        # Integration tests (require API keys)
│   ├── cinemeta.integration.test.ts
│   └── providers.integration.test.ts
├── error-parser.test.ts
├── provider-utils.test.ts
├── providers.test.ts
├── e2e.test.ts
└── ...other *.test.ts
```

## Writing Tests

Follow the **Arrange-Act-Assert** pattern:

```typescript
it('returns movie catalog with correct structure', async () => {
  // Arrange
  const config = createTestConfig({ includeMovies: true });
  
  // Act
  const catalog = await generator.generate('movies-fornow', config);
  
  // Assert
  expect(catalog.metas).toHaveLength(20);
  expect(catalog.metas[0]).toHaveProperty('type', 'movie');
});
```

## Coverage Goals

| Module | Target |
|--------|--------|
| utils/ | 85% |
| prompts/ | 85% |
| providers/ | 80% |
| catalog/ | 75% |

## E2E Tests

E2E tests require API keys. Enable with:

```bash
RUN_API_TESTS=true npm test
```
