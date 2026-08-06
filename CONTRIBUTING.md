# Contributing to ProofPay

Thanks for your interest in contributing to ProofPay!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Follow the local development setup in the README
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Good First Areas

- Improve test coverage (contracts, backend, frontend)
- Harden backend validation and authorization
- Improve frontend accessibility and UI states
- Improve or expand documentation
- Add deployment guides (Docker, VPS, etc.)
- Expand event indexer durability (replace in-memory with persistent storage)

## Before Submitting a PR

Run all checks:

```bash
cd contracts && forge test
cd ../backend && npm run typecheck && npm run test
cd ../frontend && npm run build && npm run lint
```

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Write a clear description of what you changed and why
- Link any related issues

## Reporting Issues

Open a GitHub Issue with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Environment details (OS, Node version, chain, etc.)
