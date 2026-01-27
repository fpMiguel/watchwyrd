# AGENTS.md

> Context file for AI coding assistants (Copilot, Codex, Claude, Cursor, OpenCode, etc.)

## Project Overview

**Watchwyrd** is a Stremio addon providing AI-powered movie/TV recommendations. It uses a BYOK (Bring Your Own Key) model—users provide their own AI API keys. The server is fully stateless.

- **Supported AI Providers:** Google Gemini, Perplexity AI, OpenAI
- **Current Version:** 0.0.37
- **Runtime:** Node.js 20+ with Express
- **Language:** TypeScript (strict mode, no `any`)

### How It Works

1. User configures addon via `/configure` wizard (enters API key, preferences)
2. Config is encrypted with AES-256-GCM and embedded in addon URL
3. Stremio calls addon endpoints with encrypted config
4. Server decrypts config, calls AI provider, returns movie/TV recommendations
5. Recommendations are validated via Cinemeta and cached

## Development Environment

### Prerequisites

- Node.js 20+
- npm 9+

### Setup

```bash
git clone https://github.com/fpMiguel/watchwyrd.git
cd watchwyrd
npm install
cp .env.example .env  # Add API key for E2E tests (optional)
npm run dev           # http://localhost:7000/configure
```

## Commands

| Command             | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                                |
| `npm run check`     | **Run before commits** (typecheck + lint + format + test) |
| `npm run check:all` | Full check including unused code analysis                 |
| `npm test`          | Tests only                                                |
| `npm run build`     | Production build                                          |
| `npm run lint:fix`  | Auto-fix lint issues                                      |
| `npm run format`    | Auto-format code                                          |
| `npm run knip`      | Find unused exports/dependencies                          |

## Project Structure

```
src/
├── addon/         # Stremio manifest definition
├── cache/         # LRU cache implementation
├── catalog/       # Catalog generation logic
├── config/        # Configuration schemas (Zod)
├── handlers/      # HTTP route handlers
│   └── configure/ # Configuration wizard UI
├── middleware/    # Express middleware (rate limiters)
├── prompts/       # AI prompt builders
├── providers/     # AI provider implementations (gemini, perplexity, openai)
├── schemas/       # Zod schemas for AI responses
├── services/      # External services (cinemeta, weather, rpdb, search)
├── signals/       # Request context (AbortSignal management)
├── types/         # TypeScript type definitions
└── utils/         # Shared utilities (crypto, http, logger, circuitBreaker)
```

## Code Conventions

### TypeScript

- No `any` types - use `unknown` and type guards
- Explicit return types for public functions
- Use `import type` for type-only imports
- Prefer interfaces over types for object shapes

### Naming

- Files: `kebab-case.ts`
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Error Handling

- Use typed errors where possible
- Log errors with context using the `logger` utility
- Never expose internal errors to users
- Return graceful fallbacks (e.g., error catalogs)

### Testing

- Follow Arrange-Act-Assert pattern
- Use fixtures from `tests/__fixtures__/`
- Use mocks from `tests/__mocks__/`
- Test file naming: `*.test.ts`
- Integration tests: `tests/integration/*.integration.test.ts`

## Important Patterns

### Provider Abstraction

All AI providers implement `IAIProvider` interface. Use the factory:

```typescript
import { createProvider } from './providers/factory.js';
const provider = createProvider(config);
```

### Configuration Encryption

User configs are encrypted with AES-256-GCM:

```typescript
import { encryptConfig, decryptConfig } from './utils/crypto.js';
```

### Circuit Breaker

External services use circuit breakers for resilience:

```typescript
import { withCircuitBreaker } from './utils/circuitBreaker.js';
```

### Caching

Use the cache interface for all cacheable operations:

```typescript
import { cache } from './cache/index.js';
await cache.get(key);
await cache.set(key, value, ttlSeconds);
```

### Request Context & Signals

Use the signals module for request-scoped abort handling:

```typescript
import { createSignalContext } from './signals/context.js';
const ctx = createSignalContext(req);
```

### Client Pool

HTTP connections are pooled per origin for performance:

```typescript
import { ClientPool } from './utils/clientPool.js';
```

## Architecture Decisions

Key decisions are documented in `docs/adr/`. Most important:

| ADR     | Title                 | Description                            |
| ------- | --------------------- | -------------------------------------- |
| ADR-001 | Provider Abstraction  | Multiple AI providers via interface    |
| ADR-002 | Encrypted Config URLs | AES-256-GCM for user configs           |
| ADR-006 | Circuit Breaker       | Resilience for external services       |
| ADR-007 | Context-Aware Recs    | Weather, time, mood in recommendations |
| ADR-008 | BYOK Architecture     | Users bring their own API keys         |

## Do

- Run `npm run check` before marking changes complete
- Follow existing patterns in the codebase
- Add tests for new functionality
- Use the `logger` utility for all logging
- Keep functions small and focused
- Use `import type` for type-only imports
- Use circuit breakers for external service calls
- Add graceful degradation for failures

## Don't

- Add `any` types—use `unknown` with type guards
- Log sensitive data (API keys, coordinates, search queries)
- Store user data server-side (stateless design)
- Modify `docs/security/` directly (private, gitignored)
- Add dependencies without justification
- Commit secrets or `.env` files
- Expose stack traces in production responses

## Git Conventions

### Branch Names

```
feature/add-new-provider
fix/cache-invalidation
docs/update-readme
```

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add OpenRouter provider support
fix: handle empty API response gracefully
docs: update installation instructions
test: add catalog generation edge cases
refactor: extract prompt building to separate module
```

### Pull Requests

- Reference related issue in description
- Ensure `npm run check` passes
- Keep PRs focused on a single concern
- Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`)

## Common Tasks

### Adding a new AI provider

1. Create `src/providers/{name}.ts` implementing `IAIProvider`
2. Add to factory in `src/providers/factory.ts`
3. Add config schema in `src/config/schema.ts`
4. Add to configure wizard in `src/handlers/configure/`
5. Create ADR in `docs/adr/`
6. Add tests in `tests/`

### Adding a new service

1. Create `src/services/{name}.ts`
2. Add circuit breaker wrapper if external
3. Add caching if appropriate
4. Add tests in `tests/`

### Modifying prompts

1. Edit files in `src/prompts/`
2. Run E2E tests with `RUN_API_TESTS=true npm test`
3. Verify AI responses are valid JSON

### Adding middleware

1. Create in `src/middleware/`
2. Apply in `src/index.ts` or specific route handlers

## Environment Variables

| Variable          | Required   | Description                 |
| ----------------- | ---------- | --------------------------- |
| `SECRET_KEY`      | Production | Encryption key (32+ chars)  |
| `BASE_URL`        | Production | Public URL                  |
| `ENCRYPTION_SALT` | Production | Salt for key derivation     |
| `PORT`            | No         | Server port (default: 7000) |
| `LOG_LEVEL`       | No         | debug/info/warn/error       |
| `NODE_ENV`        | No         | development/production      |

## Sensitive Files (gitignored)

- `.env` — Environment variables
- `docs/security/` — Security audit documentation (private)

## Security Notes

- Never commit API keys or secrets
- User configs are encrypted with AES-256-GCM
- API keys only exist in encrypted addon URLs
- All external APIs use HTTPS
- Rate limiting protects against abuse
- See `SECURITY.md` for vulnerability reporting
- See ADR-008 for BYOK architecture details

## Key Files Reference

| File                              | Purpose                         |
| --------------------------------- | ------------------------------- |
| `src/index.ts`                    | Express server entry point      |
| `src/providers/factory.ts`        | AI provider factory             |
| `src/catalog/catalogGenerator.ts` | Main catalog generation         |
| `src/catalog/searchGenerator.ts`  | Search-based catalog generation |
| `src/handlers/stremio.ts`         | Stremio addon endpoints         |
| `src/handlers/configure/index.ts` | Configuration wizard            |
| `src/utils/crypto.ts`             | Encryption/decryption           |
| `src/config/schema.ts`            | Zod config schemas              |
| `src/prompts/catalog.ts`          | AI prompt construction          |

---

## Code Review Guidelines

> For AI code reviewers (GitHub Copilot, etc.)

### Critical Checks

1. **No `any` types** - Must use `unknown` with type guards
2. **No sensitive data in logs** - API keys, coordinates, user queries must never be logged
3. **Error handling** - All async operations must have proper error handling
4. **Input validation** - All external input must be validated with Zod schemas
5. **Security headers** - HTTP responses should include appropriate security headers

### Common Issues to Flag

| Issue                                   | Why It Matters                      |
| --------------------------------------- | ----------------------------------- |
| Missing `import type`                   | Increases bundle size unnecessarily |
| `console.log` usage                     | Should use `logger` utility instead |
| Hardcoded secrets                       | Security vulnerability              |
| Missing error catalog fallback          | Poor user experience on failures    |
| Unbounded arrays/maps                   | Memory exhaustion risk              |
| Missing timeouts on fetch               | Can hang indefinitely               |
| `as` type assertions without validation | Runtime type errors                 |

### Patterns to Encourage

```typescript
// Good: Type guard with unknown
function isError(err: unknown): err is Error {
  return err instanceof Error;
}

// Good: Validated external input
const config = AddonConfigSchema.parse(decryptedData);

// Good: Graceful degradation
try {
  return await generateCatalog(config);
} catch {
  return errorCatalog('Failed to generate recommendations');
}

// Good: Proper logging
logger.error('Operation failed', { catalogKey, error: err.message });
```

### Performance Considerations

- Use connection pooling for HTTP requests (`ClientPool`)
- Cache expensive operations (AI responses, metadata lookups)
- Use circuit breakers for external services
- Avoid synchronous operations in request handlers
- In-flight request deduplication prevents duplicate AI calls

### Test Coverage Expectations

- New features: Unit tests required
- Bug fixes: Regression test required
- External services: Mock in tests, integration tests optional
- AI providers: Mock responses, E2E tests with `RUN_API_TESTS=true`

---

## Architectural Context for AI Assistants

### Request Flow

```
Stremio App
    ↓
Express Router (src/handlers/stremio.ts)
    ↓
Decrypt Config (src/utils/crypto.ts)
    ↓
Rate Limiting (src/middleware/rateLimiters.ts)
    ↓
Catalog Generator (src/catalog/catalogGenerator.ts)
    ↓
AI Provider (src/providers/*.ts)
    ↓
Response Validation (src/schemas/*.ts)
    ↓
Cinemeta Enrichment (src/services/cinemeta.ts)
    ↓
Cache & Return
```

### Key Abstractions

| Abstraction     | Interface              | Implementations                                          |
| --------------- | ---------------------- | -------------------------------------------------------- |
| AI Provider     | `IAIProvider`          | `GeminiProvider`, `PerplexityProvider`, `OpenAIProvider` |
| Cache           | `ICache`               | `MemoryCache` (LRU)                                      |
| Circuit Breaker | `withCircuitBreaker()` | Wraps any async function                                 |

### State Management

- **Server is stateless** - No database, no sessions
- **Config in URL** - Encrypted user preferences travel with each request
- **Cache is ephemeral** - LRU memory cache, lost on restart
- **Rate limits are per-IP** - No persistent storage

### Error Handling Strategy

1. **Validation errors** → Return 400 with safe message
2. **AI provider errors** → Return error catalog with user-friendly message
3. **External service failures** → Circuit breaker opens, fallback response
4. **Unexpected errors** → Log with context, return generic error catalog

### Security Model (BYOK)

- Users provide their own AI API keys
- Keys are encrypted client-side before storage
- Server only decrypts keys in memory during request
- No key persistence - keys exist only in encrypted URL
- Compromise of server reveals no user keys (stateless)

---

## Debugging Tips

### Common Error Scenarios

| Symptom            | Likely Cause             | Check                           |
| ------------------ | ------------------------ | ------------------------------- |
| Empty catalog      | AI returned invalid JSON | Check AI response in debug logs |
| "Invalid config"   | Decryption failed        | Verify SECRET_KEY matches       |
| Rate limit errors  | Missing trust proxy      | Check `app.set('trust proxy')`  |
| Timeout errors     | AI provider slow         | Check circuit breaker state     |
| "No valid API key" | Config missing key       | Verify encryption/decryption    |

### Useful Debug Commands

```bash
# Run with debug logging
LOG_LEVEL=debug npm run dev

# Run specific test file
npm test -- tests/crypto.test.ts

# Run E2E tests with real API
RUN_API_TESTS=true npm test -- tests/e2e.test.ts

# Check for unused exports
npm run knip
```

### Log Levels

| Level   | Use For                               |
| ------- | ------------------------------------- |
| `error` | Failures requiring attention          |
| `warn`  | Degraded operation, fallbacks used    |
| `info`  | Request lifecycle, key events         |
| `debug` | Detailed debugging (disabled in prod) |
