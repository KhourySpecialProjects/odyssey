title: Lock 409 returns only the holder's id and name (ODY-719)
risk: 🟡 test on dev
---
## Description

When someone tries to lock a lesson that another editor already holds, the 409 response now returns the holder as just `{ id, firstName, lastName }`. Before, it returned every column of that user.

**How it affects Odyssey:** Creators opening a lesson that someone else is editing. The "locked by <name>" message looks the same; the extra user fields are no longer sent.

**Files**
- `backend/src/api/lesson/controllers/custom-lesson.ts`: `toLockHolder` helper used for the lock-status and 409 responses
- `backend/tests/api/lesson-lock.test.js`: new tests for the exact fields

## Motivation and Context

Strapi returns every column of a populated user. The earlier fix trimmed the lock-status response but the 409 from acquiring a lock still returned the whole record.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: none
- Backend only; no schema change. The response shape matches what the frontend already expects.

**How to test on dev**
1. As editor A, open a draft lesson so it is locked → editor sees it as theirs.
2. As editor B, open the same lesson → the "locked by A" message shows A's name.
3. In dev tools, check the 409 response body → `lockedBy` has only `id`, `firstName` and `lastName`.
4. Check `lock-status` for the same lesson → same three fields.

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
