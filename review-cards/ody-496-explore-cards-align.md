title: Keep Explore droplet cards the same height, footer at the bottom (ODY-496)
risk: 🟡 test on dev
---
## Description

Droplet cards in grids now fill their grid cell, cut long titles to two lines, and keep the footer (author, favorite button) at the bottom of the card.

**How it affects Odyssey:** Learners and creators see it on Explore and on any other page that lists droplet cards. Cards in a row now line up.

**Files**
- `frontend/components/droplets/droplet-tile.tsx`: card is a full-height flex column, title clamped, footer pushed down
- `frontend/tests/components/droplets/droplet-tile.test.tsx`: new test for the layout classes

## Motivation and Context

Cards in the same row had different heights and the footer floated at different spots, depending on title and description length. This makes the rows even.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps:
  - `claude/ody-527-tailwind-classes`: `frontend/components/droplets/droplet-tile.tsx` (527 changes `flex-0` to `flex-none` on the tag row; different lines, may need a small rebase)
  - `claude/ody-472-no-drag-paste`: `frontend/components/droplets/droplet-tile.tsx`
- The card link now has `block h-full`, so the whole cell is clickable. Check hover and focus outlines still look right.
- The test checks CSS class names, not real pixel heights, so look at it in a browser.

**How to test on dev**
1. Open `/explore` with a mix of short and very long droplet titles → cards in each row are the same height, titles stop at two lines.
2. Find a card with no rating → the footer sits at the bottom of the card.
3. Find a card with a rating → the stars sit at the bottom and the footer is right under them.
4. Check the same cards on a phone-width window and in dark mode → no overlap or cut-off text.

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
