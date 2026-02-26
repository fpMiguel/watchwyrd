# 🟢 LOW: Monitoring & Observability Gaps

**Severity**: LOW  
**Category**: Operational Security  
**Audit Sub-area**: API Key Handling & Authentication (peripheral)  

---

## Executive Summary

The application lacks comprehensive monitoring and observability infrastructure. While basic health endpoints exist (`/health`, `/metrics`), there is no centralized logging aggregation, alerting, or security event monitoring. This is low priority because the system is small and stateless, but becomes important as scale increases.

---

## Gap Details

### 1. No Centralized Log Aggregation

#### Current State
- Logs go to `stdout`/`stderr` (Docker-friendly)
- No integration with log aggregation services (Datadog, Papertrail, CloudWatch)
- No structured log storage with searchability
- Log rotation is OS-level (not application-controlled)

#### Problem
- Difficult to search historical logs for security incidents
- No long-term retention (logs disappear when container restarts)
- Cannot correlate events across multiple instances (if scaled)

#### Impact
- **Incident Response**: SLOW - must access individual server logs
- **Forensics**: LIMITED - short retention, no indexing
- **Compliance**: May fail requirements for log retention (90 days, etc.)

---

### 2. No Alerting on Security Events

#### Current State
- Logger writes to console at various levels
- No automated alerts for:
  - Repeated authentication failures (config invalid?
  - High error rates
  - Rate limit hits (potential DoS)
  - Circuit breaker activations (service degradation)
  - Unusual API usage patterns

#### Problem
- Operators unaware of issues until users report them
- Security incidents go unnoticed
- No early warning system for compromised keys

#### Impact
- **Detection Time**: HIGH - Manual user reports only
- **Response Time**: SLOW - No automated notifications
- **Security Posture**: Reactive, not proactive

---

### 3. No Audit Trail for Configuration Changes

#### Current State
- Config URLs are immutable once created (unless regenerated)
- No record of:
  - Who created which config
  - When configs were generated
  - How many times each config was used
  - Which provider each config uses

#### Problem
- Cannot detect compromised configs (increased usage)
- Cannot attribute usage to individuals (shared configs)
- No way to audit configuration lifecycle

#### Impact
- **Forensics**: Unable to trace actions to specific configs
- **Abuse Detection**: Cannot identify abusive configs
- **User Support**: Cannot help users recover lost configs (no record)

---

### 4. Limited Metrics Scope

#### Current State
- `/metrics` endpoint exists but scope is minimal
- Metrics include:
  - Request count, latency
  - Circuit breaker state
  - Cache hits/misses
- Missing:
  - Per-provider error rates
  - Config usage statistics
  - Rate limit utilization
  - External service latency (Cinemeta, Open-Meteo, etc.)

#### Problem
- Insufficient data for capacity planning
- Cannot identify slow services
- No visibility into provider performance

#### Impact
- **Performance**: Hard to optimize without data
- **Capacity Planning**: Guesswork, not data-driven
- **Provider Selection**: Cannot compare Gemini vs. OpenAI performance

---

## Recommendations

### Phase 1: Basic Observability (1 week)

**1. Structured JSON logging with timestamps**  
Already using Pino (JSON logger) ✅. Ensure timestamps included:
```typescript
logger.info({ msg: '...', timestamp: new Date().toISOString() });
```

**2. Basic audit logging**  
Log config generation and usage:
```typescript
// When config generated
logger.info({ type: 'config_created', configHash: hash, provider: type });

// When config used
logger.info({ type: 'config_used', configHash: hash, endpoint: '/stremio/meta' });
```

**3. Expander `/metrics` endpoint**  
Add:
- Config usage count
- Per-provider request count and error rate
- External service latency histograms

**4. Simple alerting script**  
Cron job that checks recent logs and emails on:
- >100 errors in 5 minutes
- >10 config creations in 1 minute (suspicious)
- Circuit breaker state change

---

### Phase 2: Enhanced Monitoring (2-4 weeks)

**5. Prometheus/Grafana integration**  
- Export metrics in Prometheus format
- Set up Grafana dashboard with:
  - Request rate and error percentage (golden signals)
  - Provider performance comparison
  - Circuit breaker status timeline
  - Cache hit rate

**6. Structured log aggregation**  
- Ship logs to Loki, Datadog, or CloudWatch
- Enable search: `{app="watchwyrd"} | json | provider="gemini"`
- Retention: 30-90 days

**7. Alerting rules**  
Using Prometheus Alertmanager or cloud provider:
- `rate(errors_total[5m]) > 0.1`
- `circuit_breaker_state == "open"`
- `rate(config_used_total[1m]) > 1000` (abuse detection)

---

### Phase 3: Advanced (1-3 months)

**8. Distributed tracing (OpenTelemetry)**  
- Trace requests from `/stremio/*` through provider calls
- Identify slowest components
- Correlate logs with traces

**9. Security event detection**  
- SIEM integration (Splunk, Sentinel)
- Automated detection:
  - Same config used from multiple IPs within 5 minutes
  - Spike in API key validation failures (brute force?)
  - Config usage at 3AM from unusual country

**10. User-facing usage dashboard**  
- `/usage` endpoint showing:
  - When your config was used
  - How many requests in last 24h
  - Which providers were called
  - Approximate AI API costs incurred

---

### Phase 4: Compliance-Ready (if needed)

**11. Immutable audit log**  
- Write audit events to WORM storage (or append-only DB)
- Tamper-evident logging (hash chaining)
- Retention: 7 years for compliance

**12. PII handling review**  
Even though no PII is collected, verify:
- IP addresses are logged (maybe consider anonymization)
- Config hashes are not reversible to API keys
- GDPR/CCPA compliance if applicable

---

## Current Health Endpoints (Already Good!)

✅ `/health` - Basic health  
✅ `/health/live` - Liveness probe  
✅ `/health/ready` - Readiness (503 when degraded)  
✅ `/health/detailed` - Detailed metrics snapshot  
✅ `/metrics` - Metrics endpoint (expand scope)

**Action**: Keep these, enhance the metrics returned.

---

## Verification Steps

**Phase 1 (after completion):**
1. Confirm JSON logs include timestamps, event types
2. Search recent logs for `config_created` events
3. Call `/metrics` and verify new metrics present
4. Trigger alert condition, verify email received

**Phase 2:**
1. Check Grafana panel loads without errors
2. Search aggregated logs for specific request (trace ID)
3. Verify alerting rules in Prometheus fire correctly

**Phase 3:**
1. Generate a test trace and verify all spans present
2. Check SIEM rule triggers on simulated attack
3. Verify usage dashboard shows accurate data

---

## Related Issues

- **Linked**: External service monitoring (`07-low-external-service-security.md`) overlaps
- **Prerequisite**: Implement basic logging before aggregation
- **Dependency**: Alerting depends on having metrics/logs first

---

## References

- **Google SRE**: [Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- **OWASP**: [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- **CNCF**: [OpenTelemetry Project](https://opentelemetry.io/)

---

**Priority**: LOW - The current minimal monitoring is acceptable for small deployments. Implement Phase 1 over the next month. Phases 2-3 are optional depending on scale and compliance needs.
