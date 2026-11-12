title: Dollar amounts like "$5 and $10" stay plain text (ODY-261)
risk: 🟡 test on dev
kind: bug
---
Text such as "it costs $5 and $10" used to be treated as math; it now stays plain text in the editor and in published lessons, while real math like $x^2 + y$ still renders.
**Test on dev:** In a lesson, type `It costs $5 and $10`, save and open the published lesson → the text shows as typed, with no math formatting.
**Overlaps:** `claude/ody-616-components-lint` (`blocknote-editor-client.tsx`, `generic-block-renderer.tsx`); `claude/ody-446-callout-style` (`presentation-block-renderer.tsx`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
