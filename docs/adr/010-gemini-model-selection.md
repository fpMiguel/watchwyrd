# ADR-010: Gemini Model Selection

## Status

Accepted

## Date

2026-01-18

## Context

Watchwyrd uses Google Gemini as one of its AI providers. With multiple Gemini model families available (2.0, 2.5, 3.0 preview), we need to determine which models to offer users for movie and TV recommendations.

Key requirements:
- Reliable structured JSON output
- Fast response times for good UX
- Cost-effective for users on free/paid tiers
- Production-ready (not experimental/preview)

## Decision

### Model Selection

Offer 5 Gemini models from the 2.0, 2.5, and 3.0 families:

| Model | Latency | Cost/Request | Reliability | Use Case |
|-------|---------|--------------|-------------|----------|
| gemini-2.5-flash | ~2.6s | ~$0.00011 | 100% | **Default** - balanced |
| gemini-2.5-flash-lite | ~1.1s | ~$0.00008 | 100% | Fastest, budget |
| gemini-2.0-flash | ~2.1s | ~$0.00011 | 100% | Alternative |
| gemini-2.0-flash-lite | ~1.9s | ~$0.00007 | 100% | Budget alternative |
| gemini-2.5-pro | ~8.0s | ~$0.00327 | 100% | Premium quality |
| gemini-3-flash-preview | ~2.5s | ~$0.00015 | 100% | Preview (experimental) |

**Default: gemini-2.5-flash** - Best balance of speed, quality, and reliability.

### Thinking Models Fix

Gemini 3 and 2.5-pro models use "thinking tokens" which can interfere with structured JSON output. The fix is to set `thinkingBudget: 0` in the generation config:

```typescript
generationConfig.thinkingConfig = { thinkingBudget: 0 };
```

This disables thinking tokens and ensures reliable JSON output. Without this fix:
- gemini-3-flash-preview: 33% reliability → **100% with fix**
- gemini-2.5-pro: 67% reliability → **100% with fix**

### Test Results

3-run test with structured JSON output (5 movie recommendations) **after fix**:

```
| Model                 | Success | Avg Lat | Min Lat | Max Lat | Avg Cost   |
|-----------------------|---------|---------|---------|---------|------------|
| gemini-2.5-flash      | 3/3     | 2619ms  | 2278ms  | 3028ms  | $0.000107  |
| gemini-2.5-flash-lite | 3/3     | 1135ms  | 1029ms  | 1236ms  | $0.000076  |
| gemini-2.5-pro        | 3/3     | 8001ms  | 7450ms  | 8518ms  | $0.003274  |
| gemini-2.0-flash      | 3/3     | 2100ms  | 2065ms  | 2166ms  | $0.000106  |
| gemini-2.0-flash-lite | 3/3     | 1928ms  | 1864ms  | 1963ms  | $0.000074  |
| gemini-3-flash-preview| 3/3     | 2504ms  | 2067ms  | 2767ms  | $0.000150  |
```

All models now achieve **100% JSON reliability** with the thinkingBudget fix.

### Excluded Models

| Model | Reason |
|-------|--------|
| gemini-3-pro-preview | API access issues, preview status |
| gemini-1.5-* | Deprecated, API errors |

## Consequences

### Positive

- **Reliability**: All models achieve 100% structured JSON success with fix
- **Speed**: Flash models respond in 1-2.5 seconds
- **Free tier**: Gemini offers generous free usage
- **Premium option**: gemini-2.5-pro now reliable for quality-focused users

### Negative

- **Thinking models complexity**: Require special config to disable thinking
- **Temperature limitation**: Thinking models don't support custom temperature when thinking is disabled
- **Preview status**: gemini-3-flash-preview may change

### Neutral

- Dynamic model fetching from API ensures compatibility
- ThinkingBudget fix applied automatically based on model name
- Can add gemini-3-pro-preview when API access stabilizes

## References

- [Gemini Provider Implementation](../../src/providers/gemini.ts)
- [Test Script](../../scripts/test-gemini-models.js)
- [Google AI Studio](https://ai.google.dev/)
- [Gemini 3 Structured Output Issue](https://github.com/vercel/ai/issues/11396)
- [Thinking Mode Discussion](https://discuss.ai.google.dev/t/gemini-responds-with-structured-json-like-output-only-when-function-calling-is-enabled/112993)
