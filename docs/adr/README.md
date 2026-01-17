# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for Watchwyrd.

## What are ADRs?

ADRs document significant architectural decisions made during the development of this project. Each record captures the context, decision, and consequences of a particular choice.

## Format

We use the [MADR](https://adr.github.io/madr/) (Markdown Any Decision Records) format:

- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: What is the issue that we're seeing that is motivating this decision?
- **Decision**: What is the change that we're proposing and/or doing?
- **Consequences**: What becomes easier or more difficult because of this change?

## Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [001](001-ai-provider-abstraction.md) | AI Provider Abstraction Layer | Accepted | 2026-01 |
| [002](002-encrypted-config-urls.md) | Encrypted Configuration URLs | Accepted | 2026-01 |
| [003](003-structured-output-json.md) | Structured JSON Output for AI | Accepted | 2026-01 |
| [004](004-cinemeta-metadata-resolution.md) | Cinemeta for Metadata Resolution | Accepted | 2026-01 |
| [005](005-memory-cache-strategy.md) | Memory-Based Caching Strategy | Accepted | 2026-01 |
| [006](006-circuit-breaker-pattern.md) | Circuit Breaker for External Services | Accepted | 2026-01 |
| [007](007-context-aware-recommendations.md) | Context-Aware Recommendations | Accepted | 2026-01 |
| [008](008-byok-architecture.md) | Bring Your Own Key (BYOK) | Accepted | 2026-01 |

## Creating New ADRs

1. Copy `_template.md` to a new file: `NNN-short-title.md`
2. Fill in the sections
3. Update the index above
4. Submit for review
