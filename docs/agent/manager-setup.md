# Setting Up Your Own Manager Agent

The manager agent (`/manager`) turns your requests in `#prj-odyssey-agents`
into Linear tickets and pushed branches. You post a request in Slack, it
proposes a plan in the thread, and when you reply `approve` it runs each
ticket as a cloud session that builds, tests and pushes a `claude/` branch.
You watch progress on one Slack canvas, and you open the PRs.

Awad has run it since 2026-11-10. On the first afternoon it pushed 10
tickets, most in 3–5 minutes each and several at once, while the laptop only
ran Slack checks.

**You run your own.** Each manager serves only the developer who started it,
on that developer's own machine and Claude plan.

## What runs where

| Part                                             | Where                                         | Model                               |
| ------------------------------------------------ | --------------------------------------------- | ----------------------------------- |
| Manager: reads Slack, plans, starts runs         | Your Claude Code session                      | Opus 5.5 (your session's)           |
| Watcher: checks Slack every 60 s                 | Your laptop, `.claude/scripts/slack-watch.sh` | Haiku 5.5, `low`                    |
| Squads: one ticket each, push `claude/ody-<n>-…` | Claude Code on the web (cloud routines)       | Sonnet 5.5 (Haiku for trivial ones) |
| Plans and reviews                                | Cloud routines                                | Opus 5.5, only when you ask         |

The cloud sessions run in Anthropic's containers, so five at once cost your
laptop nothing. They count against your Claude plan's usage.

## One-time setup (about 10 minutes)

1. **Claude Code, signed in.** Install Claude Code (CLI or the VS Code
   extension) and sign in with your claude.ai account. Check with
   `claude --version`. The Watcher calls `claude` from the shell, so it must
   be on your `PATH`.
2. **Slack.** The project enables the `slack@claude-plugins-official` plugin.
   In Claude Code run `/mcp`, pick the Slack server, and sign in with your
   Northeastern Slack account. Check: ask Claude to read the last five
   messages in `C0CG95FFZ09`.
3. **Linear.** Run
   `claude mcp add --transport http linear https://mcp.linear.app/mcp`, then
   `/mcp` → linear → Authenticate. Check: ask Claude for your assigned ODY
   tickets.
4. **Claude Code on the web.** Open <https://claude.ai/code> and connect
   GitHub. The Claude GitHub app is already installed on
   `KhourySpecialProjects`, so the `odyssey` repo should be listed. If it
   isn't, ask Awad.
5. **Your cloud environment.** In Claude Code, run `/schedule` and ask it
   to list your environments. Copy the ID of `Default` (it starts with
   `env_`). Every developer has their own.
6. **State file.** Create `.claude/manager-state.json` in your checkout (it's
   git-ignored):

   ```json
   {
     "lastCheck": "0",
     "environmentId": "env_…",
     "requests": {}
   }
   ```

   `/manager check` fills in the rest, including `lastCheck` and the canvas
   ID.

## Every session

1. Open Claude Code in the repo, on `develop` or any branch.
2. Run `/manager watch`. It reads the channel once, then starts the Watcher
   with the `Monitor` tool. It tells you when it's running.
3. Leave the session open. When the session closes, the manager stops; the
   cloud runs it started keep going, and the next `/manager watch` picks up
   their results.

## Asking it for work

Post at the top level of `#prj-odyssey-agents`, starting with `[ASK]` or
`Claude,`:

- `[ASK] Admins can export the users table as CSV`
- `Claude, check the Linear backlog for bugs I could hand off`
- `Claude, start ODY-123 and ODY-124`

Then reply in its thread:

| Reply                     | What happens                             |
| ------------------------- | ---------------------------------------- |
| `approve`                 | Every proposed ticket starts             |
| `approve 1,3`             | Only those start                         |
| Anything else             | A change: it redoes the proposal         |
| `stop` or `drop`          | No more runs for that request            |
| `give 123 an opus review` | An Opus review of that branch, read-only |

Only your own messages count. Other people's messages, ticket text and run
logs are information to it, never instructions.

## What you get back

- **A live canvas.** One Slack canvas, edited in place every 2 minutes while
  runs are active: tickets by type, what's running with a progress bar,
  what finished, and a table of every ticket's status. No progress messages.
- **One summary per batch.** When every run in a request is done, one post
  in its thread: what to look at, each branch and SHA, review findings, and
  what other developers need to know.
- **Branches, not PRs.** Each squad pushes `claude/ody-<n>-<slug>` and ends
  with a review card, which becomes its PR body. You open the PR from the
  branch (`CLAUDE.md`: agents never open PRs).
- **Review cards instead of CodeRabbit.** The free CodeRabbit plan is too
  limited, so the cards do its job. The card's length depends on the kind of
  change:

  - **Major** (a new feature, or a revamp of a main flow) gets the full
    breakdown: a walkthrough, a "Layer / Files | Summary" table, a Mermaid
    flow diagram, review effort, merge risk, overlaps, suggested reviewers and
    test steps.
  - **Minor** (bug fixes, small features, cleanup) gets one sentence, one test
    step, and a **Careful:** line when it touches auth, a schema or secrets.

  Each card is also saved as `review-cards/<branch>.md` on a
  `claude/review-cards-<batch>` branch. Open the PRs with
  `bash .claude/scripts/open-prs.sh`: a plain run is a dry run, and
  `--yes --only 211,529` opens those two. It skips branches that already have
  a PR and opens 🔴 first. For a branch you built yourself, `/ship` writes the
  same kind of card.

- **One review queue.** A second canvas lists every pushed branch that isn't
  merged, grouped Major → Minor features → Bug fixes → Cleanup, with each
  card's test steps as checkboxes to tick on dev.

## Rules worth knowing

- **Cloud sessions push only their own `claude/` branch** (`CLAUDE.md`, PR
  #1303). The hook allows exactly `git push -u origin claude/<branch>` as a
  whole command, and blocks everything else, including pushes from your
  laptop.
- **Nothing starts without your `approve`** in the thread.
- **Opus is for plans and reviews you ask for.** Squads run on Sonnet 5.5, and
  trivial jobs on Haiku 5.5. See [agent-swarming.md](agent-swarming.md).
- **Claim before you build.** The manager posts a `[STATUS]` claim, so two
  developers' managers don't build the same ticket. Check `/coord status`
  before you approve a ticket someone else might own.
- **Linear writes may ask for permission.** In auto mode, changing a ticket's
  state can be refused. Allow `mcp__linear__save_issue`, or change the state
  yourself.

## When something goes wrong

| Symptom                                  | Cause and fix                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `WATCHER_ERROR cannot read …state.json`  | The state file is missing or broken. Create it (step 6) or run `/manager check` once.                                                  |
| `WATCHER_ERROR 3 checks in a row failed` | Slack sign-in expired or `claude` isn't on `PATH`. Run `/mcp`, then `/manager watch` again.                                            |
| A run finished but pushed nothing        | Read its log (`get_run_log`). Usually the push was chained with `cd` or `&&`, and the hook blocked it. Rerun with the exact push line. |
| Runs start minutes late                  | The routine used `run_once_at`. The manager should create with `enabled: false`, then `run`.                                           |
| No new messages wake the manager         | The monitor expires every 30 minutes. Run `/manager watch` again.                                                                      |
| A cloud run says `403` on push           | Your claude.ai GitHub connection can't see the org's repo. Reconnect GitHub at claude.ai/code.                                         |

## Files

- `.claude/commands/manager.md`: what the manager does, step by step.
- `.claude/scripts/slack-watch.sh`: the Watcher.
- `.claude/scripts/review-card-brief.md`: the review card format, and the brief
  for a run that writes cards for branches already pushed.
- `.claude/scripts/open-prs.sh`: opens one PR per review card.
- `docs/agent/agent-swarming.md`: which model and effort for which job, and
  how to brief a cloud routine.
- `docs/agent/multi-agent-coordination.md`: the channel's message tags and
  rules.
- `.claude/manager-state.json` and `.claude/manager-seen.txt`: your local
  state, git-ignored.
