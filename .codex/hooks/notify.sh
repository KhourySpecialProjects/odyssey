#!/bin/bash
#
# notify.sh — Notification hook for Claude Code
#
# Sends a macOS notification when Claude needs attention.
# Fires on: permission prompts, idle prompts, auth, elicitation dialogs.
#

osascript -e 'display notification "Claude Code needs your attention" with title "Claude Code" sound name "Ping"' 2>/dev/null

exit 0
