# AI review: prompt spike and eval (ODY-813)

Scores droplets against the review rubric with Claude, and measures how often
those scores agree with the client's. The prompt itself lives in
`lib/ai-review/prompt.ts` (`PROMPT_VERSION`), and Score with AI (ODY-814) runs
the same code.

Allowed models: `claude-sonnet-5-5` (default) and `claude-haiku-5-5`, set in
`lib/ai-review/models.ts`. Effort defaults to `high`.

Run everything from `frontend/`. Each script prints a cost estimate and asks
before sending anything (`--yes` skips the question). Content goes to
Anthropic, as it already does for fun facts and slide formatting.

## 1. Snapshot droplets

```bash
npx tsx --env-file=.env.local scripts/ai-review/snapshot.ts --droplet 123 --droplet intro-to-git
```

Saves `fixtures/<slug>.json` (the droplet frozen as it is now) and a blank
`fixtures/<slug>.scores.json`. Needs `NEXT_PUBLIC_STRAPI_API_URL` and
`STRAPI_ACCESS_TOKEN`. The droplet's old `afterReview` text is kept as
`previousReview`: the spike report shows it as an example of what the client
looks for, and it is never sent to the model.

## 2. Spike: show the client what the AI says

```bash
npx tsx --env-file=.env.local scripts/ai-review/spike.ts --droplet intro-to-git --droplet sql-basics
```

Writes `runs/<date>-spike-<model>-<effort>/report.md` with every score and
reason. Reword the rubric in `rubric.json` from the client's reactions (and
change its `version`), then bump `PROMPT_VERSION` if the prompt changes.

## 3. The client scores droplets

They fill in each `fixtures/<slug>.scores.json`: a 1–5 for every criterion,
for every lesson and for `overall`. Leave `rubricVersion` as written; it
records which wording they scored against. Set `"split": "holdout"` on 2–3
droplets and never tune the prompt against those.

## 4. Eval

```bash
npx tsx --env-file=.env.local scripts/ai-review/eval.ts
npx tsx --env-file=.env.local scripts/ai-review/eval.ts --model claude-haiku-5-5 --effort medium --runs 2
```

Uses every fixture with a complete score sheet, as one Message Batch at half
price (`--sync` sends them one by one instead). For each criterion it reports
exact agreement, agreement within one point, and AI minus client on average
(above 0: the AI scores high), for lessons and the Overall Score separately,
plus the biggest gaps. `--runs 2` adds run 1 against run 2: the noise floor.

Record the cost of each spike and eval run in the PR, and the baseline in
ODY-813.

`AI_REVIEW_FIXTURES_DIR` points the scripts at another fixtures folder.
