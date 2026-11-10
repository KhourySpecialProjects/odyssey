title: Replace Tailwind classes that did nothing with real ones (ODY-527)
risk: 🟡 test on dev
---
## Description

Swaps 25 files' worth of Tailwind class names that do not exist (for example `text-muted-foreground`, `flex-0`, `text-md`, `align-center`) for real utilities, so the intended color, size and alignment now apply.

**How it affects Odyssey:** Learners, creators and admins. Small visual changes in the footer, droplet and group cards, user dropdown, admin lists, charts, alert dialogs and badges. Most text should now look muted grey, as intended.

**Files**
- `frontend/components/droplets/droplet-tile.tsx, group/*, playlists/playlist-card.tsx`: tag row, muted text, text size
- `frontend/components/ui/chart.tsx, badge.tsx, alert-dialog.tsx`: muted text and focus ring colors
- `frontend/components/footer/page.tsx, droplets/footer.tsx, header/user-dropdown.tsx`: text size and alignment
- `frontend/components/admin/*, draft/add-*.tsx, explore/filter.tsx, explore/sort.tsx`: muted text and alignment
- `frontend/app/(droplets)/d/[slug]/page.tsx, frontend/app/(editing)/draft/d/[slug]/page.tsx`: alignment

## Motivation and Context

The old class names were not defined in the Tailwind config, so Tailwind ignored them and the styles never applied. The second commit adjusts a few swaps so the footer, bug tooltip, explore buttons, tiptap toolbar and compact droplet title look the way they do today.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps:
  - `claude/ody-496-explore-cards-align`: `frontend/components/droplets/droplet-tile.tsx`
  - `claude/ody-472-no-drag-paste`: `frontend/components/droplets/droplet-tile.tsx`
  - `claude/ody-446-callout-style`, `claude/ody-529-lesson-progress`, `claude/ody-616-components-lint`: `frontend/components/droplets/lessons/lesson-renderer.tsx`
  - `claude/ody-529-lesson-progress`: `frontend/components/droplets/footer.tsx`
  - `claude/ody-543-a11y-learner-path`: `frontend/components/admin/progress/student-progress-list.tsx`
- Visual only, but it touches many screens. No code logic changes.
- Removes `scale-x-80` from a banner in `components/footer/page.tsx`; that banner is now full width on small screens.
- Side effects to confirm: muted text may look lighter, and `text-md` is now `text-base` (16px).

**How to test on dev**
1. Open a droplet page and its footer → muted text is grey, text sizes look normal.
2. Open `/explore` and use the filter and sort controls → labels and spacing look right.
3. Open a group page with droplets, playlists and voyages → cards and lists look aligned.
4. Open the user dropdown in the header and an admin statistics page → no broken layout; chart axis text is readable in light and dark mode.
5. Open a bug report dialog and an alert dialog → focus ring shows when tabbing.

## Screenshots (if appropriate):

<!-- add a screenshot from dev -->

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
