#!/bin/bash
#
# audit-bash.sh — PostToolUse hook for Bash commands
#
# Logs all Bash commands executed by Claude to an audit file.
# Useful for reviewing what Claude did during a session.
#
# Output: appends to .claude/bash-audit.log (gitignored)
#

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUDIT_LOG="$PROJECT_ROOT/.claude/bash-audit.log"

# Read JSON from stdin (hooks receive event data on stdin, not env vars)
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -n "$COMMAND" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $COMMAND" >> "$AUDIT_LOG"
fi

exit 0
