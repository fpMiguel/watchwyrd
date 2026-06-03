# Roadmap

## Next

| Priority | Feature | Why |
|----------|---------|-----|
| 1 | **OpenRouter Support** | New provider. Unlocks 300+ models with a single API key. Lets users pick cheaper/faster/better models than the current three providers. |
| 2 | **Integration Tests** | Mock-based handler tests covering the full request→response chain. No API keys required — provider layer is mocked. |
| 3 | **OpenAPI Documentation** | Document the REST endpoints (`/manifest`, `/catalog`, `/configure`, health endpoints). Makes the addon easier to integrate with and debug. |
| 4 | **Test Coverage → 80%** | Unit tests for utils, prompts, and catalog modules. Provider tests exist; expand to the rest of the core modules. |

---

## Future

- TMDB integration — richer metadata (cast, genres) passed into AI prompts
- Multi-language — localized prompts and configure UI
- Mood-based catalogs — "something dark and rainy"
- Multi-stage Docker build — smaller production images
- Import/export config — save/restore encrypted config URL

---

## Technical Debt

- [ ] Get test coverage to 80% across utils, prompts, providers, catalog
- [ ] Add integration tests covering the full request→response chain
- [ ] Architecture diagrams (request flow, caching, circuit breaker)
- [ ] "How to add a provider" contributor guide
