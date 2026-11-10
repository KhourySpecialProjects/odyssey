title: Make TypeScript lint rules errors and fix them in lib/ and types/ (ODY-615)
risk: 🔴 careful
---
## Description

Replaces `any` with real types, removes unused variables and uses `const` where needed across `lib/` and `types/`. The five related lint rules (`no-explicit-any`, `no-unused-vars`, `prefer-const`, `no-wrapper-object-types`, `no-unused-expressions`) become errors.

**How it affects Odyssey:** Nobody sees a change; it is internal. It does edit server-action files (`lib/actions.ts`, several `lib/requests/*` files) but only types, variable names and the unused `catch (e)` binding.

**Files**
- `frontend/.eslintrc.json`: five rules go from warn to error
- `frontend/lib/requests/droplet.ts, groups.ts, lesson.ts, user-activity.ts, posthog.ts, voyage-enrollment.ts`: types instead of `any`
- `frontend/lib/actions.ts, auth/options.ts, utils.ts, blocknote/*`: small type and unused-variable fixes
- `frontend/types/index.d.ts, strapi.d.ts`: type fixes
- `frontend/lib/import/__tests__/rate-limiter.test.ts`: lint fix in a test

## Motivation and Context

Warnings were piling up and hid real problems. Making these rules errors keeps new `any` and unused code out.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps:
  - `claude/ody-614-blocknote-hooks`, `claude/ody-616-components-lint`: `frontend/.eslintrc.json`
  - `claude/ody-718-dead-request-functions`: `frontend/lib/requests/authorized-user.ts`, `feed.ts`, `lesson.ts`
  - `claude/ody-211-delete-draft`: `frontend/lib/requests/droplet.ts`
  - `claude/ody-488-group-refresh`: `frontend/lib/requests/groups.ts`
  - `claude/ody-897-remove-mark-addressed`: `frontend/types/index.d.ts`
  - `claude/ody-911-remove-uuid`: `frontend/lib/actions.ts`, `frontend/lib/blocknote/markdown-to-blocknote.ts`
- Marked careful because it edits `"use server"` files. No export gained, lost or changed behavior; only types changed.
- Several changed exports (for example `createDroplet`, `duplicateDroplet`, `favoriteDroplet`, `updateGroup`, `enrollUsers`) are not guarded in code. They are listed as pending auth in `server-action-auth-allowlist.ts`. I did not confirm every changed export is guarded or listed (for example `claimNodeForUser`), so the "use server" box is left unticked.
- `createDroplet` now takes a plain `Pick<...>` type instead of a Zod-derived type; same shape.
- The root lint run should be re-checked after merging with 614 and 616.

**How to test on dev**
1. Open a draft, edit and save a lesson → saves as before.
2. Duplicate a droplet → copy has the same lessons and blocks.
3. Favorite and unfavorite a droplet → heart updates.
4. Open a group, assign a due date to a droplet and a playlist → dates show for members.
5. Open the admin statistics page → PostHog numbers load.

## Screenshots (if appropriate):

<!-- add a screenshot from dev -->

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [ ] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
