# Technical Showcase Track

## Purpose

Define the quality bar and architectural story that make this project a technical showcase.

## Quality Gates (Required)

- **Typecheck**: `npm run typecheck`
- **Lint**: `npm run lint`
- **Format**: `npm run format:check`
- **Tests**: `npm test`
- **Security**: `npm run audit` (`npm audit --audit-level=high`, same gate CI runs)
- **Build**: `npm run build`
- **Unused code** (advisory): `npm run knip`

## Test Coverage Targets (from Testing Guide)

- **utils/** and **prompts/**: 85%
- **providers/**: 80%
- **catalog/**: 75%

## SLOs & Reliability Targets (To Define)

- **Latency**: p95 for key endpoints (catalog, search, configure)
- **Availability**: error rate ceiling per endpoint
- **Cache**: hit ratio target for catalog requests
- **Provider reliability**: error rates per provider + circuit breaker open rates
- **Health checks**: dependency status (Cinemeta, AI provider) + cache health

## Observability

- Correlation IDs across handlers/services/providers (implemented)
- Metrics for latency, cache hit/miss, provider errors, breaker state (implemented)
- Structured logging with redaction (no secrets)

## Operational Endpoints

- `/health` basic uptime + version
- `/health/live` liveness
- `/health/ready` readiness (503 when degraded)
- `/health/detailed` metrics snapshot
- `/metrics` metrics snapshot

## Architecture Documentation (Diagrams)

- **Request flow**: Stremio → handler → decrypt → rate limit → generator → provider → schemas → services → cache
- **Caching flow**: cache lookup → in-flight dedupe → fetch → enrich → store → return
- **Circuit breaker flow**: closed → open → half-open retry → recovery
- **Configuration flow**: configure wizard → encrypt → URL → decrypt → validate schema

## Deliverables Checklist

- [ ] Quality gates enforced in CI
- [ ] SLO doc with measurable targets
- [ ] Architecture diagrams published
- [ ] Runbooks for on-call/debugging
