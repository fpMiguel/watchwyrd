# ADR-005: Memory-Based Caching Strategy

## Status

Accepted

## Date

2026-01-15

## Context

Watchwyrd makes expensive operations that benefit from caching:

- AI API calls (slow, rate-limited, costs money)
- Cinemeta lookups (external network calls)
- Weather API requests (external service)
- Generated catalogs (combination of above)

Caching requirements:
- Fast access (< 1ms)
- TTL support (different content expires differently)
- Size limits (prevent memory exhaustion)
- Simple deployment (no external dependencies)

## Decision

Implement an **in-memory LRU cache** with TTL support:

```typescript
interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

### Cache Configuration
- **Max entries**: 1000 (configurable)
- **Default TTL**: 1 hour
- **Catalog-specific TTLs**:
  - `fornow` (contextual): 1 hour
  - `discover` (diverse mix): 1 hour
  - Search results: 30 minutes

### Cache Keys
Structured keys for easy invalidation:
```
catalog:{configHash}:{catalogType}:{contentType}
meta:{imdbId}
weather:{lat}:{lon}
```

## Consequences

### Positive

- **Zero dependencies**: No Redis/Memcached required
- **Fast**: In-process memory access
- **Simple deployment**: Works anywhere Node.js runs
- **Predictable**: LRU eviction prevents memory bloat

### Negative

- **No persistence**: Cache lost on restart
- **No sharing**: Each instance has separate cache
- **Memory bound**: Limited by available RAM
- **No distributed caching**: Doesn't scale horizontally

### Neutral

- Cold starts require cache warming
- Cache misses cause slower first requests

## Alternatives Considered

### Alternative 1: Redis

Persistent, distributed caching but:
- Additional infrastructure
- Network latency for every cache hit
- Overkill for single-instance deployment
- Deployment complexity

### Alternative 2: File-Based Cache

Persistent across restarts but:
- Slower than memory
- Disk I/O overhead
- File cleanup complexity
- Potential disk space issues

### Alternative 3: No Caching

Simplest but:
- Excessive API calls
- Poor user experience (slow catalogs)
- Higher costs for AI APIs
- Rate limit issues

### Alternative 4: HTTP Cache Headers

Let clients cache responses:
- Works for repeat requests from same client
- Doesn't help with AI/Cinemeta calls
- Not sufficient alone

## Future Considerations

If horizontal scaling is needed, consider:
1. Redis as optional cache backend
2. Cache interface already supports this via `ICache`
3. Environment variable to switch cache implementations

## References

- [Cache Implementation](../../src/cache/memory.ts)
- [Cache Interface](../../src/cache/interface.ts)
