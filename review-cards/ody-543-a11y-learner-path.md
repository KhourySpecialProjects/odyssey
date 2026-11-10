title: Fix accessibility on the learner path: skip link, landmarks, labels (ODY-543)
risk: 🟡 test on dev
---
## Description

Adds a "Skip to main content" link and keeps one `main` landmark per page. Icon-only buttons get labels, made-up ARIA roles (like `role="save"`) are removed, and clickable divs and spans become real buttons and links.

**How it affects Odyssey:** Everyone using the app, mostly keyboard and screen-reader users. Touches the header, feed, friends, notes, group due dates and admin and settings layouts.

**Files**
- `frontend/app/layout.tsx`: skip link and `id="main-content"` on main
- `frontend/app/(general)/admin/layout.tsx, settings/layout.tsx, components/draft/draft-layout-shell.tsx, droplets/droplet-layout-shell.tsx`: inner `main` becomes `div`
- `frontend/app/globals.css`: review-tag rule now targets `[data-review-panel]`, not `main`
- `frontend/components/friends/*, feed/*, droplets/author-block.tsx`: buttons and links instead of clickable spans and divs; labels
- `frontend/components/header/index.tsx, group/droplet-due-date-block.tsx, droplets/notes-summary-client.tsx and others`: aria labels, invalid roles removed
- `frontend/tests/components/*`: updated and new tests

## Motivation and Context

Pages had several `main` landmarks, invalid roles, unlabelled icon buttons and click handlers on non-interactive elements, which fail accessibility checks.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps:
  - `claude/ody-154-notes-close-animation`, `claude/ody-472-no-drag-paste`: `frontend/app/globals.css`
  - `claude/ody-527-tailwind-classes`: `frontend/components/admin/progress/student-progress-list.tsx`
- The review-tag CSS rule in `globals.css` now relies on a `data-review-panel` attribute; confirm the review panel still sets it on this branch's base.
- Author block is now a link, so open-in-new-tab works; the draft preview stays non-clickable.
- Friend and feed text that used to be spans are now buttons; check their look is unchanged.

**How to test on dev**
1. Load any page, press Tab once → a "Skip to main content" link shows; Enter moves focus to the page content.
2. Use a screen reader or the accessibility inspector on a droplet page → exactly one main landmark.
3. Open the friends page and click a friend's name or photo → opens their profile; the remove button is labelled and works.
4. Open the feed and use the type filter → each option has a label and clicking it filters.
5. Open the header on a small screen → menu button is labelled "Toggle navigation menu" and opens the menu.
6. Open a droplet in the draft editor with the review panel → review tag styling still shows.

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
