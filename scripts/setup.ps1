# ==============================================================================
# AETHER SOVEREIGN PLATFORM - WINDOWS POWERSHELL BOOTSTRAP SCRIPT
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   AETHER SOVEREIGN PLATFORM - 5-MINUTE BOOTSTRAP SCRIPT (PWSH)  " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Dependency Checks
Write-Host "[1/5] Checking host toolchain dependencies..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required (>=20.0.0). Aborting."
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Error "pnpm is required (>=9.0.0). Aborting."
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is required for local backing services. Aborting."
}

Write-Host "  -> Node: $(node --version)"
Write-Host "  -> pnpm: $(pnpm --version)"
if (Get-Command cargo -ErrorAction SilentlyContinue) {
    Write-Host "  -> Cargo: $(cargo --version)"
    $hasCargo = $true
} else {
    Write-Host "  -> Cargo: [Host toolchain not detected; Rust builds will run via Docker container 'aether-engine']" -ForegroundColor Gray
    $hasCargo = $false
}
Write-Host "  -> Docker: $(docker --version)"

# 2. Environment Configuration
Write-Host "[2/5] Initializing local environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Host "  -> Copied .env.example to .env.local" -ForegroundColor Green
} else {
    Write-Host "  -> .env.local already exists, skipping copy."
}

# 3. Monorepo Package Dependencies
Write-Host "[3/5] Installing monorepo dependencies with pnpm..." -ForegroundColor Yellow
pnpm install

# 4. Cargo Workspace Build & Check
Write-Host "[4/5] Verifying Rust workspace crates..." -ForegroundColor Yellow
if ($hasCargo) {
    cargo check --workspace
} else {
    Write-Host "  -> Host cargo not found. Skipping local cargo check. Rust crates will be built automatically in Docker." -ForegroundColor Gray
}

# 5. Summary & Next Steps
Write-Host "[5/5] Bootstrap complete!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "To start the full developer stack:"
Write-Host "  1. docker compose up -d"
Write-Host "  2. pnpm dev"
Write-Host "=================================================================" -ForegroundColor Cyan
