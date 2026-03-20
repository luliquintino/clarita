# Contributing to Clarita

Thank you for your interest in contributing! This guide covers how to set up the development environment and submit contributions.

## Getting Started

See [docs/SETUP.md](docs/SETUP.md) for the full local development setup guide.

## Branch Naming

- `feat/description` — new features
- `fix/description` — bug fixes
- `docs/description` — documentation changes
- `test/description` — tests only
- `refactor/description` — code refactoring

## Development Workflow

1. Fork the repository
2. Create your branch: `git checkout -b feat/my-feature`
3. **Write tests first** (TDD) — see [docs/SETUP.md#running-tests](docs/SETUP.md)
4. Implement the feature
5. Ensure all tests pass: `npm test`
6. Ensure lint passes: `npm run lint`
7. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
8. Open a Pull Request

## Code Standards

### Backend (Express.js)
- ESLint + Prettier (config in `backend/.eslintrc.js`)
- Run: `npm run lint` and `npm run format:check`
- All new routes must have integration tests in `backend/tests/integration/`
- All new services must have unit tests in `backend/tests/unit/`

### Frontend (Next.js + TypeScript)
- next lint + Prettier (config in `dashboard/.eslintrc.json`)
- Run: `npm run lint`
- New pages need tests in `__tests__/` next to the page file
- New components need tests in `src/components/__tests__/`

## Pull Request Requirements

- [ ] Tests written and passing
- [ ] Lint passing
- [ ] No `console.log` left in production code
- [ ] PR description explains the change and why
- [ ] Related issue linked (if applicable)

## Architecture

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) to understand the system design before contributing.

## Questions?

Open a GitHub Discussion or issue.
