title: Stop printing secrets to container logs on start (ODY-623)
risk: 🔴 careful
kind: bug
---
The frontend start script used to print the secrets file, the secrets folder listing and the PostHog variables to the logs; it no longer does.
**Careful:** This is the secret-handling script `set_env.sh`; check that only the print lines were removed and the lines that load the values still run.
**Test on dev:** Start the frontend container and read its logs → no secrets file contents or PostHog values appear, and the app still starts.
**Overlaps:** none
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
