title: Add droplet badge store: schema, routes and pick rules (ODY-987)
risk: 🔴 careful
kind: feature
---
Adds a new `droplet-badge` content type and four token-protected routes (`POST /droplet-badges/options`, `POST /pick`, `GET /picked`, `GET /options`), plus a droplet lifecycle hook that keeps badges in sync; nothing in the app UI changes yet.

**Careful:** this adds a Strapi schema and new routes, so check `schema.json`, the `content-api-token` auth on every route in `routes/custom-droplet-badge.ts`, and the input validation in `src/lib/droplet-badges.ts`.
**Test on dev:** call `GET /api/droplet-badges/options?dropletId=<id>` with the API token → returns badge options for that droplet; a missing or bad `dropletId` returns 400.
**Overlaps:** `claude/ody-878-scan-fingerprint`, `claude/ody-915-prompt-saved-by`, `claude/ody-939-quiz-attempts` (`backend/types/generated/contentTypes.d.ts`, `backend/tests/helpers/fixtures.js`, `docs/agent/backend-architecture.md`); `claude/ody-211-delete-draft`, `claude/ody-897-remove-mark-addressed` (`docs/agent/backend-architecture.md`). Expect small merge conflicts in those generated and doc files. The frontend card branch is stacked on this one.
**Depends on:** nothing
**Suggested reviewer:** `bradycai` (badges)

**Note:** `contentTypes.d.ts` is develop's file plus only the new type. Regenerating it locally also pulls in unrelated Strapi version changes, which are left out on purpose.
**Note:** Backend tests (`droplet-badge`: 54 tests, the lifecycle tests and `no-entity-service`) pass. Code diff is 462 lines.

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
