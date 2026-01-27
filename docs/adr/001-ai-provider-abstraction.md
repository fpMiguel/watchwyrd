# ADR-001: AI Provider Abstraction Layer

## Status

Accepted

## Date

2026-01-15

## Context

Watchwyrd needs to generate movie and TV series recommendations using AI. Multiple AI providers exist (Gemini, Perplexity, OpenAI, etc.) with different APIs, capabilities, and pricing models. Users may prefer different providers based on:

- Cost (free tier availability)
- Quality of recommendations
- Speed of responses
- Regional availability

Hardcoding a single provider would limit flexibility and lock users into one ecosystem.

## Decision

Implement a **provider abstraction layer** with a common `IAIProvider` interface:

```typescript
interface IAIProvider {
  readonly provider: AIProvider;
  readonly model: AIModel;

  generateRecommendations(
    config: UserConfig,
    context: ContextSignals,
    contentType: ContentType,
    count: number,
    variantSuffix?: string,
    options?: GenerationOverrides
  ): Promise<AIResponse>;

  validateApiKey(): Promise<{ valid: boolean; error?: string }>;
}
```

Each provider (Gemini, OpenAI, Perplexity) implements this interface. A factory function creates the appropriate provider based on user configuration:

```typescript
function createProvider(config: UserConfig): IAIProvider;
```

## Consequences

### Positive

- **Flexibility**: Users can choose their preferred AI provider
- **Extensibility**: New providers can be added without changing core logic
- **Testability**: Providers can be mocked for unit testing
- **Resilience**: If one provider has issues, users can switch to another

### Negative

- **Complexity**: Additional abstraction layer to maintain
- **Feature parity**: Must ensure all providers support required features
- **Testing burden**: Each provider needs its own integration tests

### Neutral

- Provider-specific features (like Gemini grounding) require conditional logic
- Configuration UI must handle provider-specific options

## Alternatives Considered

### Alternative 1: Single Provider (Gemini Only)

Simpler implementation but locks users to Google's ecosystem and pricing.

### Alternative 2: OpenRouter Proxy

Use OpenRouter to access multiple models through one API. Rejected because:

- Adds another service dependency
- Users would need OpenRouter account instead of direct provider access
- Less control over provider-specific features

## References

- [Provider Factory Implementation](../../src/providers/factory.ts)
- [IAIProvider Interface](../../src/providers/types.ts)
