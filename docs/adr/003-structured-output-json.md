# ADR-003: Structured JSON Output for AI Responses

## Status

Accepted

## Date

2026-01-15

## Context

AI providers return recommendations in their response. We need to parse these into a structured format for Stremio. Challenges include:

- AI models may include extra text/explanation around JSON
- Response format can vary between models
- Invalid JSON can break the entire catalog
- Schema validation is needed to ensure data quality

## Decision

Use **native structured output** features when available:

### Gemini
```typescript
generationConfig: {
  responseMimeType: 'application/json',
  responseSchema: RecommendationSchema
}
```

### Perplexity
Include explicit JSON instructions in prompt with strict format requirements.

### Schema Definition
```typescript
const RecommendationSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          year: { type: 'number' },
          reason: { type: 'string' }  // Optional
        },
        required: ['title', 'year']
      }
    }
  }
};
```

### Validation
Use Zod schemas to validate parsed responses before processing.

## Consequences

### Positive

- **Reliability**: Structured output ensures consistent format
- **Type safety**: Zod validation catches malformed responses
- **No parsing hacks**: No need for regex/string manipulation
- **Better error handling**: Invalid responses are caught early

### Negative

- **Provider-specific**: Each provider has different structured output support
- **Schema maintenance**: Must keep schema in sync across providers
- **Fallback needed**: Some models don't support structured output

### Neutral

- Slightly more complex prompt engineering for providers without native support
- Schema updates require testing across all providers

## Alternatives Considered

### Alternative 1: Regex Extraction

Parse JSON from markdown code blocks:
```typescript
const match = response.match(/```json\n([\s\S]*?)\n```/);
```
Fragile and error-prone. Rejected.

### Alternative 2: Function Calling

Use function calling to get structured responses. Works but:
- Not all providers support it
- Adds complexity for simple data extraction
- Overkill for our use case

### Alternative 3: Multiple Retries with Different Prompts

Retry with increasingly strict prompts on parse failure. Rejected because:
- Wastes API calls/tokens
- Slow user experience
- Doesn't solve root cause

## References

- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Recommendation Schema](../../src/schemas/recommendations.ts)
- [Zod Documentation](https://zod.dev/)
