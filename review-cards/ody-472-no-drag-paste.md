title: Links, buttons and cards can't be dragged into text boxes (ODY-472)
risk: 🟡 test on dev
---
## Description

Link-style buttons, droplet cards and other links and images can no longer be dragged into a text box or the editor, where they pasted their URL.

**How it affects Odyssey:** Everyone sees it across the app. The lesson editor's own drag handles and image blocks still work.

**Files**
- `frontend/app/globals.css`: turns off native drag for links and images outside the editor
- `frontend/components/ui/button.tsx`: `draggable={false}`
- `frontend/components/droplets/droplet-tile.tsx`: `draggable={false}` on tile links
- `frontend/tests/components/**`: tests, including an updated sortable-lesson test

## Motivation and Context

Dragging a link or card by accident and dropping it into a field pasted a URL.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: `ody-154-notes-close-animation` and `ody-543-a11y-learner-path` (`globals.css`); `ody-496-explore-cards-align` and `ody-527-tailwind-classes` (`droplet-tile.tsx`).
- The CSS is app-wide, so check anything that relied on dragging a link or image out of the page.

**How to test on dev**
1. On Explore, drag a droplet card into the search box → nothing is pasted.
2. Drag a button that is a link (e.g. "Start") into a text field → nothing is pasted.
3. In the lesson editor, use the block drag handle to reorder → still works.
4. Drag an image block in the editor → still works.
5. Select text with the mouse on any page → selection is unaffected.

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
