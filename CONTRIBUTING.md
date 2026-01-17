# Contributing to Watchwyrd

First off, thank you for considering contributing to Watchwyrd! 🔮

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Need Help?](#need-help)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct: be respectful, inclusive, and constructive.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:
- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs what actually happened
- **Screenshots** if applicable
- **Environment details**:
  - Node.js version (`node --version`)
  - Operating system
  - AI provider and model used
  - Browser (if configure wizard issue)

**Template:**
```markdown
## Bug Description
A clear description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- Node.js: v22.x
- OS: Windows 11
- AI Provider: Gemini
- Model: gemini-2.5-flash
```

### 💡 Suggesting Features

Feature requests are welcome! Please:
- **Check existing issues** and the [roadmap](./docs/ROADMAP.md) first
- **Describe the problem** your feature would solve
- **Propose a solution** if you have one in mind
- **Consider the scope** - does it fit the project's goals?

### 📝 Improving Documentation

Documentation improvements are always welcome:
- Fix typos or unclear explanations
- Add examples or diagrams
- Translate to other languages
- Improve inline code comments

### 🔧 Code Contributions

See [Pull Request Process](#pull-request-process) below.

## Development Setup

### Prerequisites

- **Node.js** 22.x or higher
- **npm** 10.x or higher
- **Git**
- **AI API Key** (Gemini or Perplexity) for testing

### Quick Start

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/watchwyrd.git
cd watchwyrd

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env and add your API keys for testing

# Start development server
npm run dev

# The server will be available at:
# - Configure: http://localhost:7000/configure
# - Health: http://localhost:7000/health
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run all tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:api` | Run E2E tests (requires API keys) |
| `npm run lint` | Lint code with ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | TypeScript type checking |
| `npm run check` | Run all checks (lint + typecheck + test) |

### Environment Variables

```bash
# Required for development testing
GEMINI_API_KEY=your-gemini-key      # For testing Gemini provider
PERPLEXITY_API_KEY=your-pplx-key    # For testing Perplexity provider

# Optional
SECRET_KEY=your-secret-key          # Encryption key (auto-generated if missing)
RPDB_API_KEY=your-rpdb-key          # For RPDB poster testing
PORT=7000                           # Server port
NODE_ENV=development                # Enables dev features
```

## Project Architecture

```
watchwyrd/
├── src/
│   ├── addon/           # Stremio manifest and addon definition
│   ├── cache/           # In-memory LRU caching layer
│   ├── catalog/         # Catalog generation logic
│   │   ├── catalogGenerator.ts   # Main catalog builder
│   │   ├── searchGenerator.ts    # Natural language search
│   │   └── definitions.ts        # Catalog type definitions
│   ├── config/          # Configuration schemas and validation
│   ├── handlers/        # HTTP route handlers
│   │   ├── configure/   # Configuration wizard UI
│   │   └── stremio.ts   # Stremio protocol handlers
│   ├── middleware/      # Express middleware (rate limiting)
│   ├── prompts/         # AI prompt builders
│   │   ├── catalog.ts   # Catalog recommendation prompts
│   │   ├── search.ts    # Search query prompts
│   │   └── context.ts   # Context signal formatting
│   ├── providers/       # AI provider clients
│   │   ├── gemini.ts    # Google Gemini implementation
│   │   ├── perplexity.ts # Perplexity implementation
│   │   ├── factory.ts   # Provider factory
│   │   └── types.ts     # Provider interface
│   ├── schemas/         # Zod validation schemas
│   ├── services/        # External service clients
│   │   ├── cinemeta.ts  # Stremio metadata service
│   │   ├── weather.ts   # Open-Meteo weather
│   │   └── rpdb.ts      # Rating poster database
│   ├── signals/         # Context signal engine
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
│       ├── crypto.ts    # Encryption/decryption
│       ├── circuitBreaker.ts  # Resilience pattern
│       ├── http.ts      # HTTP client
│       └── logger.ts    # Structured logging
├── tests/               # Test files
│   ├── __fixtures__/    # Test data factories
│   ├── __mocks__/       # Mock implementations
│   └── __helpers__/     # Test utilities
├── docs/                # Documentation
│   ├── adr/             # Architecture Decision Records
│   └── security/        # Security audits
└── scripts/             # Build and utility scripts
```

### Key Architectural Decisions

See [Architecture Decision Records](./docs/adr/README.md) for detailed explanations:

- **ADR-001**: AI Provider Abstraction Layer
- **ADR-002**: Encrypted Configuration URLs
- **ADR-003**: Structured JSON Output
- **ADR-004**: Cinemeta for Metadata
- **ADR-005**: Memory-Based Caching
- **ADR-006**: Circuit Breaker Pattern
- **ADR-007**: Context-Aware Recommendations
- **ADR-008**: Bring Your Own Key (BYOK)

## Coding Guidelines

### TypeScript

- Use strict TypeScript - no `any` types
- Prefer type imports: `import type { Foo } from './foo.js'`
- Document public APIs with JSDoc comments
- Use explicit return types for public functions

```typescript
// ✅ Good
import type { UserConfig } from '../types/index.js';

/**
 * Create an AI provider based on user configuration
 * @param config - User configuration with API keys
 * @returns Configured AI provider instance
 */
export function createProvider(config: UserConfig): IAIProvider {
  // ...
}

// ❌ Bad
export function createProvider(config: any) {
  // ...
}
```

### Code Style

- Use Prettier for formatting (configured in `.prettierrc`)
- Follow ESLint rules (configured in `eslint.config.js`)
- Keep functions small and focused (< 50 lines ideally)
- Use meaningful variable names
- Prefer `const` over `let`
- Use template literals for string interpolation

### File Organization

- One primary export per file
- Group related functionality in directories
- Use `index.ts` for re-exports
- Keep imports organized: external → internal → types

### Error Handling

- Use typed errors when possible
- Log errors with context
- Fail gracefully with user-friendly messages
- Never expose internal errors to users

```typescript
// ✅ Good
try {
  const result = await provider.generate(prompt);
  return result;
} catch (error) {
  logger.error('Failed to generate recommendations', { 
    error: error instanceof Error ? error.message : 'Unknown error',
    provider: config.aiProvider 
  });
  return createErrorCatalog('Unable to generate recommendations');
}
```

## Testing

### Test Structure

```
tests/
├── __fixtures__/     # Reusable test data
│   ├── configs.ts    # User config factories
│   └── recommendations.ts
├── __mocks__/        # Mock implementations
│   ├── providers.ts  # Mock AI providers
│   └── cinemeta.ts   # Mock metadata service
├── __helpers__/      # Test utilities
│   └── assertions.ts # Custom matchers
├── *.test.ts         # Test files
```

### Writing Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createTestConfig } from './__fixtures__/configs.js';

describe('CatalogGenerator', () => {
  describe('generateCatalog', () => {
    it('returns movie catalog with correct structure', async () => {
      // Arrange
      const config = createTestConfig({ includeMovies: true });
      const generator = new CatalogGenerator(mockProvider);
      
      // Act
      const catalog = await generator.generate('movies-fornow', config);
      
      // Assert
      expect(catalog.metas).toHaveLength(20);
      expect(catalog.metas[0]).toHaveProperty('id');
      expect(catalog.metas[0]).toHaveProperty('type', 'movie');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/providers.test.ts

# Run tests in watch mode
npm test -- --watch

# Run E2E tests (requires API keys in .env)
npm run test:api
```

### Coverage Goals

| Module | Target |
|--------|--------|
| providers/ | 80%+ |
| catalog/ | 75%+ |
| prompts/ | 85%+ |
| utils/ | 85%+ |
| **Overall** | **75%+** |

## Pull Request Process

### Before Submitting

1. **Create an issue first** for significant changes
2. **Fork the repo** and create your branch from `main`
3. **Follow coding guidelines** above
4. **Run all checks**:
   ```bash
   npm run check  # Runs lint + typecheck + test
   ```
5. **Update documentation** if needed
6. **Add tests** for new functionality

### Branch Naming

```
feature/add-openai-provider
fix/cache-invalidation-bug
docs/improve-setup-guide
refactor/simplify-prompt-builder
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add OpenAI provider support
fix: resolve cache invalidation on config change
docs: update API documentation
refactor: simplify prompt builder logic
test: add unit tests for weather service
chore: update dependencies
```

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other (describe)

## Testing
- [ ] Added new tests
- [ ] All tests pass locally
- [ ] Tested manually

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed my code
- [ ] Updated documentation if needed
- [ ] No new warnings introduced
```

### Review Process

1. **Automated checks** must pass (CI)
2. **Code review** by maintainer
3. **Address feedback** if any
4. **Squash and merge** when approved

## Need Help?

- 📖 Check the [documentation](./docs/)
- 🏗️ Read the [ADRs](./docs/adr/) for architectural context
- 🗺️ See the [roadmap](./docs/ROADMAP.md) for planned features
- 💬 Open a [discussion](https://github.com/YOUR_USERNAME/watchwyrd/discussions)
- ❓ Ask in issues with the `question` label

## Recognition

Contributors will be recognized in our README. Thank you for helping make Watchwyrd better! 🙏

---

*Happy coding! 🔮*
