# ADR-004: Cinemeta for Metadata Resolution

## Status

Accepted

## Date

2026-01-15

## Context

AI providers return movie/series recommendations with titles and years. Stremio requires rich metadata including:

- IMDb ID (required for streams)
- Poster images
- Descriptions
- Genres, runtime, ratings
- Cast information

We need to resolve AI recommendations to full Stremio metadata objects.

## Decision

Use **Cinemeta** (Stremio's official metadata addon) as the primary metadata source:

```typescript
// Search by title and year
GET https://v3-cinemeta.strem.io/catalog/{type}/top/search={title}.json

// Get full metadata by IMDb ID  
GET https://v3-cinemeta.strem.io/meta/{type}/{imdbId}.json
```

### Resolution Flow
1. AI returns `{ title: "Inception", year: 2010 }`
2. Search Cinemeta: `search=Inception`
3. Filter results by year match
4. Return first matching result with full metadata

### Fallback Strategy
- If exact year match fails, try ±1 year tolerance
- If no results, skip the recommendation (don't show broken entries)

## Consequences

### Positive

- **Official source**: Cinemeta is Stremio's canonical metadata source
- **Stream compatibility**: IMDb IDs ensure streams work correctly
- **Rich metadata**: Posters, descriptions, ratings included
- **Free**: No API key required
- **Reliable**: Well-maintained by Stremio team

### Negative

- **Network dependency**: Requires Cinemeta availability
- **Search limitations**: Title matching can be imprecise
- **Rate limits**: Must be mindful of request volume
- **Coverage gaps**: Some obscure titles may not be indexed

### Neutral

- Added latency for metadata resolution
- Need to handle Cinemeta being temporarily unavailable

## Alternatives Considered

### Alternative 1: TMDB API

The Movie Database has excellent coverage but:
- Requires API key
- Rate limits are strict
- IMDb IDs require additional lookup
- Adds external dependency

### Alternative 2: OMDb API

Good for IMDb data but:
- Limited free tier (1000 requests/day)
- Missing some Stremio-specific fields
- Poster quality varies

### Alternative 3: AI-Generated Metadata

Have AI provide all metadata including IMDb IDs:
- Unreliable (AI hallucinates IDs)
- Outdated training data
- No poster URLs

### Alternative 4: Hybrid Approach

Use multiple sources with fallbacks. Rejected for initial implementation due to complexity, but could be added later.

## References

- [Cinemeta Implementation](../../src/services/cinemeta.ts)
- [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk)
