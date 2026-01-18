# ADR-009: OpenAI Model Selection and GPT-5 Support

## Status

Accepted

## Date

2026-01-18

## Context

Watchwyrd added OpenAI as a third AI provider. We needed to determine which OpenAI models to offer users and discovered that GPT-5 models require different API parameters than GPT-4.x models.

Initial testing showed GPT-5 models failing to return valid JSON (0-67% reliability), while GPT-4.x models had 100% reliability. Investigation revealed this was due to incorrect API parameters, not model limitations.

## Decision

### Model Selection

Offer 6 OpenAI models in two tiers:

**GPT-4.x (Fast & Reliable):**
- `gpt-4o-mini` - Default, recommended (~$0.00017/request, ~3s)
- `gpt-4.1-nano` - Fastest, cheapest (~$0.00010/request, ~1.8s)
- `gpt-4.1-mini` - Balanced (~$0.00039/request, ~3s)
- `gpt-4o` - Premium

**GPT-5.x (Reasoning Models):**
- `gpt-5-mini` - Best value reasoning (~$0.0015/request, ~8s)
- `gpt-5-nano` - Budget reasoning (~$0.0005/request, ~8s)

### GPT-5 Implementation

GPT-5 models are reasoning models (like o1/o3) that require different API parameters:

```typescript
// GPT-4.x models
response_format: { type: 'json_object' }
max_tokens: 1000
temperature: 0.7

// GPT-5.x models
response_format: { 
  type: 'json_schema',
  json_schema: { name: 'recommendations', strict: true, schema: {...} }
}
max_completion_tokens: 4000  // Higher for reasoning overhead
// No temperature (fixed at 1.0)
```

GPT-5 models use 500-2000+ "reasoning tokens" for internal thinking before generating output, requiring higher token limits.

### Excluded Models

| Model | Reason |
|-------|--------|
| gpt-5 (full) | 12s+ latency, $0.007/request - too slow/expensive |
| o-series | Similar to GPT-5, redundant |
| Web search models | $10-25/1k calls surcharge |

## Consequences

### Positive

- All 6 models achieve 100% JSON reliability with correct settings
- Clear tier differentiation (fast vs reasoning)
- Budget options available (gpt-4.1-nano at $0.0001/request)
- Power users get access to GPT-5 reasoning capabilities

### Negative

- GPT-5 requires separate code path in provider
- GPT-5 is 4-8x slower than GPT-4.x
- GPT-5 uses 4-5x more tokens per request

### Neutral

- Provider detects GPT-5 models and adjusts parameters automatically
- UI labels GPT-5 models as "Reasoning" to set expectations

## Alternatives Considered

### Alternative 1: Exclude GPT-5 Entirely

Simpler implementation, but limits user choice and excludes potentially higher-quality recommendations.

### Alternative 2: Include All GPT-5 Variants

Including gpt-5 (full) would add a very slow (12s+) and expensive option that most users wouldn't want.

## References

- [OpenAI Provider Implementation](../../src/providers/openai.ts)
- [Test Script](../../scripts/test-openai-models.js)
- [OpenAI Structured Outputs Docs](https://platform.openai.com/docs/guides/structured-outputs)
