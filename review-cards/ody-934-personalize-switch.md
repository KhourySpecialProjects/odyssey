title: Add admin switch for Mentor personalization, off by default (ODY-934)
risk: 🔴 careful
kind: feature
---
Adds a `personalize` on/off switch (default off) to Mentor's settings in the admin; nothing changes for students yet.

**Careful:** this adds a boolean field to the `mentor-setting` Strapi schema, so check the field, its default and that existing rows (null) read as off.
**Test on dev:** open Mentor Settings in the Strapi admin → a new "personalize" toggle shows, off, and Mentor behaves as before.
**Overlaps:** `claude/ody-934-learner-context` is stacked on this branch; Brady's ODY-968 and Awad's ODY-935 touch none of these files.
**Suggested reviewer:** bradycai

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
