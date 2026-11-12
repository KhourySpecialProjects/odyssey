title: Fix hook usage in BlockNote blocks and make the lint rule an error (ODY-614)
risk: 🟢 skim
kind: cleanup
---
The image, latex, slide-break and column-break editor blocks now call React hooks from named components, and the `rules-of-hooks` lint rule is now an error.
**Test on dev:** CI covers it, no behaviour change.
**Overlaps:** `claude/ody-615-lib-types-lint` and `claude/ody-616-components-lint` (`frontend/.eslintrc.json`).
**Suggested reviewer:** `JaylenZeng`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
