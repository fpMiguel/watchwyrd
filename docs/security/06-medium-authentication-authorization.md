# 🟡 MEDIUM: Missing Authentication & Authorization

**Severity**: MEDIUM (Context-dependent)  
**CVSS Score**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N (5.9)  
**Category**: Access Control  
**Audit Sub-area**: API Key Handling & Authentication  

---

## Executive Summary

The system has **no user-level authentication or session management**. It is completely stateless and anonymous, with access controlled solely by the encryption of configuration URLs. This is acceptable for the current use case (personal, encrypted configs), but presents risks if the system is deployed in multi-tenant environments or if config URLs are leaked.

---

## Vulnerability Details

### Current Authentication Model

The Watchwyrd addon uses a **token-based stateless model**:
- Users have a personal `/configure` page
- Configuration is encrypted in the URL using `SECRET_KEY`
- Anyone with the encrypted config URL can use that configuration
- No login, no sessions, no user accounts

### Problem Description

**1. No Authentication Bypass Protection**  
Since there are no accounts, there is no authentication to bypass. However, the **entire security model** depends on:
- `SECRET_KEY` being kept secret
- Encrypted config URLs not being shared or leaked

If either of these fails, unauthorized parties can use the configuration.

**2. No Session Management**  
- No session tokens or timeouts
- Config URLs are valid indefinitely (unless user changes them)
- No activity tracking or concurrent session limits

**3. No API Key Revocation** (see separate issue `04-medium-api-key-lifecycle-management.md`)  
- Users cannot invalidate their config from within the system
- Must manually revoke at external AI provider

**4. No Access Control Lists**  
- Cannot restrict which IPs or origins can use a config
- Cannot implement rate limiting per user (only global or IP-based)

---

## Attack Scenarios

### Scenario A: Config URL Leakage
1. User shares their encrypted config URL with a friend (intended)
2. Friend shares it publicly on Reddit (unintended)
3. Anyone with the URL can now use the user's AI API key
4. User incurs API charges or rate limit exhaustion

### Scenario B: `SECRET_KEY` Compromise
1. Attacker gains read access to server environment (via other vulnerability)
2. Attacker obtains `SECRET_KEY` and `ENCRYPTION_SALT`
3. Attacker can decrypt ANY config URL
4. Attacker harvests all users' API keys

### Scenario C: Multi-tenant Misuse
1. System deployed as a public service (multiple users)
2. Users share config URLs (easy to do)
3. No way to identify which user a config belongs to
4. No way to revoke a single user's access without breaking all configs encrypted with same key

---

## Impact Assessment

**Current Risk Level: ACCEPTABLE for single-user deployments**

The design is **intentionally** unauthenticated for these reasons:
- Simplified UX (no signup/login)
- Privacy-preserving (no personal data collected)
- Stateless (no database, easier to scale)
- Matches Stremio addon model (personal addons)

**When It Becomes Problematic**:
- Public/shared deployments (SaaS model)
- Enterprise use with compliance requirements (SOC2, HIPAA)
- Multi-user households wanting separate accounts
- Situations where API costs need to be attributed to individuals

---

## Recommendations

### Short-term Mitigations (1 week)

**1. Add config URL watermarking**  
Embed a user identifier in the encrypted payload (without breaking existing configs):
```typescript
interface ConfigPayload {
  apiKey: string;
  provider: string;
  config: object;
  _meta?: { created: number; userId?: string }; // Optional tracking
}
```
This allows:
- Forensic analysis if configs leak
- Potential revocation targeting (if userId present)

**2. Implement config usage tracking**  
- Log every config usage with hash of config URL (not the full URL)
- Detect unusually high usage patterns (compromised key)
- Alert user: "Your config has been used 1000x today - unusual activity"

**3. Add config expiration (soft)**  
- Include `expiresAt` in encrypted payload
- Warn users when config is >6 months old: "Your config is old, consider regenerating"
- Optional: auto-expire after 1 year

---

### Medium-term Features (2-4 weeks)

**4. User opt-in authentication**  
Allow users to enable a PIN or password:
- Config URL still works, but sensitive actions require auth
- `/configure` page prompts for PIN before showing API key
- Does not require full user accounts

**5. Config management dashboard**  
Let users:
- View all active configs (or configs they've created)
- Revoke specific configs (invalidate the URL)
- See usage statistics per config
- Set expiration on a per-config basis

**6. Rate limiting per config**  
Track usage per config hash and apply config-specific rate limits
- Prevent a single config from exhausting global rate limit
- Allow fair sharing in multi-user scenarios

---

### Long-term Considerations (1-3 months)

**7. Optional user accounts**  
If demand exists, add:
- Email-based account with password reset
- Config history and versioning
- Multiple named configs per account
- Usage billing and quotas

**8. OAuth integration**  
Allow login via Google/Microsoft for enterprise SSO

**9. API keys instead of config URLs**  
Alternative model:
- Users obtain long random token (API key) from server
- Use `Authorization: Bearer <key>` header in requests
- Server can revoke keys easily
- Better for programmatic access

---

## Mitigations Already in Place

The following reduce the risk of the current model:

✅ **Encryption**: Config URLs encrypted with AES-256-GCM
✅ **HTTPS**: All communication over TLS
✅ **Rate limiting**: Global rate limiting prevents abuse
✅ **Circuit breakers**: External service failures do not cascade
✅ **Logging**: Config usage can be tracked (IP, user agent, timestamp)
✅ **Key derivation**: Strong PBKDF2 makes brute force infeasible

---

## Verification Steps

1. **Test sharing**: Share a config URL with another user, verify it works
2. **Test encryption**: Attempt to tamper with encrypted portion - should fail
3. **Test tracking**: Generate many requests with same config, verify logs capture usage
4. **Test rate limiting**: Exhaust global rate limit with one config, verify other configs still work (if implementing per-config limits)
5. **Test revocation** (when implemented): Revoke config, verify subsequent requests fail

---

## Related Issues

- **Linked**: `04-medium-api-key-lifecycle-management.md` - Revocation specifically
- **Linked**: API key logging vulnerability - config URLs contain API keys; leakage is catastrophic
- **Prerequisite**: Fix critical logging vulnerabilities before implementing config sharing features

---

## References

- **OWASP**: [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- **OWASP**: [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- **NIST SP 800-63B**: Digital Identity Guidelines

---

**Priority**: Medium - The current design is acceptable for single-user deployments. Plan these improvements only if:
- Deploying as a multi-tenant service
- Users request account features
- Compliance requires authentication

**Otherwise, focus on mitigating config URL leakage and usage tracking.**
