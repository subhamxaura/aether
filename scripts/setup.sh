#!/usr/bin/env bash
set -euo pipefail

echo "================================================================="
echo "   AETHER SOVEREIGN PLATFORM — 5-MINUTE BOOTSTRAP SCRIPT        "
echo "================================================================="

# 1. Dependency Checks
echo "[1/5] Checking host toolchain dependencies..."
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required (>=20.0.0). Aborting."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo >&2 "pnpm is required (>=9.0.0). Aborting."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo >&2 "Docker is required for local backing services. Aborting."; exit 1; }

echo "  -> Node: $(node --version)"
echo "  -> pnpm: $(pnpm --version)"
if type cargo >/dev/null 2>&1; then
  echo "  -> Cargo: $(cargo --version)"
  HAS_HOST_CARGO=true

else
  echo "  -> Cargo: [Host toolchain not detected; Rust builds will run via Docker container 'aether-engine']"
  HAS_HOST_CARGO=false
fi
echo "  -> Docker: $(docker --version)"

# 2. Environment Configuration
echo "[2/5] Initializing local environment configuration..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "  -> Copied .env.example to .env.local"
else
  echo "  -> .env.local already exists, skipping copy."
fi

# 3. Monorepo Package Dependencies
echo "[3/5] Installing monorepo dependencies with pnpm..."
pnpm install --frozen-lockfile || pnpm install

# 4. Cargo Workspace Build & Check
echo "[4/5] Verifying Rust workspace crates..."
if [ "$HAS_HOST_CARGO" = true ]; then
  cargo check --workspace
else
  echo "  -> Host cargo not found. Skipping local cargo check. Rust crates will be built automatically in Docker."
fi

# 5. Summary & Next Steps
echo "[5/5] Bootstrap complete!"
echo "================================================================="
echo "To start the full developer stack:"
echo "  1. docker compose up -d"
echo "  2. pnpm dev"
echo "================================================================="
