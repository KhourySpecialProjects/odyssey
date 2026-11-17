title: Students can turn Mentor personalization off, and the notice says what Mentor uses (ODY-935)
risk: 🔴 careful
kind: feature
---

Students get a "Personalize Mentor" switch in Settings (on by default), and the Mentor notice now says what Mentor sends and links to that switch.

**Review fixes:** Across two review rounds, a failed save now reverts the Mentor switch and shows an error, the switch is announced as a switch with a visible focus ring, the help text matches the notice, and the profile-visibility switch and photo removal also show an error (and keep their old state) when saving fails.

**Careful:** New boolean `mentorPersonalization` on the `authorized-user` content type (default true). It is self-only: only the signed-in user can change their own value, and an admin can't set another user's.

**Test on dev:** Open Settings, turn "Personalize Mentor" off, reload and check it stays off; then open a lesson's Mentor panel and check the new notice (with a Settings link) shows once.

**Overlaps:** ODY-934 (calls `studentAllowsPersonalization`), Settings page

**Suggested reviewer:** `JaylenZeng`

## Checklist:

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
