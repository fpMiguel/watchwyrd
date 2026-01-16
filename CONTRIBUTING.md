# Contributing to Watchwyrd

Thank you for considering contributing! 🔮

## Quick Start

```bash
git clone https://github.com/fpMiguel/watchwyrd.git
cd watchwyrd
npm install
cp .env.example .env  # Add your API keys
npm run dev           # http://localhost:7000/configure
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Run tests |
| `npm run check` | Lint + typecheck + test |
| `npm run build` | Production build |

## Code Guidelines

- **TypeScript**: No `any` types, explicit return types for public functions
- **Style**: Prettier for formatting, ESLint for linting
- **Testing**: Follow Arrange-Act-Assert pattern
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/)

## Pull Request Process

1. Create an issue first for significant changes
2. Fork and branch from `main`
3. Run `npm run check` before submitting
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
├── providers/     # AI provider implementations
├── catalog/       # Catalog generation
├── handlers/      # HTTP route handlers
├── prompts/       # AI prompt builders
├── services/      # External service clients
└── utils/         # Shared utilities
```

## Resources

- [Architecture Decisions](./docs/adr/)
- [Roadmap](./docs/ROADMAP.md)
- [Testing Guide](./docs/development/TESTING.md)
