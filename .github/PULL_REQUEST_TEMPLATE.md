## Description

<!-- Provide a concise summary of the changes made and the motivation behind them. -->

Fixes #(issue)

## Type of Change

- [ ] `feat`: New feature or capability
- [ ] `fix`: Bug fix
- [ ] `perf`: Performance optimization
- [ ] `refactor`: Code refactoring without behavior modification
- [ ] `docs`: Documentation improvement
- [ ] `test`: New or updated tests
- [ ] `chore`: Build system, CI, or dependency updates

## Architectural & Security Impact

- [ ] Does this change affect the 4-plane topology or wire protocols?
- [ ] Does this change modify database schemas or partition layouts?
- [ ] Are sandbox boundaries (Wasmtime / Firecracker / eBPF) respected?
- [ ] Does this change introduce new dependencies?

## Verification & Testing

<!-- Detail the steps taken to verify these changes. Provide command outputs or test runs. -->

- [ ] `cargo test --workspace` passes cleanly
- [ ] `cargo clippy --workspace --all-targets -- -D warnings` has 0 warnings
- [ ] `pnpm test` and `pnpm lint` pass cleanly
- [ ] Deterministic replay verification passes across event logs

## Checklist

- [ ] My code adheres to the style and conventions defined in `CONTRIBUTING.md`.
- [ ] I have added descriptive unit or integration tests covering my changes.
- [ ] I have updated relevant documentation in `docs/` if appropriate.
- [ ] I have verified that no sensitive credentials, tokens, or PII are committed.
