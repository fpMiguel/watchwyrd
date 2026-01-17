# Watchwyrd Roadmap

This document outlines planned features and improvements for future releases.

---

## ✅ Recently Completed

### Structured Output Mode

**Status:** Complete

Leverage AI provider structured output features for more reliable JSON responses.

**What was implemented:**
- Gemini: `responseMimeType: 'application/json'` with `responseSchema` using SchemaType enums
- Perplexity: `response_format: { type: 'json_schema', json_schema: { schema: {...} } }`
- Zod schemas in `src/schemas/recommendations.ts` for validation
- Single source of truth for response format (GEMINI_JSON_SCHEMA)
- `parseAIResponse()` with Zod validation and detailed error messages

### Response Schema Validation

**Status:** Complete

Implemented strict validation of AI responses using Zod schemas.

**What was implemented:**
- Type-safe `Recommendation` and `AIResponse` types
- `parseAIResponse()` throws with detailed error paths
- `safeParseAIResponse()` returns null on failure
- `validateRecommendation()` for single item validation

### Enhanced Deduplication

**Status:** Complete

Post-process AI results to remove duplicate recommendations.

**What was implemented:**
- Title normalization: lowercase, remove articles ("The", "A", "An")
- Deduplication key: `${normalizedTitle}:${year}`
- Preserves first occurrence, maintains ordering
- Added to both Gemini and Perplexity providers

---

## 🔥 High Priority

### TMDB Integration

**Priority:** High | **Effort:** Medium

Replace or supplement Cinemeta with The Movie Database (TMDB) API for richer metadata.

**Benefits:**
- Higher quality posters and backdrops
- Detailed descriptions, taglines, and ratings
- Full genre, cast, and crew information
- Better international title support

**Implementation approach:**
- Create `src/services/tmdb.ts` service with search and details endpoints
- Use TMDB's `/search/movie` and `/search/tv` with year filtering
- Fetch external IDs via `/movie/{id}?append_to_response=external_ids` for IMDB mapping
- Add `TMDB_API_KEY` to config schema
- Consider fallback chain: TMDB → Cinemeta

### RPDB Enhanced Artwork

**Priority:** High | **Effort:** Low

Optional integration with RatingPosterDB for enhanced poster quality with rating overlays.

**Benefits:**
- Posters with IMDb/RT/Metacritic rating overlays
- Consistent visual style across catalogs
- User-configurable preference

**Implementation approach:**
- Add optional `rpdbApiKey` to user config
- Create `src/services/rpdb.ts` with poster URL builder
- RPDB URL format: `https://api.ratingposterdb.com/{apiKey}/imdb/poster-default/{imdbId}.jpg`
- Replace poster URL in meta resolution when RPDB key is configured

---

## 🎯 Medium Priority

### Web Search Models

**Priority:** Medium | **Effort:** Low

Support AI models with real-time web search capabilities.

**Benefits:**
- Access to current trending content
- Better handling of recent releases
- Real-time data for "what's new" queries

**Implementation approach:**
- Detect `:online` suffix in model names (e.g., `gpt-5-mini:online`)
- For OpenRouter: models with `online` capability have web search
- Adjust prompts to leverage web search: "Search for currently trending..."
- Consider separate catalog variant for "Trending Now"

---

## 🔧 Technical Improvements

### Improved HTTP Client

**Priority:** Medium | **Effort:** Medium

Enhance HTTP request handling with proper pooling and error handling.

**Benefits:**
- Reduced latency via connection reuse
- Consistent timeout and retry behavior
- Better observability

**Implementation approach:**
- Use `undici` Agent for connection pooling to Cinemeta/TMDB
- Create shared HTTP client factory in `src/utils/http.ts`
- Configure per-service: `{ connections: 10, pipelining: 1, keepAliveTimeout: 30000 }`
- Add request/response interceptors for logging and metrics
- Implement circuit breaker for failing services

---

## Status Legend

| Status | Meaning |
|--------|---------|
| 📋 Planned | On the roadmap, not yet started |
| 🚧 In Progress | Currently being worked on |
| ✅ Complete | Implemented and released |

---

*Last updated: January 2026*
