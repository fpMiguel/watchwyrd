# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Watchwyrd, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainer directly or use GitHub's private vulnerability reporting:
   - Go to the [Security tab](https://github.com/fpMiguel/watchwyrd/security)
   - Click "Report a vulnerability"
   - Provide a detailed description of the issue

### What to Include

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (optional)

### Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix timeline**: Depends on severity, typically within 30 days for critical issues

### Security Best Practices for Users

Since Watchwyrd uses a BYOK (Bring Your Own Key) model:

1. **Never share your addon URL** - it contains your encrypted API key
2. **Use separate API keys** - create a dedicated key for Watchwyrd with minimal permissions
3. **Rotate keys periodically** - especially if you suspect compromise
4. **Monitor API usage** - check your AI provider dashboard for unusual activity

## Scope

This security policy applies to:

- The Watchwyrd application code
- Official Docker images
- The hosted demo instance (if applicable)

Third-party dependencies are monitored via Dependabot.
