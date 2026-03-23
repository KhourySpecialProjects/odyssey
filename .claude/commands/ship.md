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

### 4. Check for plan/spec

Look in `docs/plans/` for the active plan and spec files. Extract:

- The problem statement from the spec
- Acceptance criteria and their completion status from the plan
- Any audit verdict if an audit was run

### 5. Generate PR summary

Present a ready-to-copy PR description:

```markdown
## Summary

- [1-3 bullet points from the spec/plan]

## Changes

- [Categorized file changes: frontend, backend, tests, config]

## Acceptance Criteria

- [x] [Each criterion from the spec, checked if met]

## Test Plan

- [ ] CI passes locally (Prettier, ESLint, Jest, builds)
- [ ] [Additional test steps based on what changed]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 6. Final status

```
Ship Check
══════════
CI: ✓ All checks passed / ✗ [failures]
Branch: [branch name] — [N] commits ahead of production
Changes: [N] files changed (+[insertions] -[deletions])
Plan: [plan file name] — [N/M] tasks complete
Audit: [verdict if exists, or "not audited"]

Ready to push: YES / NO — [reason if no]
```

If everything passes, tell the human: "Branch is ready. Push when you're ready."
Do NOT push — the human pushes manually per project policy.
