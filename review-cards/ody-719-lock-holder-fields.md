title: Lesson lock conflict returns only the holder's name and id (ODY-719)
risk: 🔴 careful
kind: bug
---
When a lesson is locked, the 409 response could include every field of the user holding the lock; it now returns only their id, first name and last name.
**Careful:** This is a backend response that could expose another user's data; check that the 409 path now goes through `toLockHolder`.
**Test on dev:** Open a lesson as a second user while another user holds the lock → the 409 response has `lockedBy` with just `id`, `firstName` and `lastName`.
**Overlaps:** none
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
