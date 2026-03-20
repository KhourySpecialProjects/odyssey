#!/bin/bash
#
# suggest-next.sh — SubagentStop hook for Claude Code
#
# After a subagent completes, suggests the next step based on
# what exists in docs/plans/ and git state.
#

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PLANS_DIR="$PROJECT_ROOT/docs/plans"

# Check for plan files that suggest where we are in the workflow
if [ -d "$PLANS_DIR" ]; then
    # Find the most recently modified plan file (ODY-342.md style, excludes PROGRESS.md and *-audit.md)
    LATEST_PLAN=$(ls -t "$PLANS_DIR"/*.md 2>/dev/null | grep -v "PROGRESS.md" | grep -v "\-audit\.md" | head -1)
    LATEST_AUDIT=$(ls -t "$PLANS_DIR"/*-audit.md 2>/dev/null | head -1)

    if [ -n "$LATEST_AUDIT" ] && [ -f "$LATEST_AUDIT" ]; then
        # Audit exists — check verdict
        VERDICT=$(grep -i "Verdict:" "$LATEST_AUDIT" 2>/dev/null | head -1)
        if [ -n "$VERDICT" ]; then
            if echo "$VERDICT" | grep -qi "BLOCK\|CONDITIONS"; then
                echo "Audit found issues. Use the implementer agent to fix them." >&2
            else
                echo "Audit passed. Ready to merge." >&2
            fi
        fi
    elif [ -n "$LATEST_PLAN" ] && [ -f "$LATEST_PLAN" ]; then
        # Plan exists — check if it has incomplete tasks
        INCOMPLETE=$(grep -c "^\- \[ \]" "$LATEST_PLAN" 2>/dev/null || echo "0")
        COMPLETE=$(grep -c "^\- \[x\]" "$LATEST_PLAN" 2>/dev/null || echo "0")

        if [ "$INCOMPLETE" -gt 0 ] && [ "$COMPLETE" -gt 0 ]; then
            echo "Implementation in progress ($COMPLETE done, $INCOMPLETE remaining)." >&2
            echo "Next: Continue with the implementer, or use the reviewer agent to review what's done so far." >&2
        elif [ "$INCOMPLETE" -gt 0 ] && [ "$COMPLETE" -eq 0 ]; then
            echo "Plan ready. Next: /implement $(basename "$LATEST_PLAN")" >&2
        elif [ "$INCOMPLETE" -eq 0 ] && [ "$COMPLETE" -gt 0 ]; then
            echo "All plan tasks complete. Next: Use the reviewer agent to review the changes." >&2
        fi
    fi
fi

exit 0
