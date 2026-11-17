title: Strapi 5.56 → 5.61.1 with a regenerated backend lockfile (replaces Dependabot #1277)
risk: 🟡 test on dev
kind: bug
---
Upgrades the Strapi backend to 5.61.1 and regenerates the backend lockfile that Dependabot's PR broke.

Supersedes #1277, which now asks for 5.62.0. Close it once this merges.

**Careful:** CLAUDE.md's Strapi line moves to 5.61 (Jaylen okayed 5.61.1). The lockfile picks up new versions of Strapi's own dependencies. Strapi 5.61 no longer emits events nobody listens to, so the publish-event test now registers a listener, and webhooks still get events.
**Test on dev:** Sign in to the Strapi admin, edit and save a droplet, upload an image to S3, and check that a webhook (if any are configured) still fires on publish.
**Overlaps:** none
**Suggested reviewer:** Jaylen

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [ ] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
