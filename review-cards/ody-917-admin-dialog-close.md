title: Add User and Droplet Analytics dialogs show one close button (ODY-917)
risk: 🟡 test on dev
kind: bug
---
The Add User and Droplet Analytics admin dialogs showed two close buttons; they now show one.
**Test on dev:** Open Admin → Users → Add User → the dialog has a single X that closes it.
**Overlaps:** none
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
