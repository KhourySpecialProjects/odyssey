title: Bug fixes: lesson content (ODY-261, ODY-469)
risk: 🟡 test on dev
kind: bug
---
Small bug fixes bundled for one review. Each fix is its own commit.

### ODY-261 · Dollar amounts like "$5 and $10" stay plain text

Text such as "it costs $5 and $10" used to be treated as math; it now stays plain text in the editor and in published lessons, while real math like $x^2 + y$ still renders.

**Test on dev:** In a lesson, type `It costs $5 and $10`, save and open the published lesson → the text shows as typed, with no math formatting.

### ODY-469 · Quiz answers use valid HTML and keep click-to-select

Quiz answers used to nest a div inside a label, which is invalid HTML; each radio and checkbox now keeps its name and clicking the answer still selects it.

**Test on dev:** Open a quiz and click the text of an answer → it selects; a screen reader reads the answer as the control's name.

**Overlaps:** `claude/ody-616-components-lint` (`blocknote-editor-client.tsx`, `generic-block-renderer.tsx`, `quiz-question.tsx`); `claude/ody-446-callout-style` (`presentation-block-renderer.tsx`). No open PR touches these files.

**Suggested reviewer:** `AwadBuisir10`

**Replaces:** the separate branches `claude/ody-261-latex-dollar-signs`, `claude/ody-469-quiz-label-html`, which won't get their own PRs.

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
