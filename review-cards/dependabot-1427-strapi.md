title: Strapi 5.61.1 → 5.62.0 with a regenerated backend lockfile (replaces Dependabot #1427)
risk: 🟡 test on dev
kind: bug
---
Upgrades the Strapi backend to 5.62.0 and regenerates the backend lockfile that Dependabot's PR left out of sync (`npm ci` failed on missing `date-fns` and `yaml`).

Supersedes #1427. Close it once this merges.

**Careful:** CLAUDE.md's Strapi line moves to 5.62 (Jaylen okayed 5.62). The lockfile picks up new versions of Strapi's own dependencies, including the Strapi design system (2.2.4 → 2.3.1) and `stream-chain` 2 → 4 (used only by Strapi's data transfer). No test needed changes, and every other top-level backend dependency resolves to the same version as on develop.
**Checks:** checks: prettier ✓ · eslint ✓ · frontend jest ✓ 9049 · backend jest ✓ 636 · frontend build ✓ · ckeditor ✓ · backend build ✓ · ae03c66b3
**Test on dev:** Sign in to the Strapi admin, edit and save a droplet, and upload an image → it saves and the image lands on S3.
**Overlaps:** #1438 (`claude/dependabot-1431-aws-sdk`, `@aws-sdk/client-s3`), #1431 and #1422 (ckeditor5) also change `backend/package.json` and `backend/package-lock.json`. Whichever merges second regenerates the lockfile.
**Suggested reviewer:** AwadBuisir10

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
