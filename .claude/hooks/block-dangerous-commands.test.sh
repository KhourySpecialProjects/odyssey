#!/bin/bash
#
# Tests for block-dangerous-commands.sh: what a cloud session may push.
# Run: bash .claude/hooks/block-dangerous-commands.test.sh
#

HOOK="$(dirname "$0")/block-dangerous-commands.sh"
FAIL=0

run() { # run <remote true|false> <command>; prints the hook's exit code
    local remote="$1" cmd="$2"
    jq -n --arg c "$cmd" '{tool_input: {command: $c}}' |
        CLAUDE_CODE_REMOTE="$remote" bash "$HOOK" 2>/dev/null
    echo $?
}

expect() { # expect <exit code> <remote> <command>
    local want="$1" remote="$2" cmd="$3" got
    got=$(run "$remote" "$cmd")
    if [ "$got" != "$want" ]; then
        echo "FAIL (want $want, got $got, remote=$remote): $cmd"
        FAIL=1
    fi
}

# A cloud session may push its own claude/ branch
expect 0 true 'git push -u origin claude/ody-527-tailwind-classes'
expect 0 true 'git push origin claude/ody-527-tailwind-classes'
expect 0 true 'git push --set-upstream origin claude/fix.v2'
expect 0 true 'git push origin HEAD:claude/ody-527'

# ...and nothing else
expect 2 true 'git push origin develop'
expect 2 true 'git push origin production'
expect 2 true 'git push origin claude/x:develop'
expect 2 true 'git push -f origin claude/x'
expect 2 true 'git push --force origin claude/x'
expect 2 true 'git push origin claude/x --force'
expect 2 true 'git push origin claude/x && git push origin develop'
expect 2 true 'git push origin claude/x; rm -rf /'
expect 2 true 'git push upstream claude/x'
expect 2 true 'git push --all origin'
expect 2 true 'git push origin :claude/x'
expect 2 true $'git push origin claude/x\ngit push origin develop'
expect 2 true 'git push --delete origin claude/x'

# Outside a cloud session every push is still blocked
expect 2 false 'git push -u origin claude/ody-527-tailwind-classes'
expect 2 "" 'git push origin claude/x'

# Other rules are unchanged
expect 2 true 'git merge develop'
expect 2 true 'git worktree add ../x'
expect 0 true 'git status'
expect 0 false 'npm test'

if [ "$FAIL" = 0 ]; then echo "All hook tests passed"; else exit 1; fi
