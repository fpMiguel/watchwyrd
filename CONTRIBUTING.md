# Contributing to Watchwyrd

First off, thank you for considering contributing to Watchwyrd! 🔮

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
- **Environment details** (OS, Node version, browser if relevant)

### 💡 Suggesting Features

Feature requests are welcome! Please:
- **Check existing issues** first
- **Describe the problem** your feature would solve
- **Propose a solution** if you have one in mind
- **Consider the scope** - does it fit the project's goals?

### 🔧 Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Follow the code style** - run `npm run lint` and `npm run format`
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Ensure CI passes** before requesting review

## Development Setup

```bash
# Fork the repo
git clone https://github.com/fpMiguel/watchwyrd.git
cd watchwyrd

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start development server
npm run dev

# Run all checks (before committing)
npm run check

# Or run individually:
npm run typecheck   # Type check
npm run lint        # Lint code
npm run format      # Format code
npm test            # Run tests
```

## Project Structure

```
watchwyrd/
├── src/
│   ├── addon/       # Stremio manifest and addon definition
│   ├── cache/       # In-memory caching layer
│   ├── catalog/     # Catalog generation logic
│   ├── config/      # Configuration schemas and validation
│   ├── handlers/    # HTTP route handlers
│   ├── middleware/  # Express middleware (rate limiting)
│   ├── providers/   # AI provider clients (Gemini, Perplexity)
│   ├── services/    # External services (Cinemeta, Weather)
│   ├── signals/     # Context signal engine
│   ├── types/       # TypeScript type definitions
│   └── utils/       # Utility functions (crypto, logger, rate limiter)
├── tests/           # Test files
└── docs/            # Documentation
```

## Coding Guidelines

### TypeScript
- Use strict TypeScript - no `any` types
- Prefer type imports: `import type { Foo } from './foo.js'`
- Document public APIs with JSDoc comments

### Code Style
- Use Prettier for formatting (configured in `.prettierrc`)
- Follow ESLint rules (configured in `eslint.config.js`)
- Keep functions small and focused
- Use meaningful variable names

### Testing
- Write tests for new features
- Maintain existing test coverage
- Use descriptive test names

### Commits
- Run `npm run check` before committing
- Use clear, concise commit messages
- Reference issues when applicable: `fix: resolve cache issue (#123)`
- Keep commits focused on single changes

## Need Help?

- Check the [documentation](./STREMIO_GEMINI_ADDON_SPEC.md)
- Open a [discussion](https://github.com/fpMiguel/watchwyrd/discussions)
- Ask in issues with the `question` label

## Recognition

Contributors will be recognized in our README. Thank you for helping make Watchwyrd better! 🙏
