title: Add droplet badge request functions and types (ODY-987)
risk: 🟡 test on dev
kind: feature
---
Adds the frontend request layer for the droplet badge store (`getPickedBadges` and related calls, types and a cache tag); no page uses it yet.

**Test on dev:** after the backend PR is deployed, call `getPickedBadges([<droplet id>])` from a server component or script → returns `{ ok: true, data: [{ dropletId, title, emblemSvg }] }`, and an empty or invalid id list returns `{ ok: false, error: "invalid" }`.
**Overlaps:** `claude/ody-488-group-refresh`, `claude/ody-718-dead-request-functions` (`frontend/lib/cache-tags.ts`, `frontend/testing/contract/strapi-query-catalog.ts`); `claude/ody-211-delete-draft`, `claude/ody-897-remove-mark-addressed`, `claude/ody-939-quiz-attempts` (`frontend/testing/contract/strapi-query-catalog.ts`). Stacked on `claude/ody-987-badge-store-backend`.
**Depends on:** the backend PR (`claude/ody-987-badge-store-backend`)
**Suggested reviewer:** `bradycai` (badges)

**Note:** Brady's ODY-989 to 992 build against `getPickedBadges(dropletIds: number[]): Promise<BadgeResult<PickedBadge[]>>`, with `PickedBadge = { dropletId, title, emblemSvg }` and `BadgeError = "invalid" | "not_found" | "conflict" | "failed"`. Don't change that interface without telling him.
**Note:** Request tests, contract tests, the response-format guard and `tsc` pass. Code diff is 189 lines.

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
