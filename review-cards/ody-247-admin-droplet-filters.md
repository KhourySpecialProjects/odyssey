title: Admin droplets: filter by status, sort by date (ODY-247)
risk: 🟡 test on dev
kind: feature
---
Admins can now filter the droplets table by status (draft, edit, published) and sort it by created or updated date.
**Test on dev:** Open Admin → Droplets, tick a status filter and pick "Updated: newest" → the list shows only that status, in that order.
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
