title: Quiz answers use valid HTML and keep click-to-select (ODY-469)
risk: 🟢 skim
kind: bug
---
Quiz answers used to nest a div inside a label, which is invalid HTML; each radio and checkbox now keeps its name and clicking the answer still selects it.
**Test on dev:** Open a quiz and click the text of an answer → it selects; a screen reader reads the answer as the control's name.
**Overlaps:** `claude/ody-616-components-lint` (`quiz-question.tsx`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
