<!-- Brief for a cloud run that writes review cards. Replace {{BRANCHES}}, {{GROUP}} and {{GROUP_LABEL}} before pasting it. /ship uses the two "Format" sections for PRs opened by hand. -->

You write pull-request bodies ("review cards") for already-pushed branches of the Odyssey repo (Next.js 15 frontend + Strapi v5 backend). They replace CodeRabbit's PR summaries, so the team can review fast. You do NOT change any branch's code. Your only output is a set of Markdown files on one new branch.

Your branches (each is `origin/claude/<name>`, compare against `origin/develop`), with their kind already decided:
{{BRANCHES}}

Kinds: `major` = a new feature or a revamp of a main flow (full breakdown). `feature`, `bug`, `cleanup` = minor (one sentence). Don't change a branch's kind. If you think one is wrong, say so in your final message.

## Steps

1. `git fetch origin` once.
2. For each branch, read:
   - `git log --format='%h %an %s' origin/develop..origin/claude/<name>`
   - `git diff --stat origin/develop...origin/claude/<name>`
   - the full diff (`git diff origin/develop...origin/claude/<name>`)
   - any older card for the branch: run `git ls-tree -r --name-only <b> review-cards/` on each `origin/claude/review-cards-*` branch `<b>`. If you find `review-cards/<name>.md`, its "How to test on dev" steps are a good start: keep them, trimmed.
   - For major branches, also read surrounding code (`git show origin/claude/<name>:<path>`) until you can describe the flow correctly.
3. **Overlaps.** Run `git diff --name-only origin/develop...origin/claude/<x>` for EVERY `origin/claude/*` branch (skip `-plan` and `review-cards-*` branches and `claude/integration-*`). Note which branches touch the same files, and when one branch is stacked on another (its log contains the other's commits). Also run `gh pr list --state open --json number,title,headRefName,files` if `gh` works. If it doesn't, skip it.
4. Write one file per branch, `review-cards/<name>.md`, in the format for its kind (below).
5. Create branch `claude/review-cards-{{GROUP}}` from `origin/develop` and add only the `review-cards/` files. Commit with exactly:
   `git -c user.name=ABuisir10 -c user.email=Buisir.a@northeastern.edu commit -m "Review cards for {{GROUP_LABEL}}"`
   Add no Co-Authored-By or any other trailer.
6. Push with a Bash command that is exactly `git push -u origin claude/review-cards-{{GROUP}}`. Put it alone in its own tool call, with no `cd`, `&&`, `;` or pipe, because a repo hook blocks anything else. Never use git stash, rebase, merge or force-push.

## Format for `major` (the first three lines are parsed by a script: copy them exactly)

````
title: <plain-English PR title, <= 80 chars, ending with (ODY-<n>)>
risk: <one of: 🟢 skim | 🟡 test on dev | 🔴 careful>
kind: major
---
## Walkthrough

<2–3 plain sentences, high level: what a user can now do or what works differently, who sees it (learners, creators, reviewers, admins) and where in the app.>

## Changes

| Layer / Files | Summary |
| --- | --- |
| **<Layer name, e.g. "Delete action and permission check">**<br>`path/a.ts`, `path/b.tsx` | <One step below the walkthrough: what this part does and why, 1–3 sentences.> |

(3–6 rows. Group files by what they do, not one row per file. Put test files in the row they test.)

## How it flows

```mermaid
sequenceDiagram
  participant U as Creator
  participant P as Page
  participant S as Server action
  participant API as Strapi
  U->>P: clicks Delete draft
  ...
```

(One diagram of the main path, 4–7 participants, using real function and route names from the diff. Use `flowchart TD` instead if there's no request or response, e.g. a state change in the UI. The diagram must be valid Mermaid: no parentheses or quotes in participant aliases, and no semicolons.)

**Estimated review effort:** <1–5> (<Trivial | Simple | Moderate | Complex | Very complex>) · ~<N> minutes
**Merge risk:** <Low | Medium | High>. <Why, in one sentence: what could break, and for whom.>
**Depends on:** <branch, or "nothing">
**Overlaps:** <other `claude/` branches or open PRs (#n) touching the same files, and which file; or "none">
**Suggested reviewers:** <one or two of `AwadBuisir10`, `JaylenZeng`, `bradycai`. Brady owns streaks, enrollment and header. Jaylen owns Mentor, AI review/Score with AI, and ESLint config. Awad owns everything else.>
<Open decisions, stubs, migrations or behaviour changes a reviewer must know, if any, as one **Note:** line each.>

## How to test on dev

1. <step> → <expected result>
(3–6 steps)

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [ ] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
````

## Format for `feature`, `bug` and `cleanup` (minor)

```
title: <plain-English PR title, <= 80 chars, ending with (ODY-<n>)>
risk: <one of: 🟢 skim | 🟡 test on dev | 🔴 careful>
kind: <feature | bug | cleanup>
---
<One plain sentence: what changed and where a user notices it. For a bug, say what was wrong and what happens now.>

**Careful:** <only when risk is 🔴: what to look at closely (the auth check, the schema field, the secret handling) in one sentence. Otherwise leave this line out.>
**Test on dev:** <one step → expected result. For cleanup: "CI covers it, no behaviour change.">
**Overlaps:** <other `claude/` branches or open PRs touching the same files, and which file; or "none">
**Suggested reviewer:** <one login, by the same ownership rules>

## Checklist

(the same 7 checklist lines as above)
```

**Checklist rules.** Tick (`[x]`) ONLY two boxes, and only when they apply:

- "I have added tests" when the branch adds or changes test files.
- The `"use server"` box when either no `"use server"` file changed, or every new or changed export in one calls `requireRole`/`withAuth`/`assertOwner` or is listed in `frontend/testing/security/server-action-auth-allowlist.ts`.

If a changed `"use server"` export is unguarded, leave that box unticked and say so in a **Note:** or **Careful:** line. Leave every other box unticked, because a person ticks them. The one exception: tick "updated the documentation" if docs changed.

**Risk rules.**

- 🔴 if it touches a Strapi schema, auth, a `"use server"` export, env or secrets, a data migration or a deletion.
- 🟡 if a user can see or do something different.
- 🟢 for lint, copy-only, tests-only, types, or dead-code removal with no behaviour change.

**Writing rules.**

- Short plain sentences.
- No jargon a new teammate wouldn't know, and no hype.
- No Claude or AI attribution anywhere.
- Never paste secrets or `.env` values. If a diff contains something that looks like a secret, write "removes a hard-coded value" and nothing more.
- Don't invent ticket details you can't see in the code or commits.

## Final message

Keep it short, because the log keeps only about 4,000 characters:

- the branch name you pushed and the commit SHA;
- one line per card, `<name> · <kind> · <risk emoji> · <title>`;
- any branch you couldn't write a card for, and why;
- any kind you think is wrong.
