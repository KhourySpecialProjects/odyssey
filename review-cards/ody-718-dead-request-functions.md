title: Remove three unused request functions (ODY-718)
risk: 🔴 careful
---
## Description

Deletes `fetchAnnouncementById`, `fetchContentEditors` and `completeLesson`, which nothing calls, plus their tests, contract-catalog entries and auth-allowlist lines.

**How it affects Odyssey:** Nobody sees it; it is dead code.

**Files**
- `frontend/lib/requests/authorized-user.ts, feed.ts, lesson.ts`: delete the three functions
- `frontend/lib/cache-tags.ts`: comment no longer mentions `completeLesson`
- `frontend/testing/contract/strapi-query-catalog.ts, testing/security/server-action-auth-allowlist.ts`: remove entries for them
- `frontend/testing/requests/*`: tests for them removed

## Motivation and Context

The three functions had no callers. `completeLesson` pointed to an endpoint that does not exist. Keeping unguarded server actions around is a security risk and extra upkeep.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps:
  - `claude/ody-615-lib-types-lint`: `frontend/lib/requests/authorized-user.ts`, `feed.ts`, `lesson.ts`
  - `claude/ody-488-group-refresh`: `frontend/lib/cache-tags.ts`, `frontend/testing/contract/strapi-query-catalog.ts`
  - `claude/ody-897-remove-mark-addressed`: `frontend/testing/contract/strapi-query-catalog.ts`
  - `claude/ody-211-delete-draft`: `frontend/testing/security/server-action-auth-allowlist.ts`
- Marked careful because the three functions were exports in `"use server"` files. They were unguarded and were in the allowlist (as pending); both are removed together, so nothing new is unguarded.
- Please confirm with a repo-wide search that nothing imports the three names.

**How to test on dev**
No manual test: dead code removal, nothing calls these functions; CI (tests and the contract and auth-allowlist checks) covers it.

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
