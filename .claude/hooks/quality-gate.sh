#!/bin/bash
#
# quality-gate.sh — Stop hook for Claude Code
#
# Runs after every agent turn. Auto-fixes formatting on changed files.
# ESLint is NOT run here — the frontend/root ESLint version mismatch
# causes plugin resolution errors. Lint is checked by `npm run lint` in CI.
# Exit code 0 = let the agent proceed.
#

set -eo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# ─── Collect changed files (staged + unstaged + untracked) ───────────
cd "$PROJECT_ROOT"

CHANGED_FILES=$({
    git diff --name-only HEAD 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
} | sort -u | while read -r f; do [ -f "$f" ] && echo "$f"; done)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

# ─── Prettier (auto-fix) ─────────────────────────────────────────────
echo "$CHANGED_FILES" | xargs npx prettier --write 2>/dev/null || true

exit 0
