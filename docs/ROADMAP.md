# Roadmap

## Next

| Priority | Feature | Why |
|----------|---------|-----|
| 1 | **OpenRouter Support** | New provider. Unlocks 300+ models with a single API key. Lets users pick cheaper/faster/better models than the current three providers. |
| 2 | **Integration Tests** | Mock-based handler tests covering the full request→response chain. No API keys required — provider layer is mocked. |
| 3 | **OpenAPI Documentation** | Document the REST endpoints (`/manifest`, `/catalog`, `/configure`, health endpoints). Makes the addon easier to integrate with and debug. |
| 4 | **Test Coverage → 85%** | Currently at 80% — focus on `rateLimiter`, `crypto`, `signals/context`, `configure/index`, and remaining `index.ts` branches. |

---

## Done

- **Test Coverage → 80%** — Reached 80.04% (1288/1609 statements). Added tests for utils, retry logic, crypto, rate limiter, cleanup, circuit breaker, stremio handler, and server startup/unhandled rejections.

---

## Future

- TMDB integration — richer metadata (cast, genres) passed into AI prompts
- Multi-language — localized prompts and configure UI
- Mood-based catalogs — "something dark and rainy"
- Multi-stage Docker build — smaller production images
- Import/export config — save/restore encrypted config URL

---

## Technical Debt

- [x] Get test coverage to 80% across utils, prompts, providers, catalog
- [ ] Add integration tests covering the full request→response chain
- [ ] Architecture diagrams (request flow, caching, circuit breaker)
- [ ] "How to add a provider" contributor guide
