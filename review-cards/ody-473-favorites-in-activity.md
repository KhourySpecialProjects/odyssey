title: Favorited droplets show in Activity without enrolling (ODY-473)
risk: 🟡 test on dev
kind: bug
---
Favorited droplets were missing from Activity unless you had enrolled in them; they now appear either way.
**Test on dev:** Favorite a droplet you haven't started, then open Activity → it appears in the favorites list.
**Overlaps:** none
**Suggested reviewer:** `bradycai`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
