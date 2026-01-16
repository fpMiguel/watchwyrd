# Roadmap

## Completed ✅

- Multi-provider AI support (Gemini, Perplexity, OpenAI)
- Structured JSON output with schema validation
- Context-aware recommendations (time, weather)
- Natural language search
- Circuit breaker pattern for resilience
- AES-256-GCM encrypted config URLs

---

## In Progress 🚧

### Observability
Add metrics and structured logging for production monitoring.
- Request latency histograms
- Cache hit/miss rates
- AI provider error rates

---

## Planned 📋

### High Priority

| Feature | Description |
|---------|-------------|
| **TMDB Integration** | Higher quality posters and metadata |
| **Redis Cache** | Shared cache for horizontal scaling |
| **Health Checks** | AI provider connectivity monitoring |

### Medium Priority

| Feature | Description |
|---------|-------------|
| **Trakt Integration** | Exclude already-watched content |
| **Multi-language** | Localized prompts and UI |
| **Import/Export** | Configuration backup |

### Future Ideas

- Mood-based catalogs
- Watch history analysis
- Edge caching (Cloudflare Workers)

---

## Technical Debt

- [ ] Increase test coverage to 75%+
- [ ] Add integration tests for handlers
- [ ] Multi-stage Docker build
- [ ] OpenAPI documentation

---

*Last updated: January 2026*
