# The v4 response header changes the shape only

Date: 2026-10-06
Author: Jaylen Zeng + Claude (ODY-605)
Status: new

## What we learned

`Strapi-Response-Format: v4` keeps `{ data: { id, documentId, attributes } }`, but nothing else reverts to v4. Numeric single-entry URLs still return 404, unknown query/body keys still return 400, and core DELETE returns an empty 204 even for a missing documentId.

## Why it matters

Dropping the header or "fixing" a 404 by removing it does nothing, and `res.json()` on a DELETE throws on the empty body.

## Evidence

- `frontend/lib/strapi-response.ts` (`readJsonOrNull`)
- `scripts/strapi-v5-delete-204/smoke-delete-204.sh`
- `frontend/testing/lib/strapi-response-format-guard.test.ts`
