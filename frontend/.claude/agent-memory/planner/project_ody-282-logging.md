---
name: ody-282-logging
description: ODY-282 structured logging plan — final decisions (traceparent once per render via React cache(), backend jest+ts-jest); blocked by ODY-499
metadata:
  type: project
---

ODY-282 plan at docs/plans/ODY-282.md (pino frontend, Strapi winston JSON backend, CloudWatch only, no S3). Blocked by ODY-499 (move fetchAPI into server-only lib/api.ts). Plan finalized 2026-09-24.

Final user decisions (after the grilling session, made during planning):

- Correlation = W3C `traceparent`, generated ONCE PER SERVER RENDER via React `cache()` in lib/api.ts (`getRenderTraceparent`); trace-id = requestId; never overwrite an existing traceparent; outside RSC render (Server Actions/route handlers) falls back to one id per call. Chosen because Next's data-cache key strips traceparent but dedupe-fetch keys on all headers.
- Backend tests: add jest + ts-jest devDeps to backend for the pure logging code.
- userId header (`x-odyssey-user-id`) IS part of the cache key → never on shared/public fetches.

**Why:** original decisions were settled in a grilling session; these refinements came from verified Next internals and were explicitly accepted by the user.

**How to apply:** if re-invoked on ODY-282, treat all of the above as settled; don't propose x-request-id or per-call ids for GETs again.
