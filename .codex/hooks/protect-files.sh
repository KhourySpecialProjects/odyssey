#!/bin/bash
#
# protect-files.sh — PreToolUse hook for Claude Code
#
# WHAT IT DOES:
#   Intercepts every file write/edit tool call before it executes.
#   If the target file matches any protected pattern, the action is
#   blocked and Claude is told why. Claude cannot override this —
#   it runs outside the model's context at the tool layer.
#
# WHEN IT RUNS:
#   PreToolUse — fires before Write, Edit, or any tool that takes a
#   file_path/path argument. Configured in .claude/settings.json.
#
# EXIT CODES:
#   0 = allow the action
#   2 = block the action (Claude sees the stderr message as the reason)
#
# HOW TO ADD A NEW PROTECTION:
#   - To block by filename:  add a glob pattern to BASENAME_PATTERNS
#   - To block by full path: add a glob pattern to PATH_PATTERNS
#   Bash glob syntax applies (* = any chars, ? = one char).
#
# ─── Protected filename patterns (matched against basename only) ──────────────
#
#   Basename matching means "frontend/.env.local" and "backend/.env"
#   are both caught by ".env*" without needing to know the full path.
#
BASENAME_PATTERNS=(
    ".env*"                  # all environment files
    "docker-compose*.yml"    # Docker Compose configs
    "docker-compose*.yaml"
    "package-lock.json"      # lock files should not be hand-edited
    "pnpm-lock.yaml"
    "yarn.lock"
)

# ─── Protected path patterns (matched against the full file path) ─────────────
#
#   Use these when the directory matters, not just the filename.
#   e.g. "config.js" is fine in most places but not inside terraform/.
#
PATH_PATTERNS=(
    "terraform/*"                        # all terraform infra files
    "*/terraform/*"
    "*/.claude/settings.local.json"      # local Claude settings
)
# ─────────────────────────────────────────────────────────────────────────────

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

BASENAME=$(basename "$FILE_PATH")

for pattern in "${BASENAME_PATTERNS[@]}"; do
    if [[ "$BASENAME" == $pattern ]]; then
        echo "BLOCKED: '$FILE_PATH' matches protected basename pattern '$pattern'." >&2
        exit 2
    fi
done

for pattern in "${PATH_PATTERNS[@]}"; do
    if [[ "$FILE_PATH" == $pattern ]]; then
        echo "BLOCKED: '$FILE_PATH' matches protected path pattern '$pattern'." >&2
        exit 2
    fi
done

exit 0
