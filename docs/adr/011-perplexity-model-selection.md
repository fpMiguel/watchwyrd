# ADR-011: Perplexity Model Selection

## Status

Accepted

## Date

2026-01-25

## Context

Watchwyrd uses Perplexity AI as one of its AI providers. Perplexity offers several "Sonar" models with different capabilities, costs, and latencies. We need to determine which models to offer users for movie and TV recommendations.

Key requirements:

- Reliable structured JSON output
- Web search integration for current content discovery
- Cost-effective for users
- Fast response times for good UX

## Decision

### Model Selection

Offer 3 Perplexity Sonar models:

| Model               | Latency | Cost/Request | Capability         | Use Case               |
| ------------------- | ------- | ------------ | ------------------ | ---------------------- |
| sonar               | ~1.5s   | Low          | Standard           | Fast, budget-friendly  |
| sonar-pro           | ~2.5s   | Medium       | Enhanced           | **Default** - balanced |
| sonar-reasoning-pro | ~4.0s   | Higher       | Advanced reasoning | Complex queries        |

**Default: sonar-pro** - Best balance of quality, speed, and cost for movie recommendations.

### Model Characteristics

#### sonar (Fast)

- Fastest response times
- Lower cost per request
- Good for simple recommendation queries
- Best for users prioritizing speed over depth

#### sonar-pro (Recommended)

- Enhanced web search capabilities
- Better understanding of nuanced preferences
- More accurate genre and mood matching
- Recommended for most users

#### sonar-reasoning-pro (Advanced)

- Extended reasoning for complex queries
- Better for multi-constraint searches (e.g., "90s sci-fi like Blade Runner but more philosophical")
- Higher latency due to reasoning steps
- Best for discovery-focused users

### Web Search Integration

All Perplexity models include built-in web search, making them excellent for:

- Finding recently released content
- Discovering trending movies/shows
- Current streaming availability awareness
- Real-time cultural context

This is indicated in the AI response metadata via `searchUsed: true`.

## Consequences

### Positive

- **Current content**: Web search finds new releases automatically
- **Simple pricing**: Users pay per-request to Perplexity directly
- **No grounding toggle**: Unlike Gemini, search is always included
- **Variety**: Three tiers for different user needs

### Negative

- **Latency variation**: sonar-reasoning-pro can be noticeably slower
- **Cost variability**: Users need to understand tier pricing
- **No free tier**: Perplexity requires paid API access

### Neutral

- Default to sonar-pro balances most use cases
- Users can downgrade to sonar for faster/cheaper results
- Upgrade path to sonar-reasoning-pro for power users

## Alternatives Considered

### Alternative 1: Only offer sonar-pro

Simpler configuration but limits user choice for speed/cost optimization.

### Alternative 2: Include older Perplexity models

Older models deprecated; focusing on current Sonar family ensures best support.

## References

- [Perplexity Provider Implementation](../../src/providers/perplexity.ts)
- [Perplexity API Documentation](https://docs.perplexity.ai/)
- [Model Schema](../../src/config/schema.ts)
