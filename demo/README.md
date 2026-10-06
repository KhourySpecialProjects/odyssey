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
3. **Start the demo backend** (Strapi on http://localhost:1338):
   ```bash
   npm run demo:backend
   ```
4. **Start the demo frontend** (http://localhost:3001):
   ```bash
   npm run demo:frontend
   ```

The demo runs on its own ports, so it can run next to your normal `npm run dev`.

| Command | What it does |
|---|---|
| `npm run demo:db:down` | Stops the demo database (data is kept) |
| `npm run demo:db:reset` | Deletes the demo database and starts an empty one |

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
