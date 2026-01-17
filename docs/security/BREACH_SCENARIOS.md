# Breach Scenario Analysis & Mitigations

**Project:** Watchwyrd (Stremio AI Addon)  
**Date:** 2026-01-17  
**Scope:** Server compromise, data exfiltration, defense in depth

---

## Executive Summary

This document analyzes what happens if a malicious actor gains access to a running Watchwyrd server. We examine each attack vector, quantify the impact, and implement mitigations to minimize damage.

### Key Principle: Zero Trust Architecture

Since users bring their own API keys (BYOK), our primary security goal is:
**Even if the server is fully compromised, minimize what attackers can extract.**

---

## Attack Scenarios

### 1. SECRET_KEY Extraction 🔴 CRITICAL

**Scenario:** Attacker gains access to environment variables or .env file.

**What they get:**
- `SECRET_KEY` → Can decrypt ALL user configs in URLs
- All user API keys become extractable from logged/cached URLs

**Current State:**
- SECRET_KEY stored as environment variable
- Used for AES-256-GCM encryption of user configs
- Single key compromises ALL users

**Impact:** Complete exposure of all user API keys

**Mitigations Implemented:**
1. ✅ Production requires SECRET_KEY (fails without it)
2. ✅ Entropy warning for short keys
3. ✅ Keys never logged (redacted)

**Additional Mitigations (NEW):**
- Document key rotation procedure
- Consider per-user encryption (client-side key derivation)
- Add SECRET_KEY format validation

---

### 2. Log File Exfiltration 🟠 HIGH

**Scenario:** Attacker accesses log files or stdout/stderr.

**What could be logged:**

| Data Type | Currently Logged? | Risk |
|-----------|------------------|------|
| API Keys | ❌ Redacted in prod | Low |
| Search queries | ⚠️ YES (in debug) | Medium |
| Coordinates | ⚠️ YES (latitude/longitude) | Medium |
| Config URLs | ⚠️ Partial (first 50 chars) | Low |
| Error stack traces | ⚠️ YES | Low |

**Impact:** 
- Search queries reveal user interests (privacy)
- Coordinates reveal user location (~1km precision)
- Could correlate with external data

**Mitigations (NEW):**
1. Add `location` to sensitive patterns (redact lat/lon)
2. Add `query` to sensitive patterns (redact search queries)
3. Never log full config URLs
4. Reduce debug logging in production

---

### 3. Memory Dump Attack 🟠 HIGH

**Scenario:** Attacker dumps process memory.

**What's in memory:**
- SECRET_KEY (constant, always in memory)
- User API keys (during request processing)
- Decrypted configs (during request processing)
- Connection pool state
- Cache contents (catalog results)

**Impact:** Can extract SECRET_KEY and any in-flight API keys

**Mitigations (NEW):**
1. Consider using secure memory (not practical in Node.js)
2. Minimize time API keys are in memory
3. Clear sensitive data after use where possible
4. Document: No PII in cache (only movie metadata)

---

### 4. .env File Access 🟠 HIGH

**Scenario:** Attacker reads .env file in development.

**What's in .env:**
- `SECRET_KEY` (if set)
- `GEMINI_API_KEY` (dev only)
- `PERPLEXITY_API_KEY` (dev only)
- `RPDB_API_KEY` (dev only)

**Impact:** Access to dev API keys, can impersonate dev environment

**Mitigations:**
1. ✅ .env in .gitignore
2. ✅ Dev keys only work in dev mode
3. Document: Never use production keys in .env

---

### 5. Client Pool API Key Exposure 🟠 MEDIUM

**Scenario:** Attacker inspects client pool Map.

**Current State:**
```typescript
const clientPool = new Map<string, { client, createdAt }>()
```

**What's exposed:**
- API key hashes as Map keys (not actual keys)
- Actually: we hash the keys, so only hashes are in memory

**Current Implementation:** ✅ Uses hashed keys as identifiers

**Impact:** Low - hashes are not reversible

---

### 6. Cache Content Extraction 🟡 LOW

**Scenario:** Attacker dumps cache contents.

**What's in cache:**
- Movie/series metadata (from Cinemeta)
- Weather data (temperature, conditions)
- AI responses (recommendations)
- Search results

**Impact:** 
- No PII (no user data stored)
- No API keys in cache
- Weather data could reveal approximate location (already public info)

**Mitigations:** ✅ Already implemented - no sensitive data cached

---

### 7. Network Traffic Interception 🟡 MEDIUM

**Scenario:** Attacker intercepts outbound network traffic.

**What's transmitted:**
- API keys to Gemini/Perplexity (in request headers)
- User prompts to AI providers
- Location data to Open-Meteo

**Impact:** Full API key exposure if TLS is compromised

**Mitigations:**
1. ✅ All external APIs use HTTPS
2. ✅ No custom CA certificates
3. Consider: Pin certificates for critical APIs (overkill for this use case)

---

## Zero-Knowledge Architecture Analysis

### Current State

```
User → Config (API key) → Server encrypts → URL stored in Stremio
                            ↓
                     Server has SECRET_KEY
                     Server can decrypt all configs
```

**Problem:** Server is a single point of trust.

### Ideal Zero-Knowledge Design

```
User → Browser derives key → Encrypts config → URL stored in Stremio
                              ↓
                       Only user has key
                       Server cannot decrypt
```

**Implementation Approach:**

1. **Client-Side Key Derivation:**
   - Derive encryption key from user's passphrase
   - Never send passphrase to server
   - Server receives pre-encrypted config

2. **Trade-offs:**
   - User must remember passphrase
   - Lost passphrase = lost config
   - More complex UX

3. **Recommendation:** For a Stremio addon (low-risk use case), current approach is acceptable. Document the trust model clearly.

---

## Privacy-Preserving Logging

### New Sensitive Patterns (to implement)

```typescript
const SENSITIVE_PATTERNS = [
  /apiKey/i,
  /api_key/i,
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /credential/i,
  /key$/i,
  // NEW: Location privacy
  /latitude/i,
  /longitude/i,
  /coords?/i,
  /location/i,
  // NEW: Search privacy
  /query/i,
  /search/i,
];
```

---

## Implementation Checklist

### Immediate Fixes

- [x] Add `latitude`, `longitude` to sensitive patterns
- [x] Add `query`, `search` to sensitive patterns
- [x] Reduce production log verbosity
- [x] Document trust model in README

### Documentation Updates

- [x] Add BREACH_SCENARIOS.md (this document)
- [x] Document key rotation procedure
- [x] Document what's logged and what isn't

### Future Considerations

- [ ] Consider client-side encryption option (complex UX)
- [ ] Add log retention policy documentation
- [ ] Consider structured logging format (JSON) for SIEM integration

---

## Incident Response Guide

### If SECRET_KEY is Compromised

1. **Immediate:** Rotate SECRET_KEY
2. **Impact:** All existing config URLs become invalid
3. **Users:** Must reconfigure addon
4. **Notify:** Update changelog with security advisory

### If Logs are Leaked

1. **Current risk:** Low (API keys redacted)
2. **After this fix:** Minimal (location/queries also redacted)
3. **Action:** Review logs for any unredacted data

### If Server is Compromised

1. **Immediate:** Take server offline
2. **Rotate:** All environment variables
3. **Audit:** Check for unauthorized changes
4. **Rebuild:** Deploy fresh instance

---

## Summary

| Scenario | Before | After Fixes |
|----------|--------|-------------|
| SECRET_KEY stolen | All keys exposed | All keys exposed (inherent to design) |
| Logs leaked | Location+queries visible | All sensitive data redacted |
| Memory dumped | In-flight keys visible | In-flight keys visible (Node.js limitation) |
| .env accessed | Dev keys exposed | Document: never use prod keys |
| Cache dumped | No sensitive data | No sensitive data |

**Key Insight:** The architecture inherently requires the server to have access to SECRET_KEY. True zero-knowledge would require client-side encryption, which has UX trade-offs. The current design is appropriate for a media addon with user-provided API keys.

---

*Document created 2026-01-17*
