title: @aws-sdk/client-s3 3.1170.0 with a regenerated backend lockfile (replaces Dependabot #1431)
risk: 🟢 skim
kind: bug
---
Dependabot's PR bumped the backend S3 client but left the lockfile out of sync, so the backend build and tests failed at `npm ci`. This bumps it to 3.1170.0 with a fresh lockfile, and CI installs cleanly again.

Supersedes #1431.

**Checks:** checks: prettier ✓ · eslint ✓ · frontend jest ✓ 9049 · backend jest ✓ 636 · frontend build ✓ · ckeditor ✓ · backend build ✓ · 2dbda8c68
**Test on dev:** Upload an image in the Strapi admin → it saves to S3 and shows in the media library.
**Overlaps:** open Dependabot PRs #1427 (Strapi group) and #1422 (ckeditor5) also change `backend/package.json` and `backend/package-lock.json`. Whichever merges second needs its lockfile regenerated.
**Suggested reviewer:** AwadBuisir10

**Note:** Only `@aws-sdk/client-s3` moves among the backend's direct dependencies. The lockfile also picks up newer versions of its own AWS SDK sub-packages. No backend code imports the client directly: Strapi's S3 upload provider uses the SDK. Backend tests: 636 of 636 pass, and the admin build succeeds.

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
