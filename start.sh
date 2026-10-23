#!/usr/bin/env bash
# Desktop Starter App Builder entry point for Bash (macOS, Linux, Git Bash on Windows, WSL).
# All logic lives in cli/main.ts and runs on Bun, so this file only finds Bun and forwards arguments.
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# `bootstrap` installs the prerequisites (Bun included), so it runs before Bun is required.
# It detects the machine: Windows (Git Bash, winget), macOS (Homebrew) or Linux (apt, dnf, pacman).
if [[ "${1:-}" == "bootstrap" ]]; then
  shift
  exec bash "$ROOT/scripts/bootstrap.sh" "$@"
fi

if ! command -v bun >/dev/null 2>&1; then
  if [[ -x "$HOME/.bun/bin/bun" ]]; then
    export PATH="$HOME/.bun/bin:$PATH"
  else
    echo "error: Bun is required. Run: bash start.sh bootstrap   (installs Bun and the other prerequisites after asking)" >&2
    exit 1
  fi
fi

exec bun "$ROOT/cli/main.ts" "$@"
