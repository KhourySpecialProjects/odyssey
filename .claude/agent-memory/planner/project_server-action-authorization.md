---
name: server-action-authorization
description: ODY-482 is the umbrella ticket for auditing authorization on every "use server" export; ODY-481 fixed only the admin-stats action.
metadata:
  type: project
---

Odyssey has an in-flight initiative to close authorization gaps in Server Actions. Every exported
async function in a `"use server"` file becomes an independently callable POST endpoint, and the
`/admin` layout gate does not run for those invocations.

- **ODY-481** — narrow fix for `getAdminDashboardStats` only (aggregate metrics, High). Planned
  2026-09-22, plan at `docs/plans/ODY-481.md`.
- **ODY-482** — the general case across all `"use server"` files. The ODY-481 audit found
  `fetchAuthorizedUsers` (whole user directory incl. emails) and `fetchCreationRequests` (per-user
  PII) unguarded — both more severe than ODY-481 itself. Recommended ODY-482 be raised to Urgent.

**Why:** The user asked explicitly whether the broader `/admin` audit belonged in ODY-481 or should
be deferred. It was deferred: the PII-returning functions likely have legitimate non-admin call
sites, so each needs its own call-site survey, and bundling them would have blocked a green CI on a
narrow diff.

**How to apply:** When a ticket surfaces another unguarded action, scope it to ODY-482 rather than
folding it into whatever branch found it. `lib/auth/require-role.ts` (`requireRole`) is the agreed
single guard idiom — do not introduce a second one. See [[ody-474-stale-cache]] for the sibling
branch these tests were found on.
