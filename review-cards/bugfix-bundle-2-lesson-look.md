title: Bug fixes: lesson look and panels (ODY-446, ODY-914)
risk: 🟡 test on dev
kind: bug
---
Small bug fixes bundled for one review. Each fix is its own commit.

**Stacked on bundle 1:** open this PR against `claude/bugfix-bundle-1-lesson-content`, and merge bundle 1 first.

### ODY-446 · Callouts look the same in reader, present mode and editor

Callouts in the lesson reader and present mode looked different from the editor; they now share one icon, colour, padding and radius.

**Test on dev:** Add a callout in the editor, then view it in the lesson reader and in present mode → all three look the same.

### ODY-914 · Mentor sidebar and Notes panel stay above the footer

The Mentor sidebar and Notes panel could slide under the site footer, and the Help and Notes buttons overlapped them; both now sit above the footer and the buttons sit fully beside the panels.

**Test on dev:** Open a lesson, scroll to the footer and open Mentor → the panel stays above the footer and the Help and Notes buttons don't overlap it.

**Overlaps:** `claude/ody-154-notes-close-animation`, `claude/ody-195-wider-lesson-content` (`droplet-lesson-wrapper.tsx`, `lesson-panel.ts`, `droplet-lesson-wrapper.test.tsx`); `claude/ody-527-tailwind-classes`, `claude/ody-529-lesson-progress`, `claude/ody-616-components-lint` (`lesson-renderer.tsx`); `claude/integration-2026-11-10` (all of the above files).

**Suggested reviewer:** `AwadBuisir10`

**Replaces:** the separate branches `claude/ody-446-callout-style`, `claude/ody-914-mentor-sheet-stacking`, which won't get their own PRs.

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
