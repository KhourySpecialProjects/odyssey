# REST defaultLimit 25 caps unpaginated raw fetches

Date: 2026-10-06
Author: Jaylen Zeng + Claude (ODY-605)
Status: new

## What we learned

`backend/config/api.ts` sets `defaultLimit: 25`, so a raw list `fetch()` without `pagination` silently returns at most 25 rows. `fetchAPI` callers hit the same cap.

## Why it matters

Lists look complete in dev and truncate silently once data grows.

## Evidence

- `backend/config/api.ts`
- ODY-720
