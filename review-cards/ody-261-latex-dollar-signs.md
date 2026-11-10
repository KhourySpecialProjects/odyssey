title: Dollar signs in lessons stay plain text unless they are real math (ODY-261)
risk: 🟡 test on dev
---
## Description

Text like "it costs $5 and $10" is no longer turned into LaTeX, in the editor or in published lessons. Math like `$x^2 + y$` still renders, and a whole block typed as `$$...$$` still becomes a LaTeX block.

**How it affects Odyssey:** Creators see it in the lesson editor; learners see it in the lesson reader and present mode.

**Files**
- `frontend/lib/latex-dollars.ts`: new matcher for `$...$` and `$$...$$` using Pandoc-style rules; `\$` is a literal dollar
- `frontend/lib/blocknote/latex-shortcut.ts`: new: only a whole-block `$$...$$` triggers LaTeX
- `frontend/components/draft/lesson/blocknote-editor-client.tsx`: uses the new shortcut
- `frontend/components/droplets/lessons/generic-block-renderer.tsx, presentation/presentation-block-renderer.tsx`: use the shared matcher
- `frontend/tests/components/dollar-math-rendering.test.tsx, frontend/tests/lib/blocknote/latex-shortcut.test.ts`: tests

## Motivation and Context

Prices and other dollar amounts were being swallowed as math, which broke the sentence in the editor and on the page.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: `ody-616-components-lint` (`blocknote-editor-client.tsx`, `generic-block-renderer.tsx`); `ody-446-callout-style` (`presentation-block-renderer.tsx`, different lines).
- Behaviour change for creators: typing `$x$` inline in the editor no longer converts to a LaTeX block. They must use the slash menu or `$$...$$`. Confirm this is wanted.
- Existing lessons that relied on `$ x $` with spaces, or a closing `$` followed by a digit, will now show as text.

**How to test on dev**
1. In the lesson editor, type `It costs $5 and $10` in a paragraph → stays plain text.
2. Type `$$x^2$$` alone in a block → becomes a LaTeX block.
3. Type `$x^2$` inline → stays text (no conversion).
4. Publish or preview a lesson with `$5 and $10` and `$x^2 + y$` → the first is text, the second renders with KaTeX.
5. Open the same lesson in present mode → same result.

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
