# Watchwyrd Roadmap

This document outlines planned features and improvements for future releases.

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

### Structured Output Mode

**Priority:** Medium | **Effort:** Low

Leverage AI provider structured output features for more reliable JSON responses.

**Benefits:**
- Guaranteed valid JSON structure
- Reduced parsing errors and hallucinations
- Cleaner error handling

**Implementation approach:**
- For Gemini: Use `responseMimeType: 'application/json'` with `responseSchema`
- For OpenAI-compatible: Use `response_format: { type: 'json_object' }`
- Define Zod schemas and convert to JSON Schema for providers
- Implement fallback chain: structured output → JSON mode → text parsing

### Enhanced Deduplication

**Priority:** Medium | **Effort:** Low

Post-process AI results to remove duplicate recommendations.

**Benefits:**
- Cleaner results without repeated titles
- Handle AI tendency to suggest same titles differently

**Implementation approach:**
- Normalize titles: lowercase, remove punctuation, strip articles ("The", "A")
- Create deduplication key: `${normalizedTitle}-${year}`
- Allow ±1 year tolerance for fuzzy matching
- Preserve original ordering, keep first occurrence
- Add to `catalogGenerator.ts` after AI response parsing

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

### Response Schema Validation

**Priority:** Medium | **Effort:** Medium

Implement strict validation of AI responses using Zod schemas.

**Benefits:**
- Type-safe recommendation objects
- Clear error handling for malformed responses
- Self-documenting response contracts

**Implementation approach:**
```typescript
// src/schemas/recommendations.ts
import { z } from 'zod';

export const RecommendationSchema = z.object({
  title: z.string().min(1),
  year: z.number().int().min(1900).max(2030),
  reason: z.string().optional(),
});

export const AIResponseSchema = z.object({
  items: z.array(RecommendationSchema),
});
```
- Validate in `extractRecommendations()` in providers/types.ts
- Use `.safeParse()` for graceful error handling

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

All items above are currently **📋 Planned**.

---

*Last updated: January 2026*
