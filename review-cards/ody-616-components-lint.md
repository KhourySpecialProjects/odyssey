title: Make hooks, key and entity lint rules errors in components/ (ODY-616)
risk: 🟢 skim
kind: cleanup
---
React hooks, JSX key and unescaped-entity lint rules are now errors in `components/`, and each existing exception carries a comment saying why.
**Test on dev:** CI covers it, no behaviour change.
**Overlaps:** `claude/ody-614-blocknote-hooks` and `claude/ody-615-lib-types-lint` (`frontend/.eslintrc.json`); `claude/ody-261-latex-dollar-signs` (`blocknote-editor-client.tsx`, `generic-block-renderer.tsx`); `claude/ody-281-delete-spinners` (`blocks/callout.tsx`); `claude/ody-211-delete-draft` (`content-action-button.tsx`, `draft/sidebar.tsx`); `claude/ody-471-preview-sync` (`draft/sidebar.tsx`); `claude/ody-446-callout-style`, `claude/ody-527-tailwind-classes` and `claude/ody-529-lesson-progress` (`lessons/lesson-renderer.tsx`); `claude/ody-469-quiz-label-html` (`quiz-question.tsx`); `claude/ody-529-lesson-progress` (`droplets/sidebar.tsx`).
**Suggested reviewer:** `JaylenZeng`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
