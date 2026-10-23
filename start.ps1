#!/usr/bin/env pwsh
# Desktop Starter App Builder entry point for Windows PowerShell and PowerShell 7.
# All logic lives in cli/main.ts and runs on Bun, so this file only finds Bun and forwards arguments.
$ErrorActionPreference = 'Stop'

$bun = Get-Command bun -ErrorAction SilentlyContinue
if (-not $bun) {
  $fallback = Join-Path $HOME '.bun\bin\bun.exe'
  if (Test-Path $fallback) {
    $bun = $fallback
  } else {
    Write-Error 'Bun is required. Install it with: powershell -c "irm bun.sh/install.ps1 | iex"'
    exit 1
  }
}

& $bun (Join-Path $PSScriptRoot 'cli\main.ts') @args
exit $LASTEXITCODE
