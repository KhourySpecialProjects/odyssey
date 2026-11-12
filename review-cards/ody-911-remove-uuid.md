title: Use built-in crypto.randomUUID instead of the uuid package (ODY-911)
risk: 🔴 careful
kind: cleanup
---
The frontend now makes UUIDs with `crypto.randomUUID()` and drops the `uuid` package, so Jest no longer breaks on uuid 14.
**Careful:** Upload file names in `actions.ts` (a `"use server"` file) now come from `crypto.randomUUID()`; the names keep the same shape.
**Test on dev:** CI covers it, no behaviour change.
**Overlaps:** `claude/ody-615-lib-types-lint` (`actions.ts`, `markdown-to-blocknote.ts`); `claude/ody-924-spelling-without-ai` (`package.json`, `package-lock.json`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
