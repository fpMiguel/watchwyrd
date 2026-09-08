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
- Contributor runbooks and "how to add a provider" guide
- CI: SAST/OSS scan + release automation (changelog/versioning)

### Phase 4 — Scalability & Caching (ongoing)

- Redis cache implementation (pluggable cache interface)
- Load testing harness and performance dashboards
- Edge caching strategy for manifest/common catalogs

## Completed ✅

- **Observability** — Metrics system (HTTP counters, ring buffer), health endpoints (liveness, readiness, detailed), distributed request tracing (`X-Request-ID`)
- **Test Coverage → 80%** — Reached 80.04% (1288/1609 statements). Added tests for utils, retry, crypto, rate limiter, cleanup, circuit breaker, stremio handler, server startup, and 8 new test suites
- **OpenAPI 3.1 Spec** — Documented all 14 endpoints (manifest, catalog, configure, health)

---

## Future

### High Priority

| Feature                | Description                         |
| ---------------------- | ----------------------------------- |
| **TMDB Integration**   | Higher quality posters and metadata |
| **OpenRouter Support** | 300+ models with a single API key   |
| **Redis Cache**        | Shared cache for horizontal scaling |

### Medium Priority

| Feature               | Description                     |
| --------------------- | ------------------------------- |
| **Trakt Integration** | Exclude already-watched content |
| **Multi-language**    | Localized prompts and UI        |
| **Import/Export**     | Configuration backup            |
| **Integration Tests** | Full request→response chain     |

### Future Ideas

- Mood-based catalogs
- Watch history analysis
- Edge caching (Cloudflare Workers)

---

## Technical Debt

- [x] Test coverage to 80% across utils, prompts, providers, catalog
- [x] OpenAPI documentation
- [ ] Integration tests covering the full request→response chain
- [ ] Architecture diagrams (request flow, caching, circuit breaker)
- [ ] "How to add a provider" contributor guide
- [x] Multi-stage Docker build (3-stage: build / deps / production + Trivy gate)

---

_Last updated: June 2026_
