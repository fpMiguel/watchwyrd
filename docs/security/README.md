# Security Documentation

This folder contains security-related documentation for Watchwyrd.

## Contents

### [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)
Comprehensive security and privacy audit using adversarial analysis methodology. Covers:
- Threat model and attacker profiles
- Fixed vulnerabilities
- Remaining considerations
- Best practices implemented

### [BREACH_SCENARIOS.md](./BREACH_SCENARIOS.md)
Analysis of server compromise scenarios and defense-in-depth mitigations:
- SECRET_KEY extraction protection
- Memory-resident data minimization
- Log sanitization
- Rate limiting and abuse prevention

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email the maintainer directly with details
3. Allow reasonable time for a fix before disclosure

## Security Principles

Watchwyrd follows these security principles:

1. **BYOK (Bring Your Own Key)** - Users control their own API keys
2. **Encryption at Rest** - Config URLs are AES-256-GCM encrypted
3. **No Persistent Storage** - Keys exist only in memory during requests
4. **Defense in Depth** - Multiple layers of protection
5. **Fail Secure** - Errors don't expose sensitive data
