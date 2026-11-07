# Contributing to Aether

First off, thank you for considering contributing to **Aether**! Category-defining open-source infrastructure is built by a global community of engineers who care deeply about reliability, security, and developer ergonomics.

This document outlines our development standards, repository layout, review processes, and governance guidelines.

---

## Table of Contents

1. [The 5-Minute Developer Quickstart](#1-the-5-minute-developer-quickstart)
2. [Monorepo Architecture](#2-monorepo-architecture)
3. [Development Workflow & Branching](#3-development-workflow--branching)
4. [Commit Conventions](#4-commit-conventions)
5. [Code Quality & Linting Standards](#5-code-quality--linting-standards)
6. [Testing & Verification Gates](#6-testing--verification-gates)
7. [Submitting a Pull Request](#7-submitting-a-pull-request)
8. [Governance & RFC Process](#8-governance--rfc-process)
9. [Community & Communication](#9-community--communication)

---

## 1. The 5-Minute Developer Quickstart

We believe in zero-friction contributor onboarding. You can spin up the full development environment with three commands:

```bash
# 1. Clone the repository
git clone https://github.com/aether-ai/aether.git
cd aether

# 2. Run the automated bootstrap verification
./scripts/setup.sh

# 3. Launch local developer stack (Rust core daemon + Next.js apps + local mocks)
pnpm dev
```

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v9.0.0` or higher
- **Rust**: `1.82.0` (Edition 2024) or higher
- **Docker & Docker Compose**: For local PostgreSQL, Redis, and NATS JetStream

---

## 2. Monorepo Architecture

Aether is organized as a hybrid monorepo utilizing **Turborepo**, **pnpm workspaces**, and **Cargo workspaces**:

```
aether/
├── apps/
│   ├── web/                     # Next.js 15 marketing landing page & in-browser playground
│   ├── docs/                    # Fumadocs documentation portal
│   └── console/                 # Real-time multi-agent visual execution console
├── packages/
│   ├── sdk-typescript/          # TypeScript / Node.js client SDK (@aether/sdk)
│   ├── sdk-python/              # Python client SDK (aether-sdk)
│   ├── cli/                     # Developer CLI tooling (@aether/cli)
│   └── ui/                      # Shared design system & primitives
├── crates/
│   ├── aether-core/             # Rust core kernel, event-sourced saga state machine
│   ├── aether-raft/             # Distributed Raft consensus coordination
│   ├── aether-wasm/             # Wasmtime sandboxing runtime for untrusted tools
│   └── aether-cli/              # Native Rust developer CLI
├── docs/                        # Architecture, API specifications, and launch blueprints
├── docker-compose.yml           # Complete local development backing services
└── turbo.json                   # Turborepo task pipeline definitions
```

---

## 3. Development Workflow & Branching

1. **Fork and Clone**: Fork the repository on GitHub and clone your fork locally.
2. **Branch from `main`**: Always create your feature or bugfix branch from the up-to-date `main` branch.
   - Feature branches: `feat/<issue-number>-<short-description>` (e.g. `feat/104-wasm-memory-caps`)
   - Bugfix branches: `fix/<issue-number>-<short-description>` (e.g. `fix/208-raft-heartbeat-timeout`)
   - Documentation: `docs/<short-description>`
3. **Keep Branches Rebased**: Before opening or finalizing a PR, rebase your branch onto `upstream/main` to ensure clean git histories without merge commits.

---

## 4. Commit Conventions

We strictly adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification. This allows automated changelog generation, semantic releases, and readable git histories.

Format: `<type>(<scope>): <subject>`

### Allowed Types:

- `feat`: A new user-facing feature or API capability.
- `fix`: A bug fix in existing behavior.
- `perf`: A code change that improves execution performance or reduces memory/latency.
- `docs`: Documentation changes only.
- `style`: Changes that do not affect code logic (formatting, missing semicolons).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Maintenance tasks, build system updates, or dependency bumps.

### Scopes:

- `core`, `raft`, `wasm`, `sdk-ts`, `sdk-py`, `api`, `console`, `docs`, `deps`

### Examples:

```bash
git commit -m "feat(core): implement event-sourced saga state fold"
git commit -m "fix(wasm): enforce 64MB memory limit in sandbox instance"
git commit -m "docs(api): document idempotency-key header requirements"
```

---

## 5. Code Quality & Linting Standards

All pull requests are validated via automated CI pipelines. You can run checks locally before committing:

### Rust Crates:

```bash
# Format check
cargo fmt --all -- --check

# Clippy linting (zero warnings permitted)
cargo clippy --workspace --all-targets -- -D warnings
```

### TypeScript & Apps:

```bash
# Linting across all workspace packages
pnpm lint

# Typechecking
pnpm typecheck

# Code formatting check
pnpm format:check
```

### Python SDK:

```bash
# Linting & formatting
ruff check packages/sdk-python
ruff format --check packages/sdk-python

# Strict typechecking
mypy --strict packages/sdk-python
```

---

## 6. Testing & Verification Gates

Quality assurance is not an afterthought in Aether. Every functional contribution must include corresponding tests:

- **Unit Tests**: Test behavior, edge cases, boundary values, and error paths.
- **Determinism Tests**: Verify that state machine rehydration from identical event sequences produces byte-identical states.
- **Security Sandboxing Tests**: Ensure that untrusted code cannot escape Wasmtime boundaries or execute unauthorized network calls.

```bash
# Run Rust workspace unit and integration tests
cargo test --workspace

# Run TypeScript SDK and app tests
pnpm test
```

---

## 7. Submitting a Pull Request

When your changes are ready:

1. Push your branch to your GitHub fork: `git push origin feat/my-new-feature`.
2. Open a Pull Request against the `main` branch of `aether-ai/aether`.
3. Fill out the provided **Pull Request Template**:
   - Provide a concise summary of the change.
   - Reference linked issues (`Closes #123`).
   - Detail verification methods and test outputs.
4. Ensure all GitHub Actions checks pass (build, lint, test, security audit).
5. A maintainer will review your PR within 48 hours.

---

## 8. Governance & RFC Process

Aether follows an open, meritocratic technical steering model:

### Technical Steering Committee (TSC)

The TSC oversees major architectural evolutions, core API standards, and release engineering.

### Request for Comments (RFC) Process

Significant architectural proposals—such as changes to event schemas, wire protocols, or security sandbox boundaries—must begin with an RFC:

1. Open an RFC issue using `.github/ISSUE_TEMPLATE/feature_request.yml`.
2. Draft an RFC specification in markdown detailing motivation, proposed API design, trade-offs, and migration paths.
3. The RFC is subject to a 14-day community review and discussion period prior to TSC voting.

---

## 9. Community & Communication

- **Discord**: Join our real-time developer community at [discord.gg/aether](https://discord.gg/aether) for architecture discussions and questions.
- **Discussions**: Use [GitHub Discussions](https://github.com/aether-ai/aether/discussions) for open-ended ideation and design feedback.
- **Code of Conduct**: All participants must abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [conduct@aether.run](mailto:conduct@aether.run).
