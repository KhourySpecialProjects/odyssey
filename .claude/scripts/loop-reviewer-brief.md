<!-- Fixed text. Builders pass the "Reviewer prompt" section to the reviewer subagent with the placeholders filled in. Never write your own reviewer prompt. -->

# Squad review loop (ODY-975)

A squad builds, checks and reviews its own work in one session. At most 3 reviews, then a human.

## How to run the loop (builder)

1. Build the ticket. Commit first, then run `bash scripts/ci-local.sh --agent`, so the SHA in its `checks:` line is the reviewed commit. It must pass before every review round and before the push.
2. Write the reviewer's inputs to files in your scratchpad, for example `$TMP/review-input/`:
   - `ticket.md`: the ticket text.
   - `plan.md`: the plan (or "no plan").
   - `diff.patch`: `git diff origin/develop...HEAD > $TMP/review-input/diff.patch`.
3. Start the reviewer with the Agent tool: `subagent_type: "reviewer"`, `model: "opus"`, prompt = the "Reviewer prompt" below, filled in. Effort is meant to be `medium`; the tool has no effort parameter. Don't add your own reasoning or summary to the prompt. The reviewer has no Bash, so it reads only those files and the repo.
4. Append the reply, unchanged, to `docs/reviews/ODY-<n>.md` under the heading `## Review <round>`. Commit it.
5. Read `verdict:`.
   - `ship`: stop. Push.
   - `fix`: fix each numbered blocking finding, or write `won't fix: <reason>` under it in the review file. Commit, rerun the checks (step 1), then go to step 2 with `{{ROUND}}` + 1 and `{{PREVIOUS_REVIEW}}` set to the whole review file.
6. After review 3, stop. Don't start a 4th review.
   - All blocking findings fixed and `verdict: ship`: push.
   - Open blocking findings, or a "won't fix" the reviewer re-raised: push anyway (a cloud session's work is lost when it ends). Set the card's risk to 🔴 and add a `Needs human:` section (see `review-card-brief.md`).
7. Push with the exact command in your brief, alone in its own tool call.
8. End with the branch, SHA, the `checks:` line unchanged, and `Reviews: n of 3 · last verdict <ship|fix>`.

If the Agent tool fails to start the reviewer, say so in your final message and stop after the push. The manager then chains Review and fix routines with the same cap.

The review file is part of the branch. The reviewer never edits it.

## Reviewer prompt

You are the reviewer for one ticket in the Odyssey repo. Use the checklist in your own agent definition (`.claude/agents/reviewer.md`) and the repo docs it points to.

Read only these files and the code they refer to:

- Ticket: `{{TICKET_FILE}}`
- Plan: `{{PLAN_FILE}}`
- Diff against `origin/develop`: `{{DIFF_FILE}}`

This is review round {{ROUND}} of 3.

Previous reviews and the builder's answers (empty in round 1):

{{PREVIOUS_REVIEW}}

Rules:

- Judge the diff only against the ticket, the plan and the checklist. Don't invent scope or ask for changes the ticket doesn't call for.
- A blocking finding is a bug, a broken acceptance criterion, a security or auth gap, a version-constraint violation, or a missing test for new behaviour. Everything else is a nit.
- You don't see how the builder reasoned. Judge the code.
- For each earlier `won't fix: <reason>`, say whether you accept it. If you don't, raise it again as a new blocking finding that quotes the reason.
- Don't edit files or run commands. Don't praise.

Reply in exactly this shape, with nothing before the first line:

```
verdict: ship | fix

Blocking:
1. <file:line> · <the problem> · Fix: <the smallest change that resolves it>
2. ...

Nits:
- <file:line> · <one line>
```

Use `verdict: ship` only when there are no blocking findings (write `Blocking: none`). Use `verdict: fix` otherwise.
