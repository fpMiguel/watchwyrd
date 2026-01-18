# ADR-007: Context-Aware Recommendations

## Status

Accepted

## Date

2026-01-15

## Context

Static movie recommendations don't account for:
- Time of day (morning vs late night viewing)
- Day of week (weekday vs weekend)
- Weather conditions (rainy day movie vibes)
- Seasonal context (holiday movies, summer blockbusters)

Users want recommendations that feel relevant to their current moment.

## Decision

Implement **context signals** that influence AI recommendations:

```typescript
interface ContextSignals {
  // Temporal
  localTime: string;      // "21:30"
  timeOfDay: TimeOfDay;   // "evening" | "latenight" | ...
  dayOfWeek: string;      // "Friday"
  dayType: DayType;       // "weekend" | "weekday"
  date: string;           // "2026-01-17"
  
  // Location-derived
  timezone: string;       // "Europe/Brussels"
  country: string;        // "BE"
  
  // Optional weather
  weather?: {
    condition: string;    // "rainy"
    temperature: number;  // 12
  };
}
```

### Context in Prompts
```
CURRENT CONTEXT:
📅 Friday evening (21:30)
🌧️ Weather: Rainy, 12°C
📍 Belgium

Recommend movies perfect for this moment...
```

### Catalog Variants
- **fornow**: Uses full context for "right now" recommendations
- **discover**: Diverse mix with higher temperature for variety

## Consequences

### Positive

- **Relevance**: Recommendations feel timely and appropriate
- **Engagement**: Users more likely to watch suggested content
- **Differentiation**: Unique value vs static recommendation lists
- **Personalization**: Without requiring watch history

### Negative

- **Caching challenges**: Context changes, cache must be time-aware
- **API overhead**: Weather requires additional API call
- **Complexity**: More variables in recommendation logic
- **Testing difficulty**: Hard to test time-dependent behavior

### Neutral

- Users must opt-in to weather (location sharing)
- Cache TTLs must be shorter for contextual catalogs

## Alternatives Considered

### Alternative 1: Static Categories

Pre-defined categories like "Weekend Movies", "Late Night":
- Simple but not dynamic
- Doesn't adapt to actual conditions
- Misses weather integration

### Alternative 2: User-Specified Mood

Let users select current mood:
- Extra interaction required
- Users may not know what they want
- Doesn't capture external factors

### Alternative 3: Watch History Analysis

Analyze viewing patterns to predict preferences:
- Requires tracking (privacy concerns)
- Cold start problem
- Implementation complexity

## Context Sources

| Signal | Source | Optional |
|--------|--------|----------|
| Time | Server + User timezone | No |
| Day | Server + User timezone | No |
| Weather | Open-Meteo API | Yes |
| Location | User-provided coordinates | Yes |

## References

- [Context Generation](../../src/signals/context.ts)
- [Weather Service](../../src/services/weather.ts)
- [Prompt Builder](../../src/prompts/context.ts)
