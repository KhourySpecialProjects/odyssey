title: Explore: Reset filters button on empty results (ODY-256)
risk: 🟡 test on dev
kind: feature
---
When Explore finds no droplets, the empty state now has a Reset filters button that clears filters, search and page but keeps the sort.
**Test on dev:** On Explore, search for a nonsense word → click Reset filters → the full list returns and the sort is unchanged.
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
