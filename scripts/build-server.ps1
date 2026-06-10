# PowerShell script to run TypeScript check and build the server
# Usage: .\scripts\build-server.ps1
# Requires PowerShell (Windows). Exits with non-zero code on failure.

param(
  [switch]$NoExit
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Resolve repo root (parent of this script's directory)
$repoRoot = (Resolve-Path -Path (Join-Path $PSScriptRoot '..')).Path

Push-Location -Path $repoRoot
try {
  Write-Host "Working directory: $PWD"

  Write-Host "`n1/2 - Running TypeScript check (no emit)..."

  # Run TypeScript check using server workspace to ensure correct dependencies are used.
  Write-Host "Running: cmd /c \"npx --prefix server tsc -p server/tsconfig.json --noEmit\""
  & cmd /c "npx --prefix server tsc -p server/tsconfig.json --noEmit"
  if ($LASTEXITCODE -ne 0) { throw "TypeScript check failed with exit code $LASTEXITCODE" }

  Write-Host "`n2/2 - Building server (nest build)..."
  Set-Location -Path (Join-Path $repoRoot 'server')
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE" }

  Write-Host "`n✅ Server build completed successfully."
} catch {
  Write-Error "`n❌ Build failed: $($_.Exception.Message)"
  if (-not $NoExit) { exit 1 } else { throw }
} finally {
  Pop-Location
}