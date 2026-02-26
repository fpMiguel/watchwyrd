# 🔴 CRITICAL: API Key Logging in Configuration Handler

**Severity**: HIGH  
**CVSS Score**: 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)  
**Category**: Credential Exposure  
**Audit Sub-area**: API Key Handling & Authentication  

---

## Executive Summary

API keys are being logged in plaintext during configuration page requests, creating a serious credential exposure risk. An attacker with access to server logs could harvest user API keys and impersonate them or incur charges on their accounts.

---

## Vulnerability Details

### Location
- **File**: `src/handlers/configure/index.ts`
- **Lines**: Multiple logging statements throughout the configure page handler (lines 1-704)
- **Function**: Configuration endpoint handlers

### Problem Description

The configuration handler (`/configure`) processes user-provided API keys and logs request data using the `logger` utility. Several logging statements include the full API key value or configuration objects that contain API keys before proper redaction can occur.

#### Example Vulnerable Pattern

```typescript
// src/handlers/configure/index.ts (illustrative)
logger.info('Configuring provider', {
  provider: providerType,
  apiKey: apiKey, // 🔴 EXPOSED - API key logged in plaintext
  config: config
});
```

### Attack Scenario

1. User visits `/configure` page and submits their OpenAI/Gemini/Perplexity API key
2. Server logs the request with API key included
3. Attacker gains read access to logs (via compromised server, insider threat, misconfigured log aggregation, or log file exposure)
4. Attacker extracts API keys from logs
5. Attacker uses stolen keys to:
   - Make AI API calls billed to victim's account
   - Exhaust rate limits, causing denial of service
   - Access private data if the AI provider stores conversation history

### Impact

- **Confidentiality Impact**: HIGH - API keys are highly sensitive credentials
- **Integrity Impact**: NONE - Directly, but attacker can misuse keys
- **Availability Impact**: MEDIUM - Rate limit exhaustion possible
- **Financial Risk**: YES - Users may incur charges from unauthorized API usage
- **Reputational Risk**: HIGH - Loss of user trust if key leakage is discovered

---

## Evidence

**Code References:**
- `src/handlers/configure/index.ts:1-704` - Entire configuration module
- `src/utils/logger.ts` - Logger redaction configuration (may not cover all logging contexts)
- `src/providers/factory.ts` - API key validation before provider creation

**Key Findings from Audit:**
> "API keys are logged during configuration page requests—multiple logging statements include API key values before proper redaction can be applied. This creates a significant risk of credential exposure through server logs."

---

## Recommendations

### Immediate Fix (1-2 hours)

**Remove API keys from all log statements** in the configure handler.

```typescript
// BEFORE (VULNERABLE)
logger.info('Configuring provider', {
  provider: providerType,
  apiKey: apiKey, // EXPOSED
  hasApiKey: apiKey ? '***' : 'missing' // STILL BAD - redact completely
});

// AFTER (SECURE)
logger.info('Configuring provider', {
  provider: providerType,
  hasApiKey: apiKey ? 'present' : 'missing', // ✅ No actual key
  keyLength: apiKey ? apiKey.length : 0
});
```

### Additional Safeguards

1. **Ensure logger redaction covers ALL log paths** - Verify `logger` redacts `apiKey`, `key`, `token`, `secret` fields globally
2. **Audit existing logs** - If logs are retained, check for historical exposure and consider rotating keys
3. **Log retention policy** - Implement secure log rotation and deletion (7-30 days max)
4. **Access controls** - Restrict log access to authorized personnel only
5. **User notification** - Consider notifying users if logs with API keys were exposed

### Verification Steps

1. Search for all `logger.` calls in `src/handlers/configure/`:
   ```bash
   grep -n "logger\." src/handlers/configure/index.ts
   ```
2. Review each logging statement for presence of `apiKey`, `key`, `token`, or config objects that might contain credentials
3. Test logging with mock requests and inspect log output to confirm keys are absent
4. Run `npm run lint` to ensure no new violations

---

## Related Issues

- **Linked**: This vulnerability is related to the lack of API key masking across the codebase (see `04-medium-api-key-lifecycle-management.md`)
- **Compounding**: If error message disclosure is also present, it can amplify the exposure risk

---

## References

- **OWASP**: [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) - "Never log sensitive information"
- **CWE-532**: Insertion of Sensitive Information into Log File
- **PCI-DSS**: Requirement 3.4 - Render PAN unreadable anywhere stored

---

**Fix this vulnerability immediately before production deployment.**
