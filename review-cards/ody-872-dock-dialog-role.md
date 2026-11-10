title: Review panel dock is no longer a dialog on wide screens at load (ODY-872)
risk: 🟡 test on dev
---
## Description

On screens 1280px wide or more, the review panel dock was briefly given `role="dialog"` and `aria-modal` on its first render. It now only becomes a dialog after the screen size has been read.

**How it affects Odyssey:** Creators and reviewers using the review panel in the draft editor, mainly screen-reader users.

**Files**
- `frontend/components/draft/review/review-panel-dock.tsx`: dialog mode waits until the screen-size check has run
- `frontend/tests/components/draft/review/review-panel-dock-role.test.tsx`: new tests for server render, wide and narrow

## Motivation and Context

The screen-size check returns false on the first render, so wide screens were treated as narrow and the panel announced itself as a modal dialog before switching back.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: none
- Below 1280px the panel is still a modal dialog; the test covers this.

**How to test on dev**
1. Open a draft with the review panel on a window 1280px or wider → the panel is a plain side panel, not a dialog (check in the accessibility inspector right after load).
2. Resize below 1280px and open the panel → it opens as a modal drawer with the title "Reviewer Transcript".

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
