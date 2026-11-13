title: Draw the yellow highlight as a softer pastel (ODY-949)
risk: 🟡 test on dev
kind: feature

---

The yellow highlight now shows as a soft pastel (#fef08a) in lessons, the selection toolbar, note cards, the notes filter and the notes PDF, and saved highlights keep their stored colour, so none are changed or lost.

**Test on dev:** open a lesson with an old yellow highlight and make a new yellow one → both show the pastel yellow, and the notes card, the filter swatch and the notes PDF match.
**Overlaps:** ODY-947's planned colour store touches `highlight-layer.tsx`. Awad has local ODY-785 highlighting work. The repo's check-branches CI rule currently fails PRs from `claude/` branches until a fix adding `claude/` lands.
**Suggested reviewer:** `bradycai` (highlighting)

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
