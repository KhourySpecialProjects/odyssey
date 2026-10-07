# Odyssey demo environment

A separate copy of Odyssey with fake data, for showing every feature and (later)
for AI agents that play roles. It never touches production data. See the
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
   The login page lists the personas. Pick one to log in as them.
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
| `docker compose stop piston` | Stops Piston |

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
- Bug reports are saved but never sent to Linear, and never call Claude to write
  the ticket. Slack messages are never sent.
- PostHog, the AI features and S3 are off while their keys are blank.
- `frontend/.env.demo` lists every setting the app reads, even blank ones, so a
  real key in your `.env.local` can't leak into the demo. A test
  (`frontend/testing/lib/demo-env-template.test.ts`) fails if a new setting is
  added to the app but not to `demo/setup-env.mjs`.
