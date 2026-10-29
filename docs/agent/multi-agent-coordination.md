# Multi-Agent Coordination Through Slack

Each Odyssey developer runs their own Claude Code session. The sessions coordinate through one Slack group DM so that two agents don't build the same ticket, a blocked agent can ask the agent that owns the prerequisite, and handoffs are visible. The rules agents follow are in `CLAUDE.md` under "Multi-Agent Development Coordination". This file holds the message templates, what is and isn't automatic, and setup.

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

Reply in the thread of the message you're answering. Resolve a blocker in its own thread.

Read recent messages with `slack_read_channel` (`channel_id: C0CE3S8B872`, `limit: 50`) and a thread with `slack_read_thread`. Post with `slack_send_message`; pass `thread_ts` to reply in a thread.

## Message format

Every message posts under the developer's own Slack account, so the header names the agent explicitly. Placeholders are in angle brackets:

```
[STATUS] **<Developer>'s agent — ODY-<n>** · IN PROGRESS
Summary: <what the agent is doing, one sentence>
Dependencies: <tickets or agents needed, or "none">
GitHub: branch `<branch>` (not pushed) / PR #<n>
Next action: <what happens next>
Files likely touched: <paths or areas others might also change>
```

Status is one of `IN PROGRESS`, `BLOCKED`, `READY FOR REVIEW`, `COMPLETED`. Use `COMPLETED` only once the work is merged or the Linear issue is closed — never for work that is only written locally.

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
Unblocks: ODY-<n>
```

## What happens automatically and what doesn't

**Works now through the Slack plugin.** Agents read the group DM at session start and post at the milestones in `CLAUDE.md`. Nothing is sent unless an agent is running and chooses to send it; this is instruction-driven, not guaranteed.

**Event-driven through hooks.** `.claude/hooks/session-start.sh` adds a line to every session's context that names the ticket from the branch (for example `ODY-785`) and points at the group DM, so the agent checks before starting work. The wrap-up agent ends its report with a draft `[STATUS]` handoff for the main session to post (the wrap-up agent has no Slack tools). `/ship` reminds the agent to post a `[PR]` notice once the developer has opened the PR. Hooks can't call MCP tools, so no hook posts to Slack on its own.

**Not available: live incoming messages.** An idle Claude Code session does not see new Slack messages; an agent only learns about a reply when it next reads the group DM. Real-time delivery would need a listener (a Slack app receiving events and waking a session), which we haven't built. Native GitHub and Linear notifications are also not set up: their Slack apps post to channels, not to group DMs. Until a channel exists, use their personal notifications (below) and the `[PR]` and `[LINEAR]` messages.

## Setup for each developer

1. Pull the branch that adds this file. `.claude/settings.json` enables the `slack@claude-plugins-official` plugin for the project.
2. Start Claude Code in the repo, run `/mcp`, choose the Slack server and authenticate with your Northeastern Slack account.
3. Check access: ask Claude to read the last five messages in `C0CE3S8B872`. If it says `channel_not_found`, you are not in the group DM — ask Awad to add you (see below).
4. Optional personal notifications: in Slack, open the **GitHub** app and run `/github signin` for review requests and PR mentions; in Linear, turn on **Settings → Notifications → Slack** for assigned issues and status changes. These arrive as DMs to you, not in the group DM.

## Adding a developer or moving to channels

A Slack group DM's ID belongs to its exact member list. Adding a person creates a new conversation, so whoever adds them must update the ID here and in `CLAUDE.md` in the same PR. Group DMs hold at most nine people.

If a workspace admin later creates channels, update the table at the top. The intended names are `#prj-odyssey-agent-coordination`, `#prj-odyssey-agent-blockers`, `#prj-odyssey-github-updates` and `#prj-odyssey-linear-updates`, all private to match the other `#prj-odyssey-*` channels. Then subscribe the GitHub app (`/github subscribe KhourySpecialProjects/odyssey pulls reviews comments` in `#prj-odyssey-github-updates`) and point Linear's ODY team Slack notifications at `#prj-odyssey-linear-updates`.
