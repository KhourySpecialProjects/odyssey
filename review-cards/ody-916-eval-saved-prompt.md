title: Eval script can run the saved Score with AI prompt (ODY-916)
risk: 🟢 skim
kind: feature
---
The ODY-813 eval script can now run the saved Score with AI prompt with `--saved-prompt` and prints that prompt's version in its report.
**Test on dev:** Run the eval with `--saved-prompt` → the report shows the saved prompt's version.
**Overlaps:** none
**Suggested reviewer:** `JaylenZeng`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
