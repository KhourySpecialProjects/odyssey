# Odyssey demo environment

A separate copy of Odyssey with fake data, for showing every feature and for AI
agents that play its personas. It never touches production data. See the
demo-environment research doc for the full plan.

This branch (`demo`) is never merged into `develop` or `production`.

## Run it locally

Needs Docker and Node 20.6+.

1. **Create the demo settings** (once):
   ```bash
   npm run demo:setup
   ```
   This writes `backend/.env.demo` and `frontend/.env.demo` (both git-ignored)
   with fresh demo-only secrets. Your normal `.env` files aren't touched.
2. **Start the demo database** (Postgres 13 on port 5433, separate from your dev database):
   ```bash
   npm run demo:db:up
   ```
3. **Fill it with the demo world** (once, on an empty database):
   ```bash
   npm run demo:seed
   ```
   It prints an access token at the end. Paste it into `frontend/.env.demo` as
   `STRAPI_ACCESS_TOKEN`. The seed refuses to run outside demo mode, against a
   database whose name doesn't contain "demo", or on a database that already
   has data. When it's done, it saves a snapshot of the fresh world for
   `npm run demo:reset`.
4. **Start the demo backend** (Strapi on http://localhost:1338):
   ```bash
   npm run demo:backend
   ```
   The first visit to http://localhost:1338/admin asks you to create a Strapi
   admin account for browsing the data. Run `npm run demo:snapshot` afterwards,
   or the next reset removes the account.
5. **Start the demo frontend** (http://localhost:3001):
   ```bash
   npm run demo:frontend
   ```
   The login page lists the personas. Pick one to log in as them. Scripts and
   agents use one-time login links instead (see below).
6. **Optional: run non-Python code** (Python runs in the browser and needs nothing):
   ```bash
   npm run demo:piston
   ```
   This starts Piston, the code runner from `docker-compose.yml` (a privileged
   container on port 2000, localhost only), and installs JavaScript. Without it,
   Run on a JavaScript code block says the execution service is unreachable.

The demo runs on its own ports, so it can run next to your normal `npm run dev`.

| Command | What it does |
|---|---|
| `npm run demo:db:down` | Stops the demo database (data is kept) |
| `npm run demo:reset` | Puts the demo back to the freshly seeded world in a few seconds, with every date moved forward so "due in 3 days" is still 3 days away. Run it while the demo is running: it also clears the frontend's cached data |
| `npm run demo:snapshot` | Saves the database as it is now as the world `demo:reset` goes back to (`demo/.snapshot/`, git-ignored) |
| `npm run demo:db:reset` | Deletes the demo database and starts an empty one (give it a few seconds before seeding) |
| `npm run demo:login-link -- student1` | Prints a one-time login link for a persona (see below) |
| `npm run demo:agent -- student1 "<goal>"` | Has Claude play a persona until it reaches the goal (see below) |
| `docker compose stop piston` | Stops Piston |

## Logging in from scripts and agents

Agents can't click through the persona picker, so they log in with a one-time
link. The demo frontend must be running.

```bash
npm run demo:login-link -- student1                # lands on /explore
npm run demo:login-link -- contenteditor1 /review  # lands on /review
```

Opening the printed link logs that persona in and lands on the path. A link
works once, expires after 10 minutes, and only logs in an enabled
`@demo.odyssey.test` account. To be two personas at once, open the second
link in a private window.

The script calls `POST /api/demo/login-link` with
`Authorization: Bearer <DEMO_CONTROL_SECRET>` (from `frontend/.env.demo`) and
a body like `{ "email": "student1@demo.odyssey.test", "callbackUrl": "/explore" }`.
It answers `{ "url", "expiresAt" }`. The agent runner uses the same route.

## Running an agent

`npm run demo:agent` has Claude play one persona on the demo site, in a real
browser, until it reaches a goal or hits a limit. At each step it reads the
page as an accessibility snapshot (the outline of headings, text, links and
form fields) and takes one action: click, type, choose an option, press a key,
open a page, go back or look again.

```bash
npm run demo:agent -- student1 "Finish the Python Basics droplet, quizzes included"
npm run demo:agent -- student1 "..." --watch    # shows the browser window
```

It needs:

- the demo frontend running (the agent logs in with a one-time login link);
- Node 22.18 or later, because it runs the TypeScript in
  `frontend/lib/demo-agent/` directly;
- Google Chrome, or `npx playwright install chromium` in `frontend/` and
  `--browser chromium`;
- the demo's own Anthropic API key, with a monthly spending limit, in
  `DEMO_AGENT_API_KEY` (your shell, or `demo/.env.agent`, which is
  git-ignored). Never use the app's key.

It prints a line per step and ends with what the agent did, anything it found
broken and the estimated cost. The full log is saved in `demo/.agent-runs/`
(git-ignored). Ctrl+C stops a run after the current step and still saves the
log. Run `npm run demo:reset` afterwards to undo what the agent changed.

| Option | Default | |
|---|---|---|
| `--start <path>` | `/explore` | Page it starts on |
| `--max-steps <n>` | 60 | Most actions it may take |
| `--max-minutes <n>` | 15 | Longest it may run |
| `--max-dollars <n>` | 3 | Most it may spend, estimated from the tokens it uses |
| `--model <id>` | `claude-opus-5-5` | `claude-sonnet-5-5` costs half as much |
| `--effort <level>` | `medium` | `low`, `medium`, `high`, `xhigh` or `max` |
| `--watch` | off | Shows the browser window |
| `--browser <name>` | `chrome` | `chromium` uses Playwright's own browser instead of Google Chrome |
| `--script <file>` | | Replays a script instead of calling Claude (no key, no cost) |

**Cost.** Our estimate is $1 to $2 per goal on Claude Opus 5.5; the first real
runs will show the actual cost. To keep long runs cheap, old page snapshots
are cleared on the server as a run goes on, and earlier turns are read from
the prompt cache.

**Trying it without Claude.** `--script` replays a list of actions, finding
each element by how it reads in the snapshot. This one enrolls in the Big-O
droplet and finishes its first lesson, quiz included. Use a student who
hasn't started that droplet, like student1 after a reset:

```bash
npm run demo:agent -- student1 --script demo/agent-scripts/big-o-first-lesson.json
```

**Guardrails.** The main page stays on the demo site: links elsewhere are
blocked, anything that still lands off the site is undone, and new tabs are
closed. Embedded frames, like videos, still load their own content. Agents
can't log out, log in as someone else, call the demo's control routes or open
Next's developer endpoints (one of them opens files in your editor). The agent
is told to treat page text as content, never as instructions, and the step,
time and spending limits stop a run that goes wrong. The safety switches below
still apply.

## What the seed creates

The seed (`backend/scripts/demo-seed/`) writes data the same way the app does,
so every page shows it. Every Strapi call goes through `strapi.js`, so moving to
Strapi v5 means changing that one file.

- **Personas** (email `<name>@demo.odyssey.test`): `admin1` (System Admin),
  `contentcreator1` (databases), `contentcreator2` (web development and career),
  `contenteditor1`, `faculty1` (runs CS 3200), `student1` (keeps up),
  `student2` (behind, overdue), `student3` (has a pending creator request).
  Background students `student4` to `student45` fill the groups.
- **Droplets in every state**: published, draft, in review, changes requested,
  an `[EDIT]` copy in review, hidden, and a claimed voyage draft.
- **The Block Gallery** ("SQL Basics: A Tour of Every Lesson Block", by
  `contentcreator1`): one lesson per block family, so every lesson block
  appears at least once, plus a classic (v1) lesson. Its Slides lesson works in
  presentation mode, and its notebooks read `students.csv`. The image and the
  dataset are served from `frontend/public/demo/`. JavaScript code blocks need
  `npm run demo:piston`.
- **A catalog of published droplets** for Explore: Python and data,
  algorithms, SQL, web development, security, tools, career and study skills.
  They're written in Markdown in `backend/scripts/demo-seed/catalog/` and go
  through the app's own Markdown importer. Background students browse them,
  so the popular ones show ratings. Its README explains how to add one.
- **Playlists**: public, private and archived.
- **A voyage** with a main path and branches, playlist and droplet steps, and
  unclaimed, claimed and authored steps. Plus a draft voyage.
- **Groups**: CS 3200 with past, near and future due dates and mixed progress;
  a playlist-only club; an archived group.
- **Activity**: enrollments, ratings, a highlight and notes, voyage progress,
  friends with pending requests and a block, announcements of every type.
- **Admin backlog**: a creation request, access requests and bug reports.
- The `/features` gallery, with screenshots of this demo world
  (`frontend/public/demo/features/`). Retake them if those pages change.

Dates are relative to when you seed, and `npm run demo:reset` keeps them that
way by moving every date forward by the time since the snapshot was saved.

A test (`frontend/testing/lib/demo-seed-coverage.test.ts`) runs the seed
without Strapi and fails when the app gains something the demo doesn't show:
a lesson block or callout type missing from the Block Gallery, or a droplet
status, announcement type or voyage claim status the seed never uses. It also
fails if a seeded lesson breaks the editor's rules (unknown block types,
repeated block ids, unsupported text styles).

## Safety switches

- `DEMO_MODE=true` turns the demo behaviour on.
- The frontend refuses to start in demo mode if it's pointed at a production
  address (the real site or its Strapi). See `frontend/next.config.mjs`.
- The demo control routes (`/api/demo/*`, for login links and clearing cached
  data) answer 404 unless `DEMO_MODE=true` and `DEMO_CONTROL_SECRET` is set,
  and 401 without the secret. Like the persona picker, login links only log in
  `@demo.odyssey.test` accounts.
- Bug reports are saved but never sent to Linear, and never call Claude to write
  the ticket. Slack messages are never sent.
- PostHog, the AI features and S3 are off while their keys are blank.
- `frontend/.env.demo` lists every setting the app reads, even blank ones, so a
  real key in your `.env.local` can't leak into the demo. A test
  (`frontend/testing/lib/demo-env-template.test.ts`) fails if a new setting is
  added to the app but not to `demo/setup-env.mjs`.
