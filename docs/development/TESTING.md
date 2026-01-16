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
├── __fixtures__/     # Reusable test data
├── __mocks__/        # Mock implementations
├── __helpers__/      # Test utilities
└── *.test.ts         # Test files
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
