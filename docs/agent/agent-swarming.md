# Agent Swarming: Which Model and Effort for Which Job

This guide sets how we split Odyssey work across Opus 5.5, Sonnet 5.5 and
Haiku 5.5 agents, what effort level each one runs at, and where each one
runs. Building, testing and reviewing all happen in cloud sessions (Claude
Code on the web), so a laptop only has to run the Manager. It's based on
Anthropic's published model and effort guidance (sources at the end) and on
what we've seen running agents on this repo.

## The rule that decides everything

Anthropic measured setups where a stronger model plans and hands work to
cheaper models. The split pays off only when there's **bulk to hand off**:
many independent pieces. When the work is one chain of dependent steps, or
fits in one agent's context, a single agent at a lower effort level did
better and cost less, in every case they measured.

Every handoff costs something:

- **A brief:** the worker knows only what you tell it.
- **A cold start:** a subagent shares no prompt cache with its parent.
- **A merge:** someone has to check and combine the results.

So **size the swarm by the number of independent pieces**, never by a fixed
headcount. Adding a button is one chain: read the component, edit it, run its
test, run lint. That's one agent and no swarm. Five Haiku agents would spend
more on briefs and merging than on the button itself.

## The hierarchy

```
Owner (in Slack)
 └─ Manager ............. Opus 5.5, medium       LOCAL: Slack + starts cloud routines
     ├─ Watcher ......... Haiku 5.5, low         LOCAL: headless check every 60s
     └─ Cloud routines, one session each:
         ├─ Plan ........ Opus 5.5, high         one per feature that needs a plan
         ├─ Squad ....... Sonnet 5.5, medium     one per ticket, pushes claude/ody-<n>-…
         │   └─ Workers   Haiku 5.5, low/medium  0–5 subagents inside the squad's session
         ├─ Review ...... Opus 5.5, medium       one per pushed branch, read-only
         └─ Audit ....... Opus 5.5, high         once per branch, before merge
```

Each cloud routine is its own session, in its own container, with its own
copy of the repo and its own `npm ci`. Running five squads in the cloud costs
the laptop nothing.

The Plan, Review and Audit routines are the **Leads**. Keep at most 1–3 of
them running at once.

### Why the Manager stays on a laptop

- **Slack:** the Slack connection is set up in local Claude Code. Cloud
  routines can use only claude.ai connectors, and ours has only Claude Docs
  connected.
- **Starting routines:** the Manager starts and reads cloud routines with
  Claude Code's `RemoteTrigger` tool. We haven't confirmed that a cloud
  session can start other routines.
- **Timing:** a scheduled routine can run at most once an hour, and the
  Watcher checks every 60 seconds.
- **Load:** the Manager never builds or tests anything, so it's light.

To move it to the cloud later, three things are needed:

1. Connect Slack at <https://claude.ai/customize/connectors>.
2. Accept hourly checks.
3. Confirm that a cloud session can start routines.

### Manager: Opus 5.5 at `medium` (local)

- **Does:**
  - turns the owner's requests into tickets;
  - picks a route for each ticket (see the table below) and asks for
    approval;
  - writes each routine's brief, then starts and reads the routines;
  - reports back in Slack.
- **Why Opus:** a bad split or a wrong route repeats in every agent below it.
- **Why `medium`:** that's Opus 5.5's default, and most of the Manager's
  turns are routing and status. For that kind of work, Anthropic's
  measurements show `high` buys almost nothing over `medium`. Raise it to
  `high` only for a triage that splits a feature into tickets.
- **Doesn't:** write code, run tests or poll Slack.

### Watcher: Haiku 5.5 at `low` (local)

- **Does:** reads Slack every 60 seconds. Each check is a separate
  headless Haiku session at `low` effort:

  ```
  claude -p --model haiku --effort low --no-session-persistence
  ```

  The session reads the channel and the tracked threads, and prints only
  message IDs, never message text. A shell loop prints one line per new
  message, and the Manager watches that output with Claude Code's `Monitor`
  tool. The Manager therefore wakes only for real messages, plus once every
  30 minutes to restart the monitor. It then reads each new message itself.

- **Why not a timer in the Manager's session:** a timer wakes the Opus
  Manager on every check. On 2026-11-09 and 10 the Manager ran about 50
  checks that way, almost all of which found nothing new.
- **Cost:** a check measured on 2026-11-10 cost about $0.005 at API rates,
  with most of its ~125K tokens read from cache. At one check a minute that
  comes to about $7 a day, roughly what the old 5-minute Opus checks cost,
  but with replies five times faster.
- **Don't trim it with `--tools ""`.** That loads every tool definition up
  front, pushes the prompt over 100K tokens and onto Haiku's higher price,
  and made a check cost 20 times as much.

### Plan routine (a Lead): Opus 5.5 at `high`

- **Does:**
  - reads the code;
  - splits the work into squad tickets of under 1,000 code lines each;
  - makes the calls that cut across the codebase: schema, auth, caching and
    shared components.
- **Output:** the plan, in its final message. The Manager saves it locally
  under `docs/plans/`. Plans stay out of PRs, so the routine doesn't push.
- **Why `high`:** Anthropic's guidance is at least `high` for work that
  depends on judgment.
- **Doesn't:** implement.

### Squad routine: Sonnet 5.5 at `medium`

- **Does:** owns one ticket end to end. It implements the ticket, runs the
  checks, pushes `claude/ody-<n>-<slug>`, and ends with a summary and a PR
  body. It does all of this itself on small tickets.
- **When it uses workers:** only for pieces that are independent and easy to
  check (see "When a swarm pays"). It spawns them as Haiku subagents inside
  its own session.
- **Why `medium`:** Sonnet 5.5 defaults to `high`, but Anthropic's starting
  point for agentic coding is `medium`.
- **When to go up:** if the checks fail twice, or the ticket changes shared
  code, the Manager reruns it at the next step of the ladder (see "Effort,
  model by model").

### Workers (0–5): Haiku 5.5, inside a squad

- **Why Haiku:** Anthropic positions Haiku 5.5 for high-volume subagent work
  whose results can be checked, not for long agentic loops.
- **`low` for mechanical work:**
  - searching for usages;
  - applying the same edit to listed files;
  - reading test or lint output;
  - drafting a PR body from a diff.
- **`medium` (Haiku's default) for code:** a small code edit when the brief
  names the file and the test that proves it.
- **Never above `high`.** If a job needs that, give it to Sonnet.
- **They share the squad's checkout.** Give each worker different files. Only
  the squad runs Jest, once, after the workers finish, because parallel Jest
  runs flake.

### Review routine (a Lead): Opus 5.5 at `medium`

- **Does:** checks out the squad's `claude/` branch, reviews the diff against
  the plan and the repo's patterns (the `reviewer` agent's checklist), and
  reports in its final message.
- **Doesn't:** edit or push. Fixes go to a new squad run on the same branch.

### Audit routine (a Lead): Opus 5.5 at `high`

This runs the existing `auditor` agent's checks, once per branch before
merge. It's required for schema, auth and server-action work. Use `max` for
auth and server actions, where being right matters more than cost.

## One ticket, start to finish

1. **Request:** the owner posts an `[ASK]` in Slack, and the Watcher wakes
   the Manager.
2. **Proposal:** the Manager proposes the tickets and their routes, then
   waits for `approve`.
3. **Plan:** if the route needs one, the Manager starts a Plan routine and
   saves the plan it returns.
4. **Squads:** the Manager starts one squad routine per ticket, in parallel
   where tickets don't share files. Each brief has the ticket text, the plan
   and the checks.
5. **Results:** the Manager reads each squad's result with `list_runs` and
   `get_run_log`. If the checks failed or nothing was pushed, it reruns the
   squad one step up the ladder.
6. **Review:** the Manager starts a Review routine on the pushed branch. If
   the review asks for changes, a new squad run fixes them on the same
   branch.
7. **Hand-off:** the Manager posts the branch, the PR body and the review in
   Slack. **The owner opens the PR** from the `claude/` branch. Agents never
   open or merge PRs.
8. **Audit:** before merge, an Audit routine runs where the route requires
   one.

## Routing: what runs where

| Work                                                                                      | Setup                                                                                    | Effort                                        |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------- |
| Add a button, change text, fix a style in one component                                   | One squad routine, no workers, no Plan                                                   | `low`–`medium`                                |
| The same mechanical change across many files (e.g. ODY-527's ~40 broken Tailwind classes) | One squad routine plus one Haiku worker per group of files, up to 5                      | Workers `low`, squad `medium`                 |
| A bug with a known cause in one area (e.g. ODY-628)                                       | One squad routine                                                                        | `medium`                                      |
| A bug whose cause is unknown                                                              | One squad routine using `systematic-debugging`. A Plan routine if it finds no root cause | `high`                                        |
| A feature over ~100 lines (e.g. ODY-888)                                                  | Plan → squad → Review                                                                    | Plan `high`, squad `medium`, Review `medium`  |
| A schema change, backfill, auth or server action (e.g. ODY-786)                           | Plan → squad → Review → Audit                                                            | Plan `high`, squad `high`, Audit `high`/`max` |
| A batch of small independent tickets                                                      | One squad routine per ticket, in parallel (start with 3 at once)                         | As per ticket                                 |
| Read-only work: finding usages, summarizing a log                                         | A Haiku worker inside whichever squad needs it                                           | `low`                                         |
| Slack polling                                                                             | The Watcher, locally                                                                     | `low`                                         |

### When a swarm pays

Give a piece to a worker only if all of these are true:

1. **Independent:** it touches files no other worker touches, and it doesn't
   need another piece's result.
2. **Checkable:** a test, lint, `tsc` or grep can prove it's done.
3. **Briefable:** you can write the brief in a few lines, naming the files,
   the change and the check.

If any one is false, the squad does that piece itself.

## Effort, model by model

| Model      | Default  | Use                                                                              | Notes                                                                                               |
| ---------- | -------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Opus 5.5   | `medium` | `medium` for the Manager and reviews; `high` for plans and audits                | Thinking can't be turned off, so effort is the only control. `max` only when correctness beats cost |
| Sonnet 5.5 | `high`   | `medium` for coding; `high` for shared code or failing checks; `low` for PR text | The levels were recalibrated for 5.5. Don't carry over levels used on older Sonnets                 |
| Haiku 5.5  | `medium` | `low` for lookups and mechanical edits; `medium` for small code edits            | Thinking counts toward `max_tokens`, so don't set a tight cap                                       |

These three rules come from Anthropic's cost guidance:

- **Lower the effort before switching to a cheaper model.** A stronger model
  at lower effort often beats a weaker model at higher effort.
- **Retry failures one step up.** Run everything at the cheap setting, and
  rerun only what fails its checks at the next setting. In Anthropic's coding
  runs this kept the same pass rate for a little over half the cost. Our
  failure signals are Jest, lint and `tsc`. The ladder:
  1. Haiku `low`
  2. Haiku `medium`
  3. Sonnet `medium`
  4. Sonnet `high`
  5. A Plan routine investigates
- **Judge by the hard tickets.** The hardest tenth of tickets decides the
  cost. Don't choose a model because it handled the easy ones.

## Setting up a cloud routine

Create each routine with `RemoteTrigger` (`action: "create"`) and
`enabled: false`, then start it with `action: "run"`. It starts at once and
can't fire twice. Routines fired with `run_once_at` started 1.5–4.5 minutes
late on 2026-11-10.

| Setting         | Plan, Review, Audit                | Squad                                                    |
| --------------- | ---------------------------------- | -------------------------------------------------------- |
| `model`         | `claude-opus-5-5`                  | `claude-sonnet-5-5`                                      |
| `allowed_tools` | `Bash`, `Read`, `Glob`, `Grep`     | `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Agent` |
| Pushes          | No                                 | Its own `claude/ody-<n>-<slug>` branch only              |
| Brief ends with | The plan, review or audit findings | Branch, commit SHA, check results and a PR body          |

- **Environment:** your own `Default` environment (its `env_…` ID is in
  `.claude/manager-state.json`; see [manager-setup.md](manager-setup.md)).
  The source is the `KhourySpecialProjects/odyssey` repo, and sessions start
  on `develop`.
- **`Agent` must be in a squad's `allowed_tools`,** or the squad can't spawn
  workers. The first ODY-527 routine didn't have it.
- **Effort:** we haven't found an effort setting on routines, so the
  routine's main agent runs at its default. Set worker effort in the squad's
  Agent call (`model: "haiku"`, `effort: "low"`) or in the worker's agent
  definition.
- **Agent definitions come from `develop`.** A cloud session reads
  `.claude/agents/` from the repo it checks out, so a `worker` agent must be
  merged to `develop` before cloud squads can use it. The worker definition
  should be `model: haiku`, `effort: low`, with no `isolation`, and `Agent`
  left out of its `tools`. The watcher should be `model: haiku`,
  `effort: low`, with read-only Slack tools. Neither exists yet.
- **Nesting:** a cloud session is a main session, so the limit of three
  subagent layers below it applies there too. A squad (main) and its workers
  (layer 1) are well within it.
- **Agent teams** (the experimental `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
  setting) use many more tokens than subagents, and only work in interactive
  sessions. Don't turn them on for this.

## Limits of our setup

- **Pushing:** since PR #1303 (merged 2026-11-10), a cloud session may run
  `git push -u origin claude/<name>`, and nothing else. It works straight to
  `KhourySpecialProjects/odyssey` since the Claude GitHub app was installed on
  the org (2026-11-10). The hook checks the whole Bash command, so the push
  must be its own command: a push chained after `cd` or `&&` is blocked, and
  so is `git stash drop`. Say both in every squad brief.
- **Long reports are cut off.** `get_run_log` keeps about 4,000 characters of
  a run's final message. Put a long plan or review in a file the routine
  pushes on its `claude/` branch.
- **Linear isn't connected to cloud routines,** so the Manager pastes the
  ticket text into each brief.
- **How many at once:** on 2026-11-10, batches of 4, 6 and 7 routines ran
  together with no queueing. We don't know the plan's limit.
- **Usage:** everything counts against our Claude plan's usage limits, and
  Opus uses them up fastest. Keep Opus for the Manager, plans, reviews and
  audits.
- **The laptop runs only the Manager and the Watcher.** Local builds are the
  fallback when the cloud is down, and then only one local implementer runs
  at a time. Seven local agents filled a 16 GB Mac's memory and disk on
  2026-11-09.

## Writing a brief

Every routine and worker starts cold, so a weak brief is the most common
waste. Give each one:

1. **The goal:** one sentence.
2. **The ticket text**, pasted in, because there's no Linear in the cloud.
3. **The files** it may change, and the ones it must not.
4. **What's been ruled out.**
5. **The check that proves it's done:** Prettier 3.3.2 from the repo root,
   root `npm run lint`, `tsc --noEmit`, and Jest with `--runInBand` and
   `--findRelatedTests`.
6. **The report you want back:** branch, commit SHA, check results and a PR
   body.

## What we measured on 2026-11-10

| Run                                   | Minutes  | Notes                                                   |
| ------------------------------------- | -------- | ------------------------------------------------------- |
| Frontend bug squad (Sonnet)           | 2.8–4.8  | 527, 471, 261, 473, 872, 914, 917                       |
| Feature squad, ~550 lines (Sonnet)    | 5.2      | ODY-888                                                 |
| Backend squads (Sonnet)               | 7.8–10.7 | 719, 878 (schema change); `npm ci` took about 6 minutes |
| Copy a branch (Haiku)                 | 0.7      | Right-sized: a fetch and a push                         |
| Bug with a false premise (Haiku lead) | 1.2      | ODY-871: stopped and explained instead of pushing       |
| Review (Opus)                         | 1.7–3.3  | Each found real issues (527, 471, 261, 257)             |

- **Batches:** 4 tickets finished in 5.3 minutes of wall clock, and 6 in
  10.7. Locally, one ticket at a time took 1.4–14.6 minutes each.
- **Reviews paid off.** Every Opus review asked for at least one fix, and one
  (ODY-257) showed the fix hid a symptom, so that ticket was dropped.

## Checking the setup works

Record, for each ticket:

- the route it took;
- how many retries and escalations it needed;
- how many fixes the review asked for;
- whether CI passed on the first try.

After about 20 tickets, adjust. As a starting rule of our own (Anthropic
didn't measure this): if more than 1 in 4 of a route's Haiku pieces get
escalated, move that kind of work to Sonnet. If a Sonnet `medium` route never
fails, try `low`. Change one route at a time.

## Sources

- **Anthropic, "Optimizing for cost and intelligence":**
  <https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence>.
  Covers orchestrator results, effort sweeps, retrying failures at higher
  effort, and judging by the hard tickets.
- **Anthropic, "Effort":**
  <https://platform.claude.com/docs/en/build-with-claude/effort>. Covers the
  effort levels and their defaults (Opus 5.5 `medium`, Sonnet 5.5 `high`,
  Haiku 5.5 `medium`).
- **Anthropic's notes on moving to the 5.5 models,** from the claude-api
  skill in Claude Code. Covers Haiku 5.5 for subagent work, Sonnet 5.5 at
  `medium` for agentic coding, and Opus 5.5's thinking always being on.
- **Claude Code docs:**
  <https://code.claude.com/docs/en/sub-agents> covers nesting depth and the
  `model` and `effort` frontmatter;
  <https://code.claude.com/docs/en/agent-teams> covers agent teams.
- **Related Odyssey docs:**
  [multi-agent-coordination.md](multi-agent-coordination.md) and
  [workflow.md](workflow.md).
