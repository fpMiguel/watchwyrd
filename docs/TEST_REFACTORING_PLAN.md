# Test Suite Refactoring Plan

## Current State Analysis

### Coverage Summary (v8)
| Module | Statements | Branch | Functions | Lines | Priority |
|--------|-----------|--------|-----------|-------|----------|
| **providers/** | 7.17% | 3.4% | 3.12% | 7.23% | 🔴 Critical |
| **catalog/** | 38.37% | 26.76% | 24.13% | 40.24% | 🔴 Critical |
| **prompts/** | 45.16% | 30% | 55.55% | 45.16% | 🟡 High |
| **handlers/configure/** | 46.94% | 22.85% | 60.97% | 49.26% | 🟡 High |
| **services/** | 38.91% | 26.79% | 40.62% | 42.15% | 🟡 High |
| **utils/** | 58.99% | 44.34% | 49.27% | 60.6% | 🟢 Medium |
| **cache/** | 95.55% | 72.72% | 100% | 95.55% | ✅ Good |
| **config/** | 74.54% | 43.75% | 100% | 74.07% | ✅ Good |

### Current Test Files
```
tests/
├── cache.test.ts       ✅ Good coverage
├── cinemeta.test.ts    ✅ Good (real network calls)
├── config.test.ts      ✅ Good coverage
├── crypto.test.ts      ✅ Good coverage  
├── e2e.test.ts         🟡 Heavy, needs API keys
├── rateLimiter.test.ts ✅ Good coverage
└── signals.test.ts     ✅ Good coverage
```

### Key Issues

1. **No Unit Tests for AI Providers** (7% coverage)
   - `gemini.ts` and `perplexity.ts` have no mocked unit tests
   - Only tested via E2E with real API calls

2. **Catalog Generation Untested** (38% coverage)
   - `catalogGenerator.ts` - core business logic
   - `searchGenerator.ts` - search functionality
   - `definitions.ts` - catalog definitions

3. **Prompt Building Not Tested** (45% coverage)
   - `catalog.ts` - prompt generation
   - `context.ts` - context building
   - `search.ts` - search prompts

4. **Configure Handler Partially Tested** (47% coverage)
   - Missing tests for validation endpoints
   - Missing tests for location search
   - Missing tests for model listing

5. **No Mocking Infrastructure**
   - No shared fixtures
   - No mock providers
   - Tests depend on network/APIs

---

## Proposed Test Structure

```
tests/
├── __fixtures__/           # Shared test data
│   ├── configs.ts          # User config fixtures
│   ├── catalogs.ts         # Catalog response fixtures
│   └── recommendations.ts  # AI recommendation fixtures
│
├── __mocks__/              # Mock implementations
│   ├── providers.ts        # Mock AI providers
│   ├── cinemeta.ts         # Mock Cinemeta service
│   └── weather.ts          # Mock weather service
│
├── __helpers__/            # Test utilities
│   ├── setup.ts            # Global test setup
│   ├── testApp.ts          # Express app factory
│   └── assertions.ts       # Custom matchers
│
├── unit/                   # Unit tests (fast, isolated)
│   ├── providers/
│   │   ├── gemini.test.ts
│   │   ├── perplexity.test.ts
│   │   └── factory.test.ts
│   ├── catalog/
│   │   ├── catalogGenerator.test.ts
│   │   ├── searchGenerator.test.ts
│   │   └── definitions.test.ts
│   ├── prompts/
│   │   ├── catalog.test.ts
│   │   ├── context.test.ts
│   │   └── search.test.ts
│   ├── services/
│   │   ├── cinemeta.test.ts
│   │   ├── weather.test.ts
│   │   └── rpdb.test.ts
│   └── utils/
│       ├── crypto.test.ts
│       ├── cache.test.ts
│       └── rateLimiter.test.ts
│
├── integration/            # Integration tests (slower, some network)
│   ├── configure.test.ts
│   ├── stremio.test.ts
│   └── catalog.test.ts
│
└── e2e/                    # End-to-end tests (requires API keys)
    └── full-flow.test.ts
```

---

## Priority Implementation

### Phase 1: Test Infrastructure (Immediate)

#### 1.1 Create Fixtures Module
```typescript
// tests/__fixtures__/configs.ts
export const VALID_GEMINI_CONFIG = {
  aiProvider: 'gemini' as const,
  geminiApiKey: 'test-api-key-xxxx',
  geminiModel: 'gemini-2.5-flash',
  timezone: 'America/New_York',
  country: 'US',
  includeMovies: true,
  includeSeries: true,
  catalogSize: 20,
};

export const VALID_PERPLEXITY_CONFIG = { ... };
export const FAMILY_CONFIG = { ... };
export const MINIMAL_CONFIG = { ... };
```

#### 1.2 Create Mock Providers
```typescript
// tests/__mocks__/providers.ts
export class MockGeminiProvider implements AIProvider {
  private responses: Map<string, AIRecommendation[]>;
  
  setResponse(key: string, recommendations: AIRecommendation[]) { ... }
  async generateRecommendations(prompt: string): Promise<AIRecommendation[]> { ... }
}
```

#### 1.3 Create Test App Factory
```typescript
// tests/__helpers__/testApp.ts
export async function createTestApp(options?: {
  mockProviders?: boolean;
  mockCinemeta?: boolean;
}) {
  const app = express();
  // Configure with mocks or real services
  return app;
}
```

### Phase 2: Provider Unit Tests (Critical)

#### 2.1 Gemini Provider Tests
```typescript
describe('GeminiProvider', () => {
  describe('initialization', () => {
    it('should initialize with valid config');
    it('should throw on missing API key');
    it('should use correct model');
  });
  
  describe('generateRecommendations', () => {
    it('should parse structured JSON response');
    it('should handle empty response');
    it('should retry on rate limit (429)');
    it('should respect timeout');
    it('should validate recommendations schema');
  });
  
  describe('listModels', () => {
    it('should return available models');
    it('should filter out unsupported models');
    it('should mark free tier models');
  });
  
  describe('error handling', () => {
    it('should handle network errors');
    it('should handle invalid API key');
    it('should handle quota exceeded');
  });
});
```

#### 2.2 Perplexity Provider Tests
```typescript
describe('PerplexityProvider', () => {
  describe('initialization', () => ... });
  describe('generateRecommendations', () => ... });
  describe('error handling', () => ... });
});
```

#### 2.3 Provider Factory Tests
```typescript
describe('createProvider', () => {
  it('should create Gemini provider');
  it('should create Perplexity provider');
  it('should throw for unknown provider');
  it('should cache provider instances');
});
```

### Phase 3: Catalog Generator Tests (Critical)

```typescript
describe('CatalogGenerator', () => {
  describe('generateCatalog', () => {
    it('should generate movie catalog');
    it('should generate series catalog');
    it('should respect catalog size');
    it('should exclude genres');
    it('should include context when enabled');
    it('should use cache when available');
    it('should resolve metadata from Cinemeta');
    it('should apply RPDB artwork when enabled');
  });
  
  describe('error handling', () => {
    it('should return error catalog on AI failure');
    it('should handle Cinemeta failures gracefully');
    it('should respect request timeout');
  });
  
  describe('caching', () => {
    it('should cache successful catalogs');
    it('should not cache error catalogs');
    it('should use variant-specific TTL');
  });
});
```

### Phase 4: Prompt Builder Tests (High)

```typescript
describe('buildCatalogPrompt', () => {
  it('should include content type');
  it('should include count');
  it('should include excluded genres');
  it('should include context when provided');
  it('should not include explanations when disabled');
  it('should optimize prompt length');
});

describe('buildContextPrompt', () => {
  it('should include time context');
  it('should include weather when available');
  it('should include day of week');
  it('should format date correctly');
});
```

### Phase 5: Configure Handler Tests (Medium)

```typescript
describe('Configure Routes', () => {
  describe('GET /configure', () => {
    it('should serve wizard page');
    it('should include all steps');
    it('should include CSRF token');
  });
  
  describe('POST /configure/validate-key', () => {
    it('should reject empty key');
    it('should validate Gemini key format');
    it('should return models on success');
    it('should rate limit requests');
  });
  
  describe('GET /configure/search-locations', () => {
    it('should search by city name');
    it('should return coordinates');
    it('should sanitize query');
    it('should limit results');
  });
  
  describe('POST /configure', () => {
    it('should validate required fields');
    it('should encrypt configuration');
    it('should return manifest URL');
  });
});
```

---

## Modern Best Practices to Apply

### 1. Test Naming Convention
```typescript
// ❌ Old style
it('should work');

// ✅ New style: describe behavior
it('returns empty array when no movies match criteria');
it('throws ValidationError when API key is missing');
```

### 2. Arrange-Act-Assert Pattern
```typescript
it('generates catalog with weather context', async () => {
  // Arrange
  const config = createTestConfig({ enableWeatherContext: true });
  const mockWeather = { condition: 'rainy', temp: 15 };
  weatherService.mockResolvedValue(mockWeather);
  
  // Act
  const catalog = await generator.generate(config);
  
  // Assert
  expect(catalog.metas).toHaveLength(20);
  expect(promptBuilder.lastPrompt).toContain('rainy');
});
```

### 3. Test Isolation
```typescript
// Use factory functions for fresh instances
function createGenerator(overrides?: Partial<GeneratorOptions>) {
  return new CatalogGenerator({
    provider: new MockProvider(),
    cinemeta: new MockCinemeta(),
    cache: new MemoryCache(),
    ...overrides,
  });
}
```

### 4. Parameterized Tests
```typescript
describe.each([
  ['gemini', 'gemini-2.5-flash'],
  ['gemini', 'gemini-2.0-flash'],
  ['perplexity', 'sonar'],
  ['perplexity', 'sonar-pro'],
])('Provider: %s with model %s', (provider, model) => {
  it('should generate valid recommendations', async () => {
    // Test runs for each provider/model combination
  });
});
```

### 5. Custom Matchers
```typescript
// tests/__helpers__/assertions.ts
expect.extend({
  toBeValidImdbId(received: string) {
    const pass = /^tt\d{7,9}$/.test(received);
    return {
      pass,
      message: () => `expected ${received} to be a valid IMDb ID`,
    };
  },
  
  toBeValidCatalog(received: unknown) {
    // Validate catalog structure
  },
});

// Usage
expect(meta.id).toBeValidImdbId();
expect(response.body).toBeValidCatalog();
```

### 6. Snapshot Testing for Prompts
```typescript
it('generates correct prompt for movie catalog', () => {
  const prompt = buildCatalogPrompt({
    contentType: 'movie',
    count: 20,
    excludedGenres: ['Horror'],
  });
  
  expect(prompt).toMatchSnapshot();
});
```

### 7. Test Timeouts
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 5000,      // Default for unit tests
    hookTimeout: 10000,     // Setup/teardown
    
    // Override for specific files
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

### 8. Concurrent Test Execution
```typescript
// Use test.concurrent for independent tests
describe('Provider initialization', () => {
  test.concurrent('Gemini with valid key', async () => { ... });
  test.concurrent('Perplexity with valid key', async () => { ... });
  test.concurrent('Unknown provider throws', async () => { ... });
});
```

---

## Migration Strategy

### Step 1: Create Infrastructure (No breaking changes)
- Add `__fixtures__/`, `__mocks__/`, `__helpers__/`
- Create shared utilities
- Keep existing tests working

### Step 2: Add New Unit Tests
- Start with highest-priority modules (providers, catalog)
- Use mocks to isolate from network
- Run in parallel with existing tests

### Step 3: Refactor E2E Tests
- Move API-dependent tests to `e2e/`
- Create `integration/` for semi-isolated tests
- Reduce E2E test scope

### Step 4: Update CI
- Run unit tests on every push
- Run integration tests on PRs
- Run E2E tests nightly or on release

---

## Expected Coverage After Refactoring

| Module | Current | Target |
|--------|---------|--------|
| providers/ | 7% | 80%+ |
| catalog/ | 38% | 75%+ |
| prompts/ | 45% | 85%+ |
| handlers/ | 47% | 70%+ |
| services/ | 39% | 70%+ |
| utils/ | 59% | 85%+ |
| **Overall** | 46% | **75%+** |

---

## Implementation Checklist

- [x] Create `tests/__fixtures__/configs.ts`
- [x] Create `tests/__fixtures__/recommendations.ts`
- [x] Create `tests/__mocks__/providers.ts`
- [x] Create `tests/__mocks__/cinemeta.ts`
- [x] Create `tests/__helpers__/testApp.ts`
- [x] Create `tests/__helpers__/assertions.ts`
- [x] Add unit tests for provider factory
- [ ] Add unit tests for GeminiProvider
- [ ] Add unit tests for PerplexityProvider
- [ ] Add unit tests for CatalogGenerator
- [x] Add unit tests for prompt builders
- [x] Add unit tests for search prompts
- [x] Add unit tests for RPDB service
- [x] Add unit tests for circuit breaker
- [x] Add schema validation tests
- [ ] Add integration tests for configure routes
- [ ] Refactor E2E tests
- [x] Update vitest.config.ts
- [ ] Update CI workflow

---

## Current Coverage (After Refactoring)

| Module | Before | After | Notes |
|--------|--------|-------|-------|
| prompts/ | 45% | 90% | ✅ Excellent |
| services/rpdb | 12% | 100% | ✅ Complete |
| services/search | 0% | 100% | ✅ Complete |
| utils/circuitBreaker | 63% | 93% | ✅ Excellent |
| providers/factory | - | 100% | ✅ Complete |
| schemas/ | - | 94% | ✅ Excellent |
| **Overall** | 46% | **52%** | +6% improvement |

### Test Summary

- **Total Tests**: 220 passing, 8 skipped
- **Test Files**: 13 suites
- **Key New Tests**:
  - `providers.test.ts` - Provider factory tests
  - `prompts.test.ts` - Catalog prompt tests  
  - `search-prompts.test.ts` - Search prompt tests
  - `schemas.test.ts` - Schema validation tests
  - `rpdb.test.ts` - RPDB service tests
  - `circuit-breaker.test.ts` - Circuit breaker tests

---

*Document updated: January 2026*
