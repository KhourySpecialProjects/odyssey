title: Explore droplet cards line up in each row (ODY-496)
risk: 🟡 test on dev
kind: bug
---
Explore cards had uneven heights; they now share a row height, with long titles clamped and the footer pinned to the bottom.
**Test on dev:** Open Explore with a mix of short and long titles → cards in a row are the same height and footers line up.
**Overlaps:** `claude/ody-472-no-drag-paste` and `claude/ody-527-tailwind-classes` (`droplet-tile.tsx`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
