title: Admin reports buttons and gaps match other admin tables (ODY-546)
risk: 🟢 skim
kind: bug
---
The row buttons and gaps in the Admin reports table were a slightly different size from the other admin tables; they now match.
**Test on dev:** Open Admin → Reports → the row buttons and gaps look like those in Admin → Droplets.
**Overlaps:** none
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
