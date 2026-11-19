#!/usr/bin/env bash
# Opens the PRs for the Dependabot pipeline (.claude/commands/dependabot.md).
#
# For each review card on the newest claude/review-cards-dependabot-* branch, it:
#   - copies the card's claude/<name> branch to improvement/<name>, because
#     check-branches only accepts feature/, bug/, improvement/ or dependabot/
#     branches into develop;
#   - opens a PR into develop with the card's title and body;
#   - with --close, closes the Dependabot PR on the card's "Supersedes #N" line,
#     with a comment linking the new PR.
# It uses only GitHub's API, so a broken local clone doesn't matter.
# Agents never run it with --yes: opening and closing PRs is the developer's job.
#
#   bash .claude/scripts/dependabot-open-prs.sh                  # dry run
#   bash .claude/scripts/dependabot-open-prs.sh --yes            # open the PRs
#   bash .claude/scripts/dependabot-open-prs.sh --yes --close    # and close what they supersede
#   bash .claude/scripts/dependabot-open-prs.sh --cards claude/review-cards-dependabot-2026-11-17
#   bash .claude/scripts/dependabot-open-prs.sh --yes --reviewers JaylenZeng,AwadBuisir10
set -euo pipefail

R=KhourySpecialProjects/odyssey
YES=0
CLOSE=0
CARDS=""
REVIEWERS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --yes) YES=1 ;;
    --close) CLOSE=1 ;;
    --cards) CARDS="$2"; shift ;;
    --reviewers) REVIEWERS="$2"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

if [ -z "$CARDS" ]; then
  # Card branches carry the date in their name, so the last one sorted is the newest
  CARDS="$(gh api "repos/$R/branches?per_page=100" --paginate \
    --jq '.[].name | select(startswith("claude/review-cards-dependabot-"))' | sort | tail -1)"
fi
if [ -z "$CARDS" ]; then
  echo "No claude/review-cards-dependabot-* branch found."
  exit 0
fi
echo "Cards from $CARDS"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
footer=$'\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)'
opened=0
skipped=0

files="$(gh api "repos/$R/contents/review-cards?ref=$CARDS" --jq '.[] | select(.name | endswith(".md")) | .name')"
for file in $files; do
  name="${file%.md}"
  old="claude/$name"
  new="improvement/$name"

  if ! sha="$(gh api "repos/$R/branches/$old" --jq .commit.sha 2>/dev/null)"; then
    echo "skip  $name (no $old branch)"; skipped=$((skipped + 1)); continue
  fi
  if [ -n "$(gh pr list --repo "$R" --head "$new" --state all --json number --jq '.[].number')" ] ||
    [ -n "$(gh pr list --repo "$R" --head "$old" --state open --json number --jq '.[].number')" ]; then
    echo "skip  $name (already has a PR)"; skipped=$((skipped + 1)); continue
  fi

  gh api "repos/$R/contents/review-cards/$file?ref=$CARDS" -H 'Accept: application/vnd.github.raw' > "$tmp/card"
  title="$(sed -n '1s/^title: *//p' "$tmp/card")"
  { sed '1,/^---$/d' "$tmp/card"; printf '%s\n' "$footer"; } > "$tmp/body"
  supersedes="$(grep -o -m1 'Supersedes #[0-9]*' "$tmp/body" | tr -dc '0-9' || true)"
  if [ -z "$title" ]; then
    echo "skip  $name (card has no title line)"; skipped=$((skipped + 1)); continue
  fi

  if [ "$YES" -eq 0 ]; then
    echo "would open  $new @ ${sha:0:8}  \"$title\"${supersedes:+  (supersedes #$supersedes)}"
    continue
  fi

  if ! gh api "repos/$R/branches/$new" --jq .name > /dev/null 2>&1; then
    gh api "repos/$R/git/refs" -f ref="refs/heads/$new" -f sha="$sha" > /dev/null
  fi
  url="$(gh pr create --repo "$R" --base develop --head "$new" --title "$title" \
    --body-file "$tmp/body" ${REVIEWERS:+--reviewer "$REVIEWERS"})"
  echo "opened  $url  ($new @ ${sha:0:8})"
  opened=$((opened + 1))

  if [ "$CLOSE" -eq 1 ] && [ -n "$supersedes" ]; then
    state="$(gh api "repos/$R/pulls/$supersedes" --jq '"\(.state) \(.user.login)"')"
    if [ "$state" = "open dependabot[bot]" ]; then
      gh pr close "$supersedes" --repo "$R" --comment "Replaced by $url."
      echo "closed  #$supersedes"
    else
      echo "left    #$supersedes ($state)"
    fi
  fi
done

if [ "$YES" -eq 0 ]; then
  echo "Dry run. Add --yes to open these (and --close to close what they supersede)."
else
  echo "Opened $opened, skipped $skipped."
fi
