title: Stop the frontend container from printing secrets at startup (ODY-623)
risk: 🔴 careful
---
## Description

Removes six lines from `set_env.sh` that printed the secrets directory listing, the full contents of the secrets file, and the PostHog environment variables to the container logs.

**How it affects Odyssey:** Nobody sees it in the app. Developers and ops reading container logs will no longer see the secrets.

**Files**
- `frontend/set_env.sh`: delete the `ls`, `cat` and `env | grep` debug lines

## Motivation and Context

Each container start wrote secret values into the logs. Removing a hard-coded debug dump keeps them out of the log store.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: none
- Touches env and secrets handling, so it is marked careful, but it only deletes log lines. The loop that exports each key is unchanged.
- Secrets that were already logged in the past are still in old logs; consider rotating them and clearing old logs (not in this PR).

**How to test on dev**
1. Deploy to dev and open the frontend container logs → "Found secrets file" and "Exported <key>" lines appear, no file contents or PostHog values.
2. Open the dev site and sign in → the app works, so the variables were still exported.

## Screenshots (if appropriate):

<!-- add a screenshot from dev -->

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
