# Integration Tests

This folder contains tests that make **real API calls** to external services.

## Running Integration Tests

Integration tests are **skipped by default** to keep the test suite fast and reliable.

### Run all integration tests:

```bash
npm run test:integration
```

### Run with response recording (to update fixtures):

```bash
RECORD_RESPONSES=true npm run test:integration
```

## Available Integration Tests

| File                           | Service  | Description                                           |
| ------------------------------ | -------- | ----------------------------------------------------- |
| `cinemeta.integration.test.ts` | Cinemeta | Tests movie/series lookups via Stremio's metadata API |

## Updating Mock Fixtures

When the external API changes or you need to add new test cases:

1. Run tests in record mode:

   ```bash
   RECORD_RESPONSES=true npm run test:integration
   ```

2. Copy the logged JSON responses to the appropriate fixtures file:
   - Cinemeta: `tests/__fixtures__/recorded/cinemeta-responses.ts`

3. Run regular tests to verify mocks work:
   ```bash
   npm test
   ```

## Environment Variables

| Variable           | Default | Description                                     |
| ------------------ | ------- | ----------------------------------------------- |
| `RUN_API_TESTS`    | `false` | Set to `true` to run integration tests          |
| `RECORD_RESPONSES` | `false` | Set to `true` to log API responses for fixtures |

## Notes

- These tests require network access
- They may be slower than unit tests (each has 15s timeout)
- Rate limiting may cause occasional failures
- Use `.env.development` for API keys (gitignored)
