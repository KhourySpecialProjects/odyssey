#!/bin/bash
#
# session-start.sh — Setup hook for Claude Code
#
# Runs at session start. Verifies clean baseline and injects context.
# IMPORTANT: stdout from SessionStart is added to Claude's context.
# Use stdout for context injection, stderr for warnings to the user.
#

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

ISSUES=""

# ─── Check Docker is running ──────────────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
    ISSUES="${ISSUES}\nWARNING: Docker is not running. Start Docker Desktop or run: docker-compose up -d"
fi

# ─── Check for incomplete plans ───────────────────────────────────────
INCOMPLETE_PLANS=$([ -d "$PROJECT_ROOT/docs/plans" ] && grep -rl "^\- \[ \]" "$PROJECT_ROOT/docs/plans/"*.md 2>/dev/null | wc -l | tr -d ' ' || echo "0")
if [ "$INCOMPLETE_PLANS" -gt 0 ]; then
    ISSUES="${ISSUES}\nWARNING: $INCOMPLETE_PLANS plan file(s) in docs/plans/ have incomplete tasks. Resume or start fresh."
fi

# ─── Report warnings to user (stderr) ────────────────────────────────
if [ -n "$ISSUES" ]; then
    echo "Session baseline check:" >&2
    echo -e "$ISSUES" >&2
    echo "" >&2
fi

# ─── Inject context into Claude's session (stdout) ───────────────────
# Claude sees this as additional context at session start.
BRANCH=$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo "unknown")
RECENT_COMMITS=$(cd "$PROJECT_ROOT" && git log --oneline -3 2>/dev/null || echo "no git history")
CHANGED_FILES=$(cd "$PROJECT_ROOT" && git diff --stat HEAD 2>/dev/null | tail -1 || echo "no changes")

# Check for active plan files
ACTIVE_PLAN=""
if [ -d "$PROJECT_ROOT/docs/plans" ]; then
    LATEST_PLAN=$(ls -t "$PROJECT_ROOT/docs/plans/"*-plan.md 2>/dev/null | head -1)
    if [ -n "$LATEST_PLAN" ]; then
        PLAN_NAME=$(basename "$LATEST_PLAN")
        INCOMPLETE=$(grep -c "^\- \[ \]" "$LATEST_PLAN" 2>/dev/null || echo "0")
        COMPLETE=$(grep -c "^\- \[x\]" "$LATEST_PLAN" 2>/dev/null || echo "0")
        ACTIVE_PLAN="Active plan: $PLAN_NAME ($COMPLETE done, $INCOMPLETE remaining)"
    fi
fi

# ─── Check for progress file from previous session ───────────────────
PROGRESS_FILE="$PROJECT_ROOT/docs/plans/PROGRESS.md"
PROGRESS_CONTEXT=""
if [ -f "$PROGRESS_FILE" ]; then
    PROGRESS_CONTEXT=$(cat "$PROGRESS_FILE")
    echo "Previous session left a progress file. Read docs/plans/PROGRESS.md to continue where it left off." >&2
fi

cat <<EOF
Session context:
- Branch: $BRANCH
- Recent commits: $RECENT_COMMITS
- Working tree: $CHANGED_FILES
${ACTIVE_PLAN:+- $ACTIVE_PLAN}
${PROGRESS_CONTEXT:+
Previous session progress:
$PROGRESS_CONTEXT}
EOF

exit 0
