title: Replace Tailwind classes that don't exist with real ones (ODY-527)
risk: 🟡 test on dev
kind: cleanup
---
Class names that Tailwind didn't define (so did nothing) are replaced with real utilities, so the intended muted text, sizing and alignment now apply in about 25 components.
**Test on dev:** Open the footer, Explore filter and sort, and a droplet tile → text and spacing look right; no layout is broken.
**Overlaps:** `claude/ody-543-a11y-learner-path` (`student-progress-list.tsx`); `claude/ody-472-no-drag-paste` and `claude/ody-496-explore-cards-align` (`droplet-tile.tsx`); `claude/ody-529-lesson-progress` (`footer.tsx`, `lessons/lesson-renderer.tsx`); `claude/ody-446-callout-style` and `claude/ody-616-components-lint` (`lessons/lesson-renderer.tsx`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
