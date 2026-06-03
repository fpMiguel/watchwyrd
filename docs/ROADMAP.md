# Roadmap

## Completed ✅

| Feature                                       | Notes                                              |
| --------------------------------------------- | -------------------------------------------------- |
| Multi-provider AI support                     | Gemini, Perplexity, OpenAI                         |
| Structured JSON output                        | Zod schema validation on AI responses              |
| Context-aware recommendations                 | Time, weather, day-of-week                         |
| Natural language search                       | Free-form text queries via Discover catalog         |
| Circuit breaker pattern                       | Prevents cascading API failures               |
| AES-256-GCM encrypted config URLs             | BYOK — keys stored only in config URL              |
| Quality gates                                 | Typecheck, lint, format, tests in CI               |
| Health check endpoints                        | `/health`, `/health/live`, `/health/ready`         |
| Structured logging with pino                  | Redaction of secrets in logs                       |
| Correlation IDs                               | Across handlers/services/providers                 |
| Metrics collection                            | Latency, cache hit/miss, provider errors           |
| Provider unit tests                           | Mocks + per-provider test suites                   |
| Provider utility tests                        | Edge cases, deduplication, JSON parsing            |
| Error parser                                  | Normalizes AI errors per provider        |
| SPA static asset extraction                   | CSS/JS served as files, no inline CSP bypass       |
| ESLint 10 upgrade                             | ESLint 10 with flat config                           |
| TypeScript 6.0                                | Strict mode enabled                                |

---

## Planned 📋

### High Priority

| Feature              | Description                         |
| -------------------- | ----------------------------------- |
| **TMDB Integration** | Higher quality posters and metadata |
| **Redis Cache**      | Shared cache for horizontal scaling |
| **Health Checks**    | AI provider connectivity monitoring |
| **Integration Tests**| E2E tests for all handler endpoints |
| **OpenAPI Docs**     | Document REST endpoints             |

### Medium Priority

| Feature               | Description                     |
| --------------------- | ------------------------------- |
| **Trakt Integration** | Exclude already-watched content |
| **Multi-language**    | Localized prompts and UI        |
| **Import/Export**     | Configuration backup            |

### Future Ideas

- Mood-based catalogs
- Watch history analysis
- Edge caching (Cloudflare Workers)
- Multi-stage Docker build (smaller images)

---

## Technical Debt

- [ ] Increase provider test coverage to 80%+
- [ ] Add integration tests for handlers
- [ ] SLO documentation with measurable targets
- [ ] Architecture diagrams (request flow, caching, circuit breaker)
- [ ] OpenAPI documentation
- [ ] "How to add a provider" contributor guide

---

_Last updated: June 2026_
