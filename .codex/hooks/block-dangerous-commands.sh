#!/bin/bash
#
# block-dangerous-commands.sh — PreToolUse hook for Bash commands
#
# Blocks dangerous shell commands before they execute.
# Exit code 2 = block the command (Claude sees stderr as reason).
# Exit code 0 = allow.
#
# Git policy: local worktrees are allowed (managed by isolation: worktree).
# All remote operations (push, remote branch creation) are blocked.
# Manual git worktree commands are blocked — only the framework should manage worktrees.
#

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
    exit 0
fi

# Dangerous patterns to block
PATTERNS=(
    'rm\s+-rf\s+/'
    'rm\s+-rf\s+\*'
    'mkfs\.'
    'dd\s+if='
    'chmod\s+-R\s+777\s+/'
    'curl.*\|\s*bash'
    'curl.*\|\s*sh'
    'wget.*\|\s*bash'
    'wget.*\|\s*sh'
    '>\s*/dev/sd[a-z]'
    'git\s+push'
    'git\s+remote'
    'git\s+branch\s+-[dD]'
    'git\s+merge'
    'git\s+rebase'
    'git\s+reset\s+--hard'
    'git\s+stash\s+drop'
    'git\s+worktree'
    'npm\s+publish'
)

for pattern in "${PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qE "$pattern"; then
        echo "BLOCKED: Command matches dangerous pattern '$pattern'." >&2
        echo "This command is not allowed in Odyssey's Claude Code environment." >&2
        echo "Git worktrees are managed automatically via isolation: worktree — do not run git worktree commands directly." >&2
        exit 2
    fi
done

exit 0
