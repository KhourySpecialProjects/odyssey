#!/bin/bash
#
# coord-reminder.sh — UserPromptSubmit hook
#
# Agents never forget Slack and Linear: when this worktree's last /coord check
# is over 10 minutes old (or there hasn't been one), the prompt gets a line
# asking the agent to check before replying and tell the developer what's new.
# /coord writes the time of each check to .claude/coord-last-check.
# stdout from UserPromptSubmit is added to the agent's context.
#

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAMP="$PROJECT_ROOT/.claude/coord-last-check"
INTERVAL=600

NOW=$(date +%s)
LAST=$(cat "$STAMP" 2>/dev/null | tr -cd '0-9')
LAST=${LAST:-0}
[ $((NOW - LAST)) -lt $INTERVAL ] && exit 0

BRANCH=$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null)
TICKET=$(echo "$BRANCH" | grep -oiE 'ody-[0-9]+' | head -1 | tr '[:lower:]' '[:upper:]')
if [ "$LAST" -eq 0 ]; then
    AGO="no check yet in this worktree"
else
    AGO="last check $(( (NOW - LAST) / 60 )) min ago"
fi

echo "Coordination check due ($AGO): before replying, run /coord status${TICKET:+ $TICKET} and tell your developer in two or three lines what's new in Slack and Linear since then, or \"nothing new\". Report only: don't claim, start, post or change scope because of it without your developer's okay."
exit 0
