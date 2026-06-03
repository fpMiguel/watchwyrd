# Roadmap

## Technical Showcase Track (Proposed)

### Phase 0 — Quality Bar & Architecture Story (1 week)

- Define quality gates (typecheck, lint, format, tests, security scan, coverage targets)
- Formalize SLOs (p95 latency, error rate, cache hit ratio) and health checks
- Publish architecture docs (request flow, caching, circuit breaker, provider abstraction)

### Phase 1 — Observability & Reliability (2–4 weeks)

- Metrics: request latency, cache hit/miss, provider error rate, breaker state
- Correlation IDs across handlers/services/providers
- Standardized timeouts + circuit breaker configs in one module

### Phase 2 — Test Excellence (3–6 weeks)

- Integration tests for handlers (configure, manifest, catalog)
- Error-path tests for provider failures and invalid AI JSON
- Coverage targets enforced per module (per Testing Guide)

### Phase 3 — Developer Experience & API (2–4 weeks)

- OpenAPI documentation for addon endpoints
- Contributor runbooks and “how to add a provider” guide
- CI: SAST/OSS scan + release automation (changelog/versioning)

### Phase 4 — Scalability & Caching (ongoing)

- Redis cache implementation (pluggable cache interface)
- Load testing harness and performance dashboards
- Edge caching strategy for manifest/common catalogs

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

| Feature              | Description                         |
| -------------------- | ----------------------------------- |
| **TMDB Integration** | Higher quality posters and metadata |
| **Redis Cache**      | Shared cache for horizontal scaling |
| **Health Checks**    | AI provider connectivity monitoring |

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

---

## Technical Debt

- [ ] Increase test coverage to 75%+
- [ ] Add integration tests for handlers
- [ ] Multi-stage Docker build
- [ ] OpenAPI documentation

---

_Last updated: January 2026_
