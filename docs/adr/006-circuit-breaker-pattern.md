# ADR-006: Circuit Breaker Pattern for External Services

## Status

Accepted

## Date

2026-01-15

## Context

Watchwyrd depends on external services:
- AI providers (Gemini, Perplexity)
- Cinemeta (metadata)
- Open-Meteo (weather)

When these services fail or become slow, the application should:
- Not waste resources on failing requests
- Fail fast to improve user experience
- Recover gracefully when services return
- Prevent cascade failures

## Decision

Implement the **Circuit Breaker pattern** using the `opossum` library:

```typescript
const breaker = new CircuitBreaker({
  name: 'cinemeta',
  failureThreshold: 5,    // Open after 5 failures
  resetTimeout: 30000,    // Try again after 30s
  successThreshold: 2     // Close after 2 successes
});

await breaker.execute(() => fetchFromCinemeta(id));
```

### States
1. **CLOSED**: Normal operation, requests pass through
2. **OPEN**: Service is down, requests fail immediately
3. **HALF_OPEN**: Testing if service recovered

### Per-Service Configuration

| Service | Failure Threshold | Reset Timeout |
|---------|------------------|---------------|
| Cinemeta | 5 failures | 30 seconds |
| Weather | 3 failures | 60 seconds |
| AI Providers | Handled via retry logic |

## Consequences

### Positive

- **Fail fast**: Don't wait for timeouts on known-failing services
- **Resource protection**: Prevent thread/connection exhaustion
- **Graceful degradation**: Show cached/partial results
- **Self-healing**: Automatically recovers when service returns

### Negative

- **Complexity**: Additional state to manage
- **False positives**: Temporary network blips may trip breaker
- **Tuning required**: Thresholds need adjustment based on usage

### Neutral

- Requires monitoring to understand breaker state
- Different services need different configurations

## Alternatives Considered

### Alternative 1: Simple Retry with Backoff

Retry failed requests with exponential backoff:
- Still wastes resources on persistently failing services
- Doesn't prevent cascade failures
- User waits through all retries

### Alternative 2: Timeout Only

Just set aggressive timeouts:
- Still attempts every request
- No learning from failures
- Poor resource utilization

### Alternative 3: Health Checks

Periodic health checks to determine availability:
- Adds polling overhead
- Health endpoint may not reflect actual service health
- More complex implementation

## Implementation Details

Using `opossum` library for battle-tested implementation:

```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(asyncFunction, {
  timeout: false,  // Let function handle timeout
  errorThresholdPercentage: 50,
  volumeThreshold: 5,
  resetTimeout: 30000
});

breaker.on('open', () => logger.warn('Circuit opened'));
breaker.on('close', () => logger.info('Circuit closed'));
```

## References

- [Circuit Breaker Implementation](../../src/utils/circuitBreaker.ts)
- [opossum Library](https://github.com/nodeshift/opossum)
- [Martin Fowler - Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)
