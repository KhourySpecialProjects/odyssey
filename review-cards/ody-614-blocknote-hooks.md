title: Fix hook calls in BlockNote image, latex and break blocks (ODY-614)
risk: 🟡 test on dev
---
## Description

Moves each block's render code into a named React component so hooks are called legally, and turns the `react-hooks/rules-of-hooks` lint rule from a warning into an error. Most of the diff is re-indentation.

**How it affects Odyssey:** Creators using the draft editor. Nobody else should see a difference.

**Files**
- `frontend/components/ui/blocknote/blocks/image-block.tsx, latex-block.tsx, slide-break-block.tsx, column-break-block.tsx`: render code moved into named components
- `frontend/.eslintrc.json`: `rules-of-hooks` is now an error

## Motivation and Context

These blocks called hooks inside an anonymous `render` function, which breaks React's rules and can crash or misbehave when the editor re-renders.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps:
  - `claude/ody-615-lib-types-lint`: `frontend/.eslintrc.json`
  - `claude/ody-616-components-lint`: `frontend/.eslintrc.json` (all three edit the rules block; expect a small conflict)
- Diff is large because of indentation; use "hide whitespace" when reviewing.
- No tests were added; the change should not alter behavior.

**How to test on dev**
1. Open a draft lesson and insert an image block, upload an image and resize it → works as before.
2. Insert a latex block and type an equation → preview renders and edits work.
3. Insert slide-break and column-break blocks → they show their labels and can be moved and deleted.
4. Reload the lesson and check the blocks look the same.

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
