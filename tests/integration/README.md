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

| File                            | Service      | Description                                           |
| ------------------------------- | ------------ | ----------------------------------------------------- |
| `cinemeta.integration.test.ts`  | Cinemeta     | Tests movie/series lookups via Stremio's metadata API |
| `providers.integration.test.ts` | AI Providers | Tests Gemini, Perplexity, OpenAI recommendation APIs  |

## AI Provider Tests

### Required Environment Variables

Set these in `.env.development` (gitignored):

| Variable             | Provider   | Description        |
| -------------------- | ---------- | ------------------ |
| `GEMINI_API_KEY`     | Gemini     | Google AI API key  |
| `PERPLEXITY_API_KEY` | Perplexity | Perplexity API key |
| `OPENAI_API_KEY`     | OpenAI     | OpenAI API key     |

Tests for each provider are **automatically skipped** if the corresponding API key is not set.

### Tests Per Provider

Each provider is tested for:

1. **API Key Validation**
   - Valid key returns `{ valid: true }`
   - Invalid key returns `{ valid: false, error: '...' }`

2. **Recommendation Generation**
   - Movie recommendations (5 items)
   - Series recommendations (5 items)
   - Discovery variant with higher temperature

3. **Metadata Verification**
   - Correct provider name in response
   - Correct model name in response
   - Valid timestamp

### Cross-Provider Tests

- Consistent response structure across all available providers
- Recommendation diversity (unique titles, varied decades)

### Timeouts

| Operation          | Timeout |
| ------------------ | ------- |
| API key validation | 30s     |
| Recommendation gen | 60s     |
| Cross-provider     | 120s    |

## Updating Mock Fixtures

When the external API changes or you need to add new test cases:

1. Run tests in record mode:

   ```bash
   RECORD_RESPONSES=true npm run test:integration
   ```

2. Copy the logged JSON responses to the appropriate fixtures file:
   - Cinemeta: `tests/__fixtures__/recorded/cinemeta-responses.ts`
   - AI Providers: `tests/__fixtures__/recorded/provider-responses.ts`

3. Run regular tests to verify mocks work:
   ```bash
   npm test
   ```

## Shared Utilities

Common helpers are in `__helpers__/integration-utils.ts`:

- `SKIP_INTEGRATION` - Skip condition based on `RUN_API_TESTS`
- `RECORD_MODE` - Record mode based on `RECORD_RESPONSES`
- `TIMEOUTS` - Standard timeouts for different operations
- `recordResponse()` - Log responses for fixture capture
- `printRecordModeBanner()` - Print banner when recording
- `buildTestPrompt()` - Build prompts for AI providers
- `expectValidAIResponse()` - Assert valid response structure
- `expectValidRecommendation()` - Assert valid recommendation fields
- `withRetry()` - Retry wrapper for flaky network conditions

## Environment Variables

| Variable             | Default | Description                                     |
| -------------------- | ------- | ----------------------------------------------- |
| `RUN_API_TESTS`      | `false` | Set to `true` to run integration tests          |
| `RECORD_RESPONSES`   | `false` | Set to `true` to log API responses for fixtures |
| `GEMINI_API_KEY`     | -       | Required for Gemini provider tests              |
| `PERPLEXITY_API_KEY` | -       | Required for Perplexity provider tests          |
| `OPENAI_API_KEY`     | -       | Required for OpenAI provider tests              |

## Notes

- These tests require network access
- They may be slower than unit tests (up to 120s for some tests)
- Rate limiting may cause occasional failures (tests include retry logic)
- Use `.env.development` for API keys (gitignored)
- Each provider can be tested independently based on available keys
