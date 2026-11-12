title: Refresh button on group pages (ODY-488)
risk: 🔴 careful
kind: feature
---
Group pages now have a Refresh button that clears that group's cached data, so members and managers see changes without waiting up to 15 minutes.
**Careful:** New `refreshGroup` server action: it calls `requireRole`, then re-checks group membership from a fresh read before clearing the cache, so read that check closely.
**Test on dev:** On a group page you belong to, edit the group elsewhere and click Refresh → the page shows the new data; as a non-member the call is refused.
**Overlaps:** `claude/ody-615-lib-types-lint` (`lib/requests/groups.ts`); `claude/ody-718-dead-request-functions` (`cache-tags.ts`, `strapi-query-catalog.ts`); `claude/ody-897-remove-mark-addressed` (`strapi-query-catalog.ts`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
