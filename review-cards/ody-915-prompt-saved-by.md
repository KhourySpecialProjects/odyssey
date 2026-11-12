title: Scorecard prompts record and show who saved them (ODY-915)
risk: 🔴 careful
kind: feature
---
Saving the Score with AI prompts now records who saved them and when, and the admin Scorecard prompts page shows "Last saved by … on …".
**Careful:** Adds `promptUpdatedBy` and `promptUpdatedAt` to a Strapi schema; the saver id comes from the session in `saveAiScoringPrompt`, and the backend takes a `userId` in the body, so check the backend can't be called with someone else's id.
**Test on dev:** As a SysAdmin, save the Scorecard prompts → the page shows your name and today's date.
**Overlaps:** `claude/ody-878-scan-fingerprint` (`contentTypes.d.ts`, `backend-architecture.md`); `claude/ody-897-remove-mark-addressed` (`backend-architecture.md`).
**Suggested reviewer:** `JaylenZeng`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
