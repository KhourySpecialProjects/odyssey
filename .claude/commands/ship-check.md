---
disable-model-invocation: true
---

# Prepare Branch for PR

Run pre-ship checks and prepare a PR-ready summary for the current branch.

## Mode: $ARGUMENTS

If no mode specified, run full checks.

## Steps

### 1. Verify clean state

Run `git status` to check for uncommitted changes. If there are unstaged changes,
warn the human and ask whether to proceed or stop.

### 2. Run full CI

Run the same checks as `/ci full`:

```bash
bash scripts/ci-local.sh
```

If CI fails, show the failures and STOP. Do not proceed to PR preparation
with failing checks. Tell the human what needs fixing.

### 3. Gather branch context

```bash
git log --oneline production..HEAD
git diff --stat production..HEAD
```

Count files changed, insertions, deletions. Identify which areas were touched
(frontend components, request functions, Strapi schemas, tests, config).

### 3b. Check PR size

Measure the branch against the PR size budget in CLAUDE.md. Compare with the
branch the PR will target (usually `develop`; use the previous PR's branch for a
stacked PR):

```bash
git diff --numstat origin/develop...HEAD -- . \
  ':(exclude,glob)**/package-lock.json' ':(exclude,glob)**/yarn.lock' \
  ':(exclude,glob)**/documentation/**' ':(exclude,glob)**/types/generated/**' \
  ':(exclude,glob)**/__snapshots__/**' ':(exclude,glob)**/*.svg' ':(exclude,glob)**/*.md' \
  | awk '{ n = $1 + $2 }
    $3 ~ /(test|spec)s?[\/.]|\/tests?\/|testing\/|e2e\// { t += n; next }
    { c += n }
    END { printf "code %d, tests %d\n", c, t }'
```

- **Code ≤ 400:** within budget.
- **Code 401–1,000:** warn. If the plan has a PRs table, suggest the split it gives; otherwise propose one (backend, then frontend data, then UI).
- **Code > 1,000:** "Ready to push: NO" unless the human confirms an exception: a promotion PR (`develop` → `production`, or an integration branch whose ticket PRs were already reviewed), a mechanical change such as a rename, or a generated-file update.
- **Tests more than twice the code:** flag it. Point at "Keep tests lean" in `.claude/rules/testing.md` (copied cases, pasted data, the same rule tested at two layers).

### 4. Check for plan/spec

Look in `docs/plans/` for the active plan and spec files. Extract:

- The problem statement from the spec
- Acceptance criteria and their completion status from the plan
- Any audit verdict if an audit was run

### 5. Generate PR summary (the review card)

The PR body does CodeRabbit's job, because the free plan is too limited. Use
the same format as the manager's review cards, from
`.claude/scripts/review-card-brief.md`. Read that file first, then:

1. **Decide the kind.**
   - **`major`:** a new feature, or a revamp of a main flow (editing,
     publishing, review, the learner path).
   - **`feature`, `bug` or `cleanup`:** everything else. Bug fixes and small
     changes that don't change a main flow aren't worth studying.
2. **Decide the risk.**
   - 🔴 for a schema, auth, a `"use server"` export, env or secrets, or a data
     migration or deletion.
   - 🟡 when a user can see or do something different.
   - 🟢 for lint, copy, tests, types, or dead code.
3. **Write the body** in that file's format for the kind.
   - **A major** gets:
     - a Walkthrough;
     - a "Layer / Files | Summary" Changes table;
     - a Mermaid "How it flows" diagram;
     - review effort, merge risk, depends on, overlaps and suggested reviewers;
     - 3–6 "How to test on dev" steps;
     - the Checklist.
   - **A minor** gets one sentence, a **Careful:** line if it's 🔴, one
     **Test on dev:** step, overlaps, a suggested reviewer and the Checklist.
4. **Check overlaps.** Run `git diff --name-only origin/develop...<branch>` on
   other open branches, and use `gh pr list` if it works.
5. **Present it ready to copy.** Put the PR title first, then the body. Leave
   out the `title:`, `risk:` and `kind:` lines and the `---` line; those are
   only for `open-prs.sh`. Add no AI attribution line.

### 6. Final status

```
Ship Check
══════════
CI: ✓ All checks passed / ✗ [failures]
Branch: [branch name] — [N] commits ahead of production
Changes: [N] files changed (+[insertions] -[deletions])
Size: [code] code lines, [tests] test lines — within budget / over 400 / over 1,000
Plan: [plan file name] — [N/M] tasks complete
Audit: [verdict if exists, or "not audited"]

Ready to push: YES / NO — [reason if no]
```

If everything passes, tell the human: "Branch is ready. Push when you're ready."
Do NOT push — the human pushes manually per project policy.

Once the human says the PR is open, post a `[PR]` message with its link and the
tickets it unblocks to the team's Slack channel, `#prj-odyssey-agents` (see "Multi-Agent Development
Coordination" in `CLAUDE.md`).
