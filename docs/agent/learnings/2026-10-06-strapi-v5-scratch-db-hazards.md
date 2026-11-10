# Local v5 work can hit the wrong database

Date: 2026-10-06
Author: Jaylen Zeng + Claude (ODY-605)
Status: new

## What we learned

A running native `strapi develop` hot-reloads the other branch's code after `git checkout`. The Docker `strapi` container would run the one-way migration on `strapiDB`. An empty `DATABASE_URL` overrides `DATABASE_*`, so set it on purpose. An empty `backend/yarn.lock` directory (made by Docker's bind mount) crashes npm with "Received null": `rmdir` it.

## Why it matters

One accidental boot destroys the v4 baseline, and the npm error doesn't mention the lockfile.

## Evidence

- `docs/plans/ODY-597.md` (handoff notes: AC8, the `strapi` container, the `yarn.lock` gotcha)
- `backend/config/database.ts` reads `DATABASE_URL` first
