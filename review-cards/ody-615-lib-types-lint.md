title: Tighten TypeScript lint rules in lib/ and types/ (ODY-615)
risk: 🔴 careful
kind: cleanup
---
The `any`, unused-variable, `prefer-const`, wrapper-type and unused-expression lint rules are now errors, and `lib/` and `types/` were changed to pass them (types only).
**Careful:** It edits many `"use server"` files (`actions.ts`, `requests/droplet.ts`, `groups.ts`, `lesson.ts` and more); the edits are types and renames only, but check that no function body changed.
**Test on dev:** CI covers it, no behaviour change.
**Overlaps:** `claude/ody-614-blocknote-hooks` and `claude/ody-616-components-lint` (`frontend/.eslintrc.json`); `claude/ody-911-remove-uuid` (`actions.ts`, `markdown-to-blocknote.ts`); `claude/ody-718-dead-request-functions` (`authorized-user.ts`, `feed.ts`, `lesson.ts`); `claude/ody-488-group-refresh` (`groups.ts`); `claude/ody-211-delete-draft` (`droplet.ts`); `claude/ody-897-remove-mark-addressed` (`types/index.d.ts`).
**Suggested reviewer:** `JaylenZeng`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
