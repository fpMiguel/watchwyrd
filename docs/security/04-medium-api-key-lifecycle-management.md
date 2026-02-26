# 🟡 MEDIUM: Missing API Key Lifecycle Management

**Severity**: MEDIUM  
**CVSS Score**: 4.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)  
**Category**: Access Control  
**Audit Sub-area**: API Key Handling & Authentication  

---

## Executive Summary

The system lacks comprehensive API key lifecycle management: keys never expire, cannot be revoked, and are not properly masked in all contexts. While the current use case (per-user, encrypted config URLs) reduces some risks, these capabilities are essential for long-term security and control.

---

## Vulnerability Details

### 1. No API Key Expiration

#### Location
- **Files**: `src/config/schema.ts`, configure handler
- **Scope**: All provider API keys

#### Problem Description

User-provided API keys are accepted and stored indefinitely with **no expiration mechanism**. If a user's API key is compromised, it remains valid forever unless the user manually revokes it from the provider's dashboard.

**Why This Matters**:
- Compromised keys cannot be invalidated by the watchwyrd system
- Users may forget to revoke old keys when rotating credentials
- No automatic cleanup of stale/inactive keys
- Violates principle of least privilege (keys should be temporary)

#### Impact
- **Risk**: Compromised keys persist indefinitely
- **User Control**: Reduced - users must manually manage external providers
- **Cleanup**: Stale data accumulates

---

### 2. No API Key Revocation Mechanism

#### Location
- **Files**: System-wide (no revocation API exists)

#### Problem Description

There is **no way** for a user to revoke their API key from within Watchwyrd. The only method is to manually revoke from the AI provider's website (OpenAI, Google, Perplexity dashboards).

**Why This Matters**:
- Poor user experience - must leave the app to manage keys
- Emergency response: If key is leaked (e.g., through the logging vulnerability), user cannot quickly invalidate it
- No system-level control over compromised credentials

#### Impact
- **Incident Response**: SLOW - cannot react quickly to leaks
- **User Experience**: POOR - fragmented key management
- **Security**: OUT OF HANDS - relies entirely on user action at external site

---

### 3. Incomplete API Key Masking

#### Location
- **Files**: `src/handlers/configure/index.ts`, possibly others
- **Scope**: Logging and potentially responses

#### Problem Description

While the logger has redaction rules, the audit found evidence that **API keys may still be visible in logs during validation** and potentially in error messages before full redaction occurs.

**Linked to Critical Vulnerabilities**:
- Amplifies the impact of the API key logging issue
- May occur in different code paths than the main configure handler

#### Impact
- **Credential Exposure**: HIGH if actual keys appear in logs
- **Detection Difficulty**: Masking failures may be intermittent

---

### 4. Insufficient API Key Length Validation

#### Location
- **Files**: `src/config/schema.ts` (validation schema)
- **Scope**: Provider-specific API key formats

#### Problem Description

Some providers' API key validation accepts keys that are shorter than the provider's actual minimum length. This could allow weak/invalid keys to be submitted, causing confusing errors.

**Example**: OpenAI API keys are 51+ characters; if validation accepts 20-char strings, users will get confusing provider errors rather than immediate validation feedback.

#### Impact
- **User Experience**: CONFUSING - unclear errors
- **Security**: LOW RISK - invalid keys just fail, but may bypass additional validation
- **Data Quality**: Poor input quality

---

## Recommendations

### Immediate (1-2 days)

**1. Add API key length validation**  
Update Zod schemas in `src/config/schema.ts`:

```typescript
apiKey: z.string().min(20, 'API key too short') // Adjust per provider
```

**2. Implement key masking audit**  
Search entire codebase for any `logger.info`/`logger.debug` that might include `apiKey` before redaction. Use grep:
```bash
grep -rn "logger\." src/handlers/configure/ src/providers/
```
Remove or mask all occurrences.

---

### Short-term (1 week)

**3. Add API key expiration (soft)**  
- Store `createdAt` timestamp with each config
- Add `expiresAt` optional field (for future use)
- UI: Display key age and warning if >6 months old
- Flag expired keys but don't block yet (warning mode)

**4. Add UI for key revocation**  
- Add "Revoke Key" button in configure page
- When clicked: clear the stored API key from config URL
- Redirect user to provider's revocation page (deep link if available)
- Show confirmation: "Key revoked. Please obtain a new key."

---

### Medium-term (2-4 weeks)

**5. Implement key rotation workflow**  

Build rotation as first-class feature:
- "Rotate Key" button alongside "Revoke Key"
- Generates new random key (or prompts user to paste new key)
- Re-encrypts config URL with new key
- Optionally: grace period where both keys work (overlap)

**6. Key usage tracking**  
- Track `lastUsed` timestamp per key
- Auto-flag keys unused >12 months for cleanup
- Display usage stats to users

---

### Long-term (1-3 months)

**7. Key rotation policies**  
- Mandatory rotation every 90 days (configurable)
- Automatic expiration after 180 days of inactivity
- Notification system: email 30 days before expiration

**8. Security enhancements**  
- Allow multiple keys per user (rotation without downtime)
- Separate keys for different providers (cross-provider isolation)
- Key scopes (read-only vs. write if provider supports)
- Audit log of key lifecycle events (created, rotated, revoked)

---

## Verification Steps

1. **Validation**: Test API key length enforcement with too-short keys
2. **Masking**: Inspect logs after making configure requests - confirm no raw keys
3. **Revocation**: Click "Revoke Key" - verify config URL becomes invalid
4. **Expiration**: Manually set old `createdAt` date - verify warning appears
5. **Rotation**: Test rotate workflow - new config works, old key rejected

---

## Related Issues

- **Linked**: Cryptographic parameters (key rotation capability is prerequisite for secure rotation)
- **Prerequisite**: Fix API key logging first (revocation meaningless if keys already leaked)

---

## References

- **OWASP**: [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) - Session and credential management
- **NIST SP 800-63B**: Digital Identity Guidelines - Authenticator lifecycle
- **CWE-798**: Use of Hard-coded Credentials (related principle)

---

**Priority**: Medium - Implement within 1 month as part of key management feature set.
