#!/usr/bin/env bash
# Opens one PR against develop for each claude/ branch that has a review card.
# Cards live on the origin/claude/review-cards-* branches as
# review-cards/<branch-name-without-claude/>.md:
#   line 1  title: <PR title>
#   line 2  risk: <🟢|🟡|🔴 ...>
#   line 3  kind: <major|feature|bug|cleanup>   (optional)
#   then    ---
#   rest    the PR body
#
# A person runs this, not an agent: agents don't open PRs.
#
#   bash .claude/scripts/open-prs.sh                 # dry run: list what it would open
#   bash .claude/scripts/open-prs.sh --yes           # open them
#   bash .claude/scripts/open-prs.sh --yes --only 154,211
#   bash .claude/scripts/open-prs.sh --yes --reviewers bradycai,JaylenZeng
#
# Skips branches that already have a PR (open, closed or merged) and cards
# whose branch no longer exists on origin. Opens 🔴 first, then 🟡, then 🟢.

set -u
YES=0
ONLY=""
REVIEWERS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --yes) YES=1 ;;
    --only) ONLY="$2"; shift ;;
    --reviewers) REVIEWERS="$2"; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

command -v gh >/dev/null || { echo "needs the GitHub CLI (gh)" >&2; exit 1; }
git fetch --quiet origin || { echo "git fetch failed" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Collect cards: "<rank> <card-branch> <name>". When a branch has a card on
# more than one review-cards branch, the newest card branch wins.
for cb in $(git for-each-ref --sort=-committerdate --format='%(refname:short)' 'refs/remotes/origin/claude/review-cards-*'); do
  for f in $(git ls-tree --name-only "$cb" review-cards/ 2>/dev/null); do
    name="$(basename "$f" .md)"
    if [ -n "$ONLY" ]; then
      n="$(printf '%s' "$name" | sed -n 's/^ody-\([0-9]*\)-.*/\1/p')"
      case ",$ONLY," in *",$n,"*) ;; *) continue ;; esac
    fi
    risk="$(git show "$cb:$f" | sed -n '2p')"
    case "$risk" in *🔴*) rank=1 ;; *🟡*) rank=2 ;; *) rank=3 ;; esac
    echo "$rank $cb $name"
  done
done | awk '!seen[$3]++' | sort -n -k1,1 -k3,3 > "$TMP/cards"

[ -s "$TMP/cards" ] || { echo "No review cards found on origin/claude/review-cards-*."; exit 0; }

opened=0; skipped=0
while read -r rank cb name; do
  branch="claude/$name"
  card="$TMP/$name.md"
  git show "$cb:review-cards/$name.md" > "$card"
  title="$(sed -n '1s/^title: *//p' "$card")"
  risk="$(sed -n '2s/^risk: *//p' "$card")"
  # Body: everything after the first line that is exactly ---. Lines that
  # start with a bold label ("**Overlaps:** ...") get a blank line before
  # them, so GitHub shows each on its own line instead of one paragraph.
  awk 'f { if ($0 ~ /^\*\*[^*]+:\*\*/ && prev != "") print ""; print; prev = $0 }
       /^---$/ && !f { f = 1 }' "$card" > "$card.body"

  if ! git rev-parse --verify --quiet "refs/remotes/origin/$branch" >/dev/null; then
    echo "skip  $branch (no such branch on origin)"; skipped=$((skipped + 1)); continue
  fi
  if [ -z "$title" ] || [ ! -s "$card.body" ]; then
    echo "skip  $branch (card is missing its title or body)"; skipped=$((skipped + 1)); continue
  fi
  existing="$(gh pr list --head "$branch" --state all --json number --jq '.[0].number' 2>/dev/null)"
  if [ -n "$existing" ]; then
    echo "skip  $branch (already PR #$existing)"; skipped=$((skipped + 1)); continue
  fi

  if [ "$YES" -eq 0 ]; then
    echo "would $risk  $branch  \"$title\""
    continue
  fi
  args=(--base develop --head "$branch" --title "$title" --body-file "$card.body")
  [ -n "$REVIEWERS" ] && args+=(--reviewer "$REVIEWERS")
  if url="$(gh pr create "${args[@]}" 2>&1)"; then
    echo "open  $risk  $url"; opened=$((opened + 1))
  else
    echo "FAIL  $branch: $url"
  fi
done < "$TMP/cards"

if [ "$YES" -eq 0 ]; then
  echo; echo "Dry run. Add --yes to open these PRs."
else
  echo; echo "Opened $opened, skipped $skipped."
fi
