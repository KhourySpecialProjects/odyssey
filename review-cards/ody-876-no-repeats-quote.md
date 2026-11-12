title: Repeated-paragraph flags quote the paragraph (ODY-876)
risk: 🟡 test on dev
kind: feature
---
The Overview scan's "no repeats" flags now quote the first words of the repeated paragraph instead of saying "this paragraph".
**Test on dev:** Scan a droplet with the same paragraph in two lessons → the flag shows the opening words in quotes and names the other lesson.
**Overlaps:** `claude/ody-924-spelling-without-ai` (`overview-scan/config.ts`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
