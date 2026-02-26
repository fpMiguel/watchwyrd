# 🟢 LOW: External Service Security Gaps

**Severity**: LOW  
**CVSS Score**: 3.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L)  
**Category**: Service Integration  
**Audit Sub-area**: API Key Handling & Authentication  

---

## Executive Summary

The system's integration with external services (Cinemeta, Open-Meteo, OpenStreetMap, RatingPosterDB) lacks several security hardening measures: no service authentication, limited monitoring, and no retry logic. These are low-priority because the external calls are read-only and the services are public, but improving them would enhance reliability and security posture.

---

## Vulnerability Details

### 1. No External Service Authentication

#### Location
- **Files**: `src/utils/http.ts`, `src/utils/clientPool.ts`, service modules in `src/services/`
- **Scope**: All outbound HTTP requests to external APIs

#### Problem Description

Outgoing requests to external metadata services **do not authenticate** the server to the service. This means:

- No mutual TLS (mTLS) - cannot verify server identity to services
- No API keys for services that support them (Cinemeta, OpenStreetMap)
- Relies solely on HTTPS for transport security

In a MITM scenario (compromised CA, malicious proxy), an attacker could intercept and modify responses without detection.

#### Current Services
- `https://v3-cinemeta.strem.io/` - No auth required (public API)
- `https://open-meteo.com/` - Open data, no auth
- `https://nominatim.openstreetmap.org/` - Requires User-Agent but no API key
- `https://ratingposterdb.com/` - Public API

**Why This Matters**:
- **Integrity**: Responses could be tampered with (inject malicious metadata)
- **Availability**: No service accounts means rate limits apply per IP (more restrictive)
- **Attribution**: Cannot identify your server to service providers (User-Agent only)

#### Impact
- **Risk**: LOW - Public services over HTTPS; MITM unlikely
- **Rate Limits**: MEDIUM - Shared IP limits may affect multi-user deployments
- **Compliance**: May violate internal policies requiring service-auth for outbound calls

---

### 2. No Service Monitoring or Health Checks

#### Location
- **Files**: `src/utils/clientPool.ts`, `src/index.ts`
- **Scope**: External service dependencies

#### Problem Description

The system **does not monitor** the health or latency of external services. Circuit breakers exist but are reactive (trigger after failures). There is no:
- Proactive health endpoint checking
- Latency tracking per service
- SLA monitoring or alerting
- Fallback to alternative services

If Cinemeta becomes slow, the system will automatically degrade (circuit breaker opens) but there's no alerting to inform the operator.

#### Impact
- **Observability**: LOW - Cannot diagnose slow responses
- **Reliability**: MEDIUM - Failures detected reactively, not proactively
- **User Experience**: Degrades silently until circuit opens

---

### 3. No Retry Logic for Transient Failures

#### Location
- **Files**: `src/utils/http.ts`, `src/utils/clientPool.ts`
- **Scope**: All external HTTP requests

#### Problem Description

External API calls **do not implement retry logic** for transient failures (timeouts, 5xx errors, network blips). A temporary network hiccup or rate limit (429) causes immediate failure with no retry.

**Why This Matters**:
- **Network flakiness**: Even 99.9% reliable services fail occasionally
- **Rate limiting**: Temporary 429 should be retried after delay
- **User experience**: Temporary outages cause unnecessary errors

#### Current Behavior
- Circuit breaker opens after threshold (prevents hammering)
- But no exponential backoff + retry before circuit opens

#### Impact
- **Availability**: MEDIUM - Poor resilience to transient failures
- **User experience**: Increased error rate during minor outages
- **Noise**: More error logs

---

### 4. Salt Storage Optimization (Related)

#### Location
- **File**: `src/utils/crypto.ts`
- **Scope**: Encryption key derivation

#### Problem Description

The PBKDF2 salt is stored **alongside the encrypted data** (in the config URL). While this is acceptable and common, it would be slightly more secure to store salts separately (e.g., in a server-side lookup table) so that compromising the encrypted blob doesn't reveal the salt.

**Impact**: Very low - This is a defense-in-depth improvement, not a vulnerability.

---

## Recommendations

### For External Service Authentication

**Immediate (1 day):**
- Already using HTTPS everywhere ✅
- Add distinctive `User-Agent` headers to identify your server:
  ```typescript
  headers: { 'User-Agent': 'Watchwyrd/0.0.37 (+https://yourdomain.com)' }
  ```

**Short-term (1 week):**
- Review external service terms - do any offer API keys?
- If `ratingposterdb.com` or `open-meteo.com` support API keys, obtain and use them
- Store service API keys in environment variables
- Add authentication headers for services that support it

**Long-term (1 month):**
- Consider mTLS for high-value deployments (enterprise)
- Implement service principal rotation (rotate service API keys periodically)

---

### For Service Monitoring

**Immediate (2-3 hours):**
- Add Prometheus metrics or at least `console.time()` around external calls
- Track success/failure counts and latency per service

**Short-term (1 day):**
- Implement a simple health check endpoint that pings all external services:
```typescript
app.get('/health/services', async (req, res) => {
  const results = await Promise.allSettled([
    pingCinemeta(),
    pingOpenMeteo(),
    pingNominatim(),
    // ...
  ]);
  return res.json({ services: results });
});
```

**Medium-term (1 week):**
- Add alerting (email, Slack) when service error rate >5% over 5 min
- Log slow responses (>2s) with warning level
- Dashboard showing real-time service health

---

### For Retry Logic

**Immediate (half day):**
- Implement simple retry for network errors and 5xx responses
- Use exponential backoff: 100ms, 200ms, 400ms, 800ms max

Example wrapper:
```typescript
async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  backoffFactor = 2
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      if (!isRetryable(error)) throw error; // Don't retry 4xx (except 429)
      await delay(100 * Math.pow(backoffFactor, attempt - 1));
    }
  }
}
```

**Medium-term (1 week):**
- Retry on 429 Too Many Requests with `Retry-After` header
- Circuit breaker already limits damage - retry won't hammer
- Cache results during retries to avoid duplicate work

---

### For Salt Storage

**Priority: Informational**
- Current design is acceptable
- Consider separate storage only if:
  - You have a server-side database anyway
  - You need to rotate salts without re-encrypting all configs
  - You want defense-in-depth against "salt+encrypted blob" compromise

---

## Verification Steps

### Service Authentication
1. Check outgoing request headers - confirm `User-Agent` is set
2. If using service API keys, verify they're in environment, not code
3. Test with network interceptor (mitmproxy) - ensure TLS validation

### Monitoring
1. Call `/health/services` endpoint when some services are down - verify status
2. Check logs for slow service warnings
3. Set up alerting test - simulate service failure, confirm notification

### Retry Logic
1. Simulate transient failure (e.g., close network, return 500 from mock)
2. Verify request is retried 3 times before failing
3. Check that 429 responses respect `Retry-After` header

---

## Related Issues

- **Linked**: Circuit breakers already exist (good) - retry logic complements them
- **Prerequisite**: None - these are independent improvements
- **Dependency**: Monitoring helps decide when to add service auth

---

## References

- **OWASP**: [Server-Side Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) - Service authentication
- **RFC 7231**: HTTP/1.1 Semantics - Retry-After header guidance
- **Martin Fowler**: [Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html) - Includes retry patterns

---

**Priority**: LOW - Current functionality is sufficient for production. Implement these enhancements to improve reliability and observability over the next 1-2 months.
