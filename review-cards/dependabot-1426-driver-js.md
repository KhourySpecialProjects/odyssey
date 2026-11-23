title: driver.js 1.4 → 1.14 for the editor and voyage tours (replaces Dependabot #1426)
risk: 🟡 test on dev
kind: bug
---
Upgrades driver.js, the library behind the lesson-editor and voyage-form tours, to 1.14.0. Dependabot's PR failed the build and the tour tests. Both are fixed here, and the tours should look and behave as before.

Supersedes #1426.

**Checks:** checks: prettier ✓ · eslint ✓ · frontend jest ✓ 9049 · backend jest ✓ 636 · frontend build ✓ · ckeditor ✓ · backend build ✓ · f638706d4
**Note:** driver.js 1.14 removed the `"over"` side from its types. The intro step of each tour has no target element, and driver.js centres those popovers by itself, as 1.4 did. So the intro steps just drop `side: "over"`.
**Note:** 1.14 calls `new DOMRect(...)`. Browsers have it but the test DOM (jsdom) doesn't, so the tour test adds a small stand-in in its setup. The assertions are unchanged.
**Test on dev:** Open a draft in the lesson editor, click "Replay tour" (the ? in the sidebar), and step through to Done. Then click the ? next to "Create New Voyage" on the voyage form, and close that tour with the X and with Escape. Expected: the welcome popover is centred on screen, each later step points at its control, the custom popover styling (rounded card, teal Next/Done buttons) is unchanged, and the tour doesn't come back on reload.
**Overlaps:** open Dependabot PRs #1424 and #1428 also change `frontend/package.json` and `frontend/package-lock.json` (lockfile conflicts only).
**Suggested reviewer:** AwadBuisir10

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
