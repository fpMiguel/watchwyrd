# Watchwyrd Roadmap

Strategic roadmap based on comprehensive Six Thinking Hats team analysis.

---

## ✅ Recently Completed

### Structured Output Mode ✅
- Gemini: `responseMimeType: 'application/json'` with `responseSchema`
- Perplexity: `response_format: { type: 'json_schema' }`
- Zod schemas for validation in `src/schemas/`

### Response Schema Validation ✅
- Type-safe `Recommendation` and `AIResponse` types
- `parseAIResponse()` with detailed error paths

### Enhanced Deduplication ✅
- Title normalization and deduplication in both providers

### Natural Language Search ✅
- Search catalogs with AI-powered query understanding
- Per-content-type search with caching

---

## 🎯 Six Thinking Hats Analysis Summary

### 🎩 White Hat (Facts & Data)
**Current State:**
- 2 AI providers (Gemini, Perplexity) with structured output
- 2 catalog variants (ForNow, Random) × 2 content types = 4 catalogs
- On-demand generation with temporal caching (1-4 hour TTL)
- AES-256-GCM encrypted config URLs
- 105 passing tests, ~85% coverage on core modules
- Express 5.2 with comprehensive security headers

**Gaps Identified:**
- No TMDB integration (limited to Cinemeta)
- No metrics/observability (no Prometheus, no tracing)
- No OpenRouter support (limits model choice)
- Single instance only (no horizontal scaling)

### 🎩 Red Hat (Emotions & Intuition)
**User Pain Points:**
- Slow first-load experience (cold cache = AI call + Cinemeta lookups)
- Limited catalog variety (only 2 variants)
- No way to see "why" recommendations were made (explanations off by default)
- Configuration wizard could be overwhelming

**Developer Frustrations:**
- No hot-reload in development
- Manual testing required for AI interactions
- No staging/preview environment pattern

### 🎩 Yellow Hat (Benefits & Value)
**Current Strengths:**
- Excellent security posture (encrypted URLs, CSP, rate limiting)
- Clean architecture (SOLID, DRY, modular prompts)
- Type-safe throughout (Zod + TypeScript)
- Context-aware recommendations (time, weather, preferences)
- Efficient on-demand generation (no wasted API calls)

**Opportunities:**
- TMDB would significantly improve poster quality and metadata
- OpenRouter would unlock 100+ models with single integration
- Caching Cinemeta responses already reduces latency significantly

### 🎩 Black Hat (Risks & Cautions)
**Technical Risks:**
- Memory-only cache loses data on restart
- No circuit breaker for Cinemeta failures
- Single setInterval for cleanup could cause memory issues under load
- No request timeout for Cinemeta lookups
- Weather API failure silently degrades context

**Security Concerns:**
- Fixed PBKDF2 salt (acceptable per docs, but not ideal)
- No SECRET_KEY rotation mechanism
- Rate limiter state not persisted across restarts

**Operational Risks:**
- No health check for AI provider connectivity
- No structured logging export (only console)
- Docker image not optimized (no multi-stage build)

### 🎩 Green Hat (Creativity & New Ideas)
**Feature Ideas:**
1. **Mood-based catalogs** - "I feel like something light" → Comedy/Feel-good
2. **Watch history integration** - Trakt/Simkl sync to avoid repeats
3. **Collaborative filtering** - "Users like you also watched"
4. **Voice search** - Natural language via speech-to-text
5. **Smart preloading** - Predict next catalog based on usage patterns
6. **A/B testing** - Compare prompt effectiveness
7. **Multi-language prompts** - Localized recommendations

**Architecture Ideas:**
1. **Edge caching** - Cloudflare Workers for global cache
2. **Serverless option** - Vercel/Netlify deployment
3. **WebSocket push** - Real-time catalog updates
4. **Plugin system** - Custom context providers

### 🎩 Blue Hat (Process & Organization)
**Priority Framework:**
- P0 (Critical): Security fixes, stability
- P1 (High): User-facing features with high impact
- P2 (Medium): Developer experience, performance
- P3 (Low): Nice-to-have, experimental

**Recommended Execution Order:**
1. Observability (needed to measure everything else)
2. Circuit breaker + timeouts (stability)
3. TMDB integration (user value)
4. OpenRouter support (model flexibility)
5. Redis cache option (horizontal scaling)

---

## 🔥 P0 - Critical

### Observability & Monitoring
**Priority:** Critical | **Effort:** Medium

Add structured metrics and tracing for production visibility.

**Implementation:**
```typescript
// src/utils/metrics.ts
- Request latency histograms (p50, p95, p99)
- AI provider call counts and durations
- Cache hit/miss rates
- Cinemeta lookup success rates
- Error rates by type
```

**Approach:**
- Add `prom-client` for Prometheus metrics
- Expose `/metrics` endpoint
- Add request ID middleware for tracing
- Structured JSON logging with correlation IDs

### Circuit Breaker Pattern
**Priority:** Critical | **Effort:** Low

Prevent cascade failures when external services are down.

**Implementation:**
- Add circuit breaker to Cinemeta service
- Add circuit breaker to Weather service
- States: CLOSED → OPEN → HALF_OPEN
- Configurable thresholds (5 failures → open, 30s reset)

---

## 🔥 P1 - High Priority

### TMDB Integration
**Priority:** High | **Effort:** Medium

Replace/supplement Cinemeta with TMDB for richer metadata.

**Benefits:**
- Higher quality posters and backdrops
- Detailed descriptions, ratings, cast info
- Better international title support
- More reliable than Cinemeta for new releases

**Implementation:**
- `src/services/tmdb.ts` with connection pooling
- Fallback chain: TMDB → Cinemeta
- Cache TMDB responses (24h TTL)
- Add `TMDB_API_KEY` to config (free tier: 1000 req/day)

### OpenRouter Support
**Priority:** High | **Effort:** Medium

Single integration for 100+ AI models.

**Benefits:**
- Access to Claude, GPT-4, Llama, Mistral, etc.
- Pay-per-use pricing flexibility
- Automatic failover between models
- Web search models for trending content

**Implementation:**
- Add `openrouter` provider type
- OpenAI-compatible API: `https://openrouter.ai/api/v1`
- Model picker in configuration wizard
- Detect `:online` suffix for web search models

### RPDB Enhanced Artwork
**Priority:** High | **Effort:** Low

Rating overlays on posters for better visual information.

**Implementation:**
- Optional `rpdbApiKey` in user config
- `src/services/rpdb.ts` URL builder
- Replace poster URL when configured

---

## 🎯 P2 - Medium Priority

### Redis Cache Backend
**Priority:** Medium | **Effort:** Medium

Enable horizontal scaling with shared cache.

**Benefits:**
- Persistent cache across restarts
- Shared cache for multiple instances
- Better memory management

**Implementation:**
- Add `CacheBackend` implementation for Redis
- Auto-detect `REDIS_URL` environment variable
- Fallback to memory cache if not configured
- Use `ioredis` for connection pooling

### Improved HTTP Client
**Priority:** Medium | **Effort:** Medium

Better connection management for external APIs.

**Implementation:**
- `undici` Agent for HTTP/2 and connection pooling
- Shared client factory in `src/utils/http.ts`
- Request/response interceptors for logging
- Configurable timeouts per service

### Enhanced Configuration Wizard
**Priority:** Medium | **Effort:** Medium

Better onboarding experience.

**Improvements:**
- Inline help tooltips
- Real-time API key validation with spinner
- Preview recommendations before saving
- Import/export configuration
- QR code for mobile setup

### Trakt/Simkl Watch History
**Priority:** Medium | **Effort:** High

Avoid recommending already-watched content.

**Implementation:**
- OAuth flow for Trakt/Simkl
- Fetch watched history on catalog generation
- Filter AI results against watch history
- Optional "rewatch" mode

---

## 📋 P3 - Low Priority (Future)

### Multi-Language Support
- Localized prompts for non-English users
- UI translations
- Region-specific recommendations

### Mood-Based Catalogs
- "I feel like..." quick picks
- Emotion-to-genre mapping
- Context-aware mood detection

### A/B Testing Framework
- Compare prompt effectiveness
- Track recommendation click-through rates
- Measure user satisfaction

### WebSocket Real-Time Updates
- Push new recommendations when context changes
- Live catalog refresh

### Edge Caching (Cloudflare Workers)
- Global CDN for cached catalogs
- Reduced latency worldwide

---

## 🔧 Technical Debt

### Code Quality
- [ ] Add JSDoc to all public functions
- [ ] Increase test coverage to 90%+
- [ ] Add integration tests with mock AI responses
- [ ] Add E2E tests with Playwright

### Build & Deploy
- [ ] Multi-stage Docker build for smaller images
- [ ] GitHub Actions caching optimization
- [ ] Automated dependency updates (Renovate)
- [ ] Preview deployments for PRs

### Documentation
- [ ] API documentation with OpenAPI/Swagger
- [ ] Architecture decision records (ADRs)
- [ ] Contributing guide improvements
- [ ] Troubleshooting guide

---

## Status Legend

| Status | Meaning |
|--------|---------|
| 📋 Planned | On the roadmap, not yet started |
| 🚧 In Progress | Currently being worked on |
| ✅ Complete | Implemented and released |

---

*Last updated: January 2026*
*Analysis method: Six Thinking Hats framework*
