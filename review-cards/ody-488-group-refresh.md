title: Group pages get a Refresh button to clear the cached view (ODY-488)
risk: 🔴 careful
---
## Description

Adds a Refresh button to group detail pages. It clears that group's cached data so new members or content show now, not after up to 15 minutes. The server checks that the caller belongs to the group, or is a SysAdmin.

**How it affects Odyssey:** Group members, admins, managers, creators and SysAdmins see it on `/g/<slug>`.

**Files**
- `frontend/components/group/refresh-group-button.tsx`: new button with spinner and toasts
- `frontend/app/(groups)/g/[slug]/page.tsx`: shows the button
- `frontend/lib/requests/groups.ts`: new `refreshGroup` server function; group read gets a per-group cache tag
- `frontend/lib/cache-tags.ts`: new `group(slug)` tag, documented
- `frontend/testing/contract/strapi-query-catalog.ts`: catalog entry
- `frontend/testing/requests/{groups.test.js,refresh-group.test.ts}, frontend/tests/components/group/refresh-group-button.test.tsx`: tests

## Motivation and Context

Group pages are cached for 900 seconds, so changes looked missing until the cache expired.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: `ody-718-dead-request-functions` (`cache-tags.ts`, `strapi-query-catalog.ts`); `ody-615-lib-types-lint` (`groups.ts`); `ody-897-remove-mark-addressed` (`strapi-query-catalog.ts`).
- New `"use server"` export `refreshGroup`: it calls `requireRole([])`, then reads membership fresh (`no-store`), and fails closed on any error.
- It only revalidates the one group's tag. Any signed-in user can call it, but non-members get `forbidden`.

**How to test on dev**
1. As a group member, open `/g/<slug>` → a Refresh button sits at the top right.
2. Add a member (or edit content) in another tab, then click Refresh → toast "Group refreshed" and the page shows the change.
3. Click it rapidly → only one request runs and the label reads "Refreshing…".
4. As a user outside the group (and not SysAdmin), call it → "Couldn't refresh group" toast.
5. As a SysAdmin on any group → works.

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
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
