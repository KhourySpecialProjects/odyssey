title: Remove three unused request functions (ODY-718)
risk: 🔴 careful
kind: cleanup
---
Removes `fetchAnnouncementById`, `fetchContentEditors` and `completeLesson`, which nothing calls, along with their tests and auth-allowlist entries.
**Careful:** It deletes exported `"use server"` functions and their allowlist entries; I found no remaining callers on the branch, but confirm none exist.
**Test on dev:** CI covers it, no behaviour change.
**Overlaps:** `claude/ody-615-lib-types-lint` (`authorized-user.ts`, `feed.ts`, `lesson.ts`); `claude/ody-488-group-refresh` (`cache-tags.ts`, `strapi-query-catalog.ts`); `claude/ody-897-remove-mark-addressed` (`strapi-query-catalog.ts`); `claude/ody-211-delete-draft` (`server-action-auth-allowlist.ts`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
