# Contributing to Watchwyrd

Read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

For security vulnerabilities, see the [Security Policy](SECURITY.md).

## Quick Start

```bash
git clone https://github.com/fpMiguel/watchwyrd.git
cd watchwyrd
npm install
cp .env.example .env  # Add your API keys
npm run dev           # http://localhost:7000/configure
```

## Development Commands

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Dev server with hot reload       |
| `npm test`             | Run tests                        |
| `npm run check`        | Typecheck + lint + format + test |
| `npm run check:ci`     | Full CI gate (check + audit)     |
| `npm run audit`        | Security audit (HIGH)            |
| `npm run scan:trivy`   | Trivy image scan (Docker)        |
| `npm run secrets:scan` | Secret scan (pre-commit hook)    |
| `npm run build`        | Production build                 |
| `npm run format`       | Format code with Prettier        |
| `npm run lint`         | Lint code with ESLint            |

## Code Guidelines

- **TypeScript**: No `any` types, explicit return types for public functions
- **Style**: Prettier for formatting, ESLint for linting
- **Testing**: Follow Arrange-Act-Assert pattern
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/)

## Pull Request Process

1. Create an issue first for significant changes
2. Fork and branch from `main`
3. Run `npm run check:ci` before submitting (`check` + `audit`; `scan:trivy` needs Docker). Commits are secret-scanned pre-commit — emergency `--no-verify` requires a follow-up full rescan
4. Update documentation if needed

### Branch Naming

```
feature/add-openai-provider
fix/cache-invalidation-bug
docs/improve-setup-guide
```

## Project Structure

```
src/
├── addon/       # Stremio manifest
├── cache/       # LRU cache with in-flight deduplication
├── catalog/     # Catalog generation
├── config/      # Zod schemas and environment validation
├── handlers/    # HTTP route handlers
├── middleware/  # Express middleware (rate limits, security)
├── prompts/     # AI prompt builders
├── providers/   # AI provider implementations
├── schemas/     # AI response Zod schemas
├── services/    # External service clients
├── signals/     # Request context (AbortSignal)
├── types/       # TypeScript types
├── utils/       # Shared utilities
└── web/         # Static assets (configure wizard CSS/JS)
```

## Resources

- [Architecture Decisions](./docs/adr/)
- [Roadmap](./docs/ROADMAP.md)
- [Testing Guide](./docs/development/TESTING.md)
