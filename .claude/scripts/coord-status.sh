#!/bin/bash
#
# coord-status.sh — has a ticket's work reached develop?
#
# Usage: .claude/scripts/coord-status.sh ODY-795 [ODY-794 ...]
#        .claude/scripts/coord-status.sh --wait ODY-795 [ODY-794 ...]
#
# --wait checks every 60 s, printing nothing, and exits as soon as every
# ticket is ON DEVELOP (0), or after 8 hours (3). /coord watch runs it in the
# background, so an agent hears about a merge within a minute at no cost.
#
# For each ticket, lists every PR whose title or branch names it, with its
# state and base, and whether its merge commit is on origin/develop. A PR
# merged into another feature branch (a stacked PR) counts only once that
# branch reaches develop. Ends with one line per ticket:
#   ON DEVELOP <sha>  every PR is merged and on develop
#   NOT YET           a PR is open, or merged but not on develop yet
#   NO PRS            no PR names the ticket
# Exit status: 0 if every ticket is ON DEVELOP, 1 otherwise.
#
# Linear's "blocked by" and the Slack thread are read by /coord, not here.

set -u
if [ "${1:-}" = "--wait" ]; then
  shift
  [ $# -gt 0 ] || { echo "usage: $0 --wait ODY-123 [ODY-456 ...]" >&2; exit 2; }
  deadline=$(( $(date +%s) + 8 * 3600 ))
  while :; do
    if out=$("$0" "$@" 2>&1); then
      echo "$out"
      exit 0
    fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "$out"
      echo "Gave up after 8 hours."
      exit 3
    fi
    sleep 60
  done
fi
[ $# -gt 0 ] || { echo "usage: $0 ODY-123 [ODY-456 ...]" >&2; exit 2; }

git fetch -q origin develop 2>/dev/null || echo "warning: couldn't fetch origin/develop; using the local copy" >&2

# True when $1 is reachable from origin/develop
on_develop() {
  git cat-file -e "$1^{commit}" 2>/dev/null || git fetch -q origin "$1" 2>/dev/null
  git cat-file -e "$1^{commit}" 2>/dev/null || return 1
  [ -z "$(git rev-list -1 "$1" --not origin/develop 2>/dev/null)" ]
}

all_ready=0
summary=""
for raw in "$@"; do
  ticket=$(echo "$raw" | tr '[:lower:]' '[:upper:]')
  lower=$(echo "$ticket" | tr '[:upper:]' '[:lower:]')
  prs=$(gh pr list --state all --limit 50 --search "$ticket in:title" \
          --json number,state,baseRefName,headRefName,mergeCommit,title \
          --jq '.[] | [.number, .state, .baseRefName, .headRefName, (.mergeCommit.oid // "-"), .title] | @tsv' 2>/dev/null)
  # Branch names too: a PR titled without the ticket id still counts
  by_branch=$(gh pr list --state all --limit 50 --search "head:$lower" \
          --json number,state,baseRefName,headRefName,mergeCommit,title \
          --jq '.[] | [.number, .state, .baseRefName, .headRefName, (.mergeCommit.oid // "-"), .title] | @tsv' 2>/dev/null)
  rows=$(printf '%s\n%s\n' "$prs" "$by_branch" | grep -v '^$' | sort -u -t$'\t' -k1,1n)

  echo "== $ticket"
  if [ -z "$rows" ]; then
    summary="${summary}${ticket}: NO PRS\n"
    all_ready=1
    continue
  fi

  verdict="ON DEVELOP"
  latest=""
  while IFS=$'\t' read -r num state base head merge title; do
    where="-"
    if [ "$state" = "MERGED" ]; then
      if on_develop "$merge"; then
        where="on develop"
        latest=$merge
      else
        where="NOT on develop (merged into $base)"
        verdict="NOT YET"
      fi
    elif [ "$state" = "OPEN" ]; then
      where="open → $base"
      verdict="NOT YET"
    else
      where="closed unmerged"
    fi
    printf '  #%s %-6s %s  %s\n' "$num" "$state" "$where" "${title:0:80}"
  done <<< "$rows"

  if [ "$verdict" = "ON DEVELOP" ] && [ -z "$latest" ]; then
    verdict="NOT YET" # only closed-unmerged PRs
  fi
  [ "$verdict" = "ON DEVELOP" ] || all_ready=1
  summary="${summary}${ticket}: ${verdict}${latest:+ ${latest:0:8}}\n"
done

echo
printf '%b' "$summary"
exit $all_ready
