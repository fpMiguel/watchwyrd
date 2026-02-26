# 🔴 CRITICAL: Error Message Disclosure

**Severity**: MEDIUM-HIGH (Elevated to Critical in aggregate)  
**CVSS Score**: 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)  
**Category**: Information Disclosure  
**Audit Sub-area**: Error Handling & Information Disclosure  

---

## Executive Summary

Error messages in provider error parsing may expose technical implementation details that could aid attackers in reconnaissance and targeted exploitation. While the system has strong redaction in most areas, error messages in `errorParser.ts` can leak sensitive information about internal configurations, provider responses, and system architecture.

---

## Vulnerability Details

### Location
- **File**: `src/providers/errorParser.ts`
- **Lines**: 1-59 (entire module)
- **Functions**: `parseError()`, error classification logic

### Problem Description

The error parsing utility transforms provider and system errors into user-friendly messages. However, some error messages include technical details such as:
- HTTP status codes and raw response bodies
- Provider-specific error codes
- Configuration details
- Stack traces or internal paths (in development mode)

While some redaction occurs, the messages may still leak information that helps attackers understand the system's internal workings, installed libraries, version numbers, or configuration state.

#### Example Risky Pattern

```typescript
// src/providers/errorParser.ts (illustrative)
export function parseError(error: unknown): UserError {
  if (isProviderError(error)) {
    return {
      message: `Provider ${error.provider} returned ${error.statusCode}: ${error.body}`, // 🔴 Exposes details
      code: 'PROVIDER_ERROR'
    };
  }
  // ...
}
```

### Attack Scenario

1. Attacker sends malformed requests or triggers edge cases
2. System returns error messages with technical details
3. Attacker analyzes responses to:
   - Identify AI providers in use (Gemini, OpenAI, Perplexity)
   - Determine library versions from error format
   - Map internal API endpoints
   - Identify configuration parameters
   - Discover rate limiting thresholds
4. Attacker uses this intelligence to craft more precise attacks

### Impact

- **Confidentiality Impact**: MEDIUM - System information disclosed
- **Integrity Impact**: NONE - Directly
- **Availability Impact**: NONE - Directly
- ** Reconnaissance Advantage**: HIGH - Reduces attacker's information-gathering effort
- **Attack Surface Mapping**: Increases - reveals implementation details

---

## Evidence

**Code References:**
- `src/providers/errorParser.ts:1-59` - Error parsing and message generation
- `src/utils/logger.ts` - Logging redaction (separate from user-facing errors)
- `src/index.ts` - Error handling middleware

**Key Findings from Audit:**
> "Detailed error messages may expose internal implementation details" - Located in `errorParser.ts`. "Error messages include technical details" that should be sanitized.

---

## Recommendations

### Immediate Actions (1-2 hours)

**Sanitize all user-facing error messages** to be generic yet actionable.

```typescript
// BEFORE (VULNERABLE)
return {
  message: `OpenAI API error 429: rate limit exceeded for model gpt-4o-mini after 1000 requests`,
  code: 'RATE_LIMITED'
};

// AFTER (SECURE)
return {
  message: 'AI service temporarily unavailable. Please try again in a moment.',
  code: 'SERVICE_UNAVAILABLE'
};
```

### Error Message Taxonomy

Implement a classification system:

| Error Type | User Message | Log Details (server-side only) |
|------------|---------------|-------------------------------|
| Provider error | "AI service temporarily unavailable" | Provider, status code, response body |
| Invalid config | "Invalid configuration" | Which field is invalid (but not the value) |
| Rate limit | "Too many requests. Please slow down." | Current rate, limit, window |
| Network error | "Unable to reach AI service" | URL, timeout, error code |
| Server error | "Internal server error" | Stack trace, code location |

### Implementation Guidelines

1. **Never expose in user-facing messages**:
   - Provider names (use "AI service")
   - API endpoint URLs
   - Status codes (401, 403, 429, 500, etc.)
   - Rate limits or quotas
   - Library/version information
   - File paths or internal routes
   - Configuration values

2. **Always log the full details** (server-side only):
   ```typescript
   logger.error({ error, provider, statusCode, body }, 'Provider error occurred');
   // User gets generic message
   res.status(503).json({ error: 'Service temporarily unavailable' });
   ```

3. **Environment-aware messages**:
   - Development: More verbose (for debugging)
   - Production: Minimal generic messages
   - Use `process.env.NODE_ENV` or `LOG_LEVEL` to control verbosity

### Verification Steps

1. Trigger each error condition (provider error, rate limit, invalid config, network timeout)
2. Inspect HTTP response bodies - ensure no technical details leak
3. Check server logs to confirm full details ARE logged (for debugging)
4. Review all `res.json({ error: ... })` calls throughout codebase
5. Test with different `LOG_LEVEL` settings to ensure dev/prod separation

---

## Related Issues

- **Linked**: This vulnerability compounds the API key logging issue - if both are present, error logs could contain even more sensitive data
- **Dependency**: Ensure error sanitization is applied consistently across all provider modules

---

## References

- **OWASP**: [Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html) - "Ensure that error messages are generic"
- **CWE-209**: Generation of Error Message Containing Sensitive Information
- **PCI-DSS**: Requirement 6.5.5 - Improper Error Handling

---

**Fix this vulnerability immediately. Generic error messages are a security best practice.**
