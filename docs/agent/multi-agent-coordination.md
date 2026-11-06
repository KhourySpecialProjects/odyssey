# Multi-Agent Coordination Through Slack

Each Odyssey developer runs their own Claude Code session. The sessions coordinate through one Slack group DM so that two agents don't build the same ticket, a blocked agent can ask the agent that owns the prerequisite, and handoffs are visible. The rules agents follow are in `CLAUDE.md` under "Multi-Agent Development Coordination". This file holds the message templates, the tracker, `/coord`, what is and isn't automatic, and setup.

## Where messages go

| What        | Value                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Workspace   | `nu-aiil.slack.com`                                                    |
| Group DM ID | `C0CE3S8B872`                                                          |
| Members     | Awad Buisir, Jaylen Zeng, Brady Cai                                    |
| Tool        | `slack` plugin (`mcp__plugin_slack_slack__*`), one login per developer |

The workspace does not let our accounts create channels, so one group DM carries every message type. The tag at the start of each message stands in for a channel:

| Tag          | Use for                                                                              |
| ------------ | ------------------------------------------------------------------------------------ |
| `[STATUS]`   | Claiming a ticket, progress worth knowing, availability, session-end handoffs        |
| `[BLOCKER]`  | A ticket that can't proceed because of a prerequisite                                |
| `[CONTRACT]` | A published interface other tickets build against (types, endpoints, Server Actions) |
| `[PR]`       | A PR opened, ready for review, failing CI, or merged; breaking changes               |
| `[LINEAR]`   | Dependency, priority or status changes that affect another developer's ticket        |
| `[OPEN]`     | Something owed: a promised follow-up, or a question waiting on an answer             |

Reply in the thread of the message you're answering. Resolve a blocker in its own thread.

**Keep a post to five lines or fewer.** Link the PR, plan or Linear issue for detail instead of pasting it. The state of a ticket goes in the tracker (below), not in a long `[STATUS]`.

Read recent messages with `slack_read_channel` (`channel_id: C0CE3S8B872`, `limit: 50`) and a thread with `slack_read_thread`. Post with `slack_send_message`; pass `thread_ts` to reply in a thread.

## Message format

Every message posts under the developer's own Slack account, so the header names the agent explicitly. Placeholders are in angle brackets:

```
[STATUS] **<Developer>'s agent — ODY-<n>** · IN PROGRESS
Summary: <what the agent is doing, one sentence>
GitHub: branch `<branch>` (not pushed) / PR #<n>
Next: <what happens next>
Files likely touched: <paths or areas others might also change>
```

Status is one of `IN PROGRESS`, `BLOCKED`, `READY FOR REVIEW`, `COMPLETED`.

**Done means on develop.** A ticket is finished, and the tickets it blocks are unblocked, only when its commits are on `origin/develop`. A PR merged into another feature branch (a stacked PR) doesn't count until that branch reaches develop, and neither does a Linear state of Done on its own. Use `COMPLETED` only then, and say "On develop at `<sha>`". `.claude/scripts/coord-status.sh ODY-<n>` checks it.

### Blocker

```
[BLOCKER] **<Developer>'s agent — ODY-<n>** · BLOCKED
Blocked by: ODY-<m> (<owner, if known>)
Missing: <the exact type, endpoint, schema field or decision>
Unblocks it: <what the owner needs to provide>
Partial work: <yes/no — e.g. building against a local mock of the type>
```

### Contract or handoff

```
[CONTRACT] **<Developer>'s agent — ODY-<m>** · READY FOR REVIEW
Interface: <signature, endpoint or schema, exactly as written in code>
Errors: <error cases callers must handle>
Where: <file path and commit or PR link>
Done vs planned: done — <what exists>; planned — <what doesn't yet>
On develop: <sha> / not yet (PR #<n> into <base>)
Unblocks: ODY-<n>, once it's on develop
```

### Something owed

```
[OPEN] **<Developer>'s agent — ODY-<n>** · owed by <agent>
What: <the follow-up or the question, one sentence>
```

Post one whenever you promise a follow-up ("I'll report back on the failing test") or ask a question you need answered. Whoever owes it replies "Closed: <answer or link>" in its thread. `/coord open` lists the ones still open, and anything older than a day gets raised with the developer at session start.

## The tracker

The Slack list **Odyssey agent tracker** holds one row per ticket an agent is working on: Ticket, Title, Owner, State (Claimed, In progress, Blocked, In review, On develop), Branch or PR, On develop (the sha), Blocked by, Open items and Updated. Read it with `slack_read_list` (`list_title: "Odyssey agent tracker"`) and change a row with `slack_update_list_record`.

- **Update the row, don't post the state.** At each milestone (claim, blocked, PR opened, on develop), edit your ticket's row. Post in the group DM only for what needs a reply or a heads-up: a claim, a blocker, a contract, an `[OPEN]` item.
- **One row per ticket**, owned by the agent whose developer has it in Linear. Never edit another agent's row; ask in the group DM instead.
- **Linear still owns ownership and dependencies.** When they disagree, fix Linear first (or ask your developer to), then the row.

## Checking and waiting: `/coord`

- **`/coord status ODY-<n>`** reads Linear's "blocked by", runs `coord-status.sh` on the ticket and every blocker, reads the tracker and the group DM, and answers READY, BLOCKED, IN PROGRESS ELSEWHERE or DONE, with the one next action.
- **`/coord watch ODY-<n>`** watches on two tracks and tells the developer the moment the verdict changes, so a blocked agent doesn't wait to be asked "check now":

  - **merges, every 60 s:** `coord-status.sh --wait <blockers>` runs in the background, costs no tokens, and exits (waking the session) as soon as every blocker is on develop;
  - **Slack and Linear, every 10 minutes:** the `loop` skill re-runs `/coord status` for new posts, reassignments and new blockers, and stays quiet when nothing changed.

  A session only watches while it's open; a closed terminal doesn't poll.

- **`/coord open`** lists `[OPEN]` items owed by or to this developer.

**Never forgetting to check.** `.claude/hooks/coord-reminder.sh` runs on every prompt. When the worktree's last `/coord` check (`.claude/coord-last-check`, git-ignored) is over 10 minutes old, it asks the agent to run `/coord status` before replying and to tell its developer what's new. The hook costs nothing when a check is recent, and it can't read Slack itself (hooks can't call MCP tools), so the agent does the reading.

**Developers decide.** `/coord` reports what's new and suggests the next step; it never claims, posts, replies or starts work. Brady, Jaylen and Awad each decide for their own agent. The milestone posts in `CLAUDE.md` are the only messages an agent sends without asking.

## Other developers' branches

A pushed branch belongs to the developer who pushed it. Don't rebase, force-push, reset or delete files on it, plan docs included. If it has to change (to drop a plan doc or rebase onto develop), post in the group DM first and wait for the owner's okay, because their local stack and any branch stacked on it break. Plan docs stay out of commits (`docs/plans/` files are left untracked), so nobody has to strip them later.

## Dev servers

Several sessions can run on one developer's machine, each with its own dev servers. Stop only the processes you started, by the PIDs you recorded when you started them. Never `pkill` or `killall` dev servers by name (`next-server`, `strapi`): that also kills other sessions' servers.

## What happens automatically and what doesn't

**Works now through the Slack plugin.** Agents read the group DM at session start and post at the milestones in `CLAUDE.md`. Nothing is sent unless an agent is running and chooses to send it; this is instruction-driven, not guaranteed.

**Event-driven through hooks.** `coord-reminder.sh` asks for a `/coord` check on any prompt after 10 minutes without one. `.claude/hooks/session-start.sh` adds a line to every session's context that names the ticket from the branch (for example `ODY-785`), points at `/coord status` and the group DM's `[OPEN]` items, and says when the worktree's packages look older than its lockfiles. The wrap-up agent ends its report with a draft `[STATUS]` handoff for the main session to post (the wrap-up agent has no Slack tools). `/ship` reminds the agent to post a `[PR]` notice once the developer has opened the PR. Hooks can't call MCP tools, so no hook posts to Slack on its own.

**Not available: live incoming messages.** An idle Claude Code session does not see new Slack messages; an agent only learns about a reply when it next reads the group DM, or within 10 minutes while `/coord watch` runs (within a minute for a blocker reaching develop). Real-time delivery would need a listener (a Slack app receiving events and waking a session), which we haven't built. Native GitHub and Linear notifications are also not set up: their Slack apps post to channels, not to group DMs. Until a channel exists, use their personal notifications (below) and the `[PR]` and `[LINEAR]` messages.

## Setup for each developer

1. Pull the branch that adds this file. `.claude/settings.json` enables the `slack@claude-plugins-official` plugin for the project.
2. Start Claude Code in the repo, run `/mcp`, choose the Slack server and authenticate with your Northeastern Slack account.
3. Check access: ask Claude to read the last five messages in `C0CE3S8B872`. If it says `channel_not_found`, you are not in the group DM — ask Awad to add you (see below).
4. Optional personal notifications: in Slack, open the **GitHub** app and run `/github signin` for review requests and PR mentions; in Linear, turn on **Settings → Notifications → Slack** for assigned issues and status changes. These arrive as DMs to you, not in the group DM.

## Adding a developer or moving to channels

A Slack group DM's ID belongs to its exact member list. Adding a person creates a new conversation, so whoever adds them must update the ID here and in `CLAUDE.md` in the same PR. Group DMs hold at most nine people.

If a workspace admin later creates channels, update the table at the top. The intended names are `#prj-odyssey-agent-coordination`, `#prj-odyssey-agent-blockers`, `#prj-odyssey-github-updates` and `#prj-odyssey-linear-updates`, all private to match the other `#prj-odyssey-*` channels. Then subscribe the GitHub app (`/github subscribe KhourySpecialProjects/odyssey pulls reviews comments` in `#prj-odyssey-github-updates`) and point Linear's ODY team Slack notifications at `#prj-odyssey-linear-updates`.
