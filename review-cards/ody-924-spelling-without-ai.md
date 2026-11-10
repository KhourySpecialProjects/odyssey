title: Make the Overview scan spelling check work offline, with no AI call (ODY-924)
risk: 🟡 test on dev
---
## Description

The spelling check no longer calls AI. It flags a word only when a real word is one or two letters away (like "teh" or "recieve"), and skips names, code words and words used three or more times.

**How it affects Odyssey:** Creators and reviewers on the Overview scan: fewer, more reliable spelling flags, and the scan no longer uses AI budget or shows the "AI double-check didn't run" note.

**Files**
- `frontend/lib/overview-scan/spelling.ts`: rewritten as an offline typo finder
- `frontend/lib/overview-scan/rules/content.ts`: uses `likelyTypos`; AI path removed
- `frontend/lib/overview-scan/config.ts`: bumps `RULES_VERSION`, adds tech words, drops AI limits
- `frontend/lib/overview-scan/text.ts`: removes an unused helper
- `frontend/package.json, frontend/package-lock.json`: adds three `@cspell/dict-*` word lists
- `frontend/testing/**`: spelling tests updated; `spelling-ai.test.ts` deleted

## Motivation and Context

The AI double-check (ODY-904) cost money and time, and sometimes didn't run. An offline check is predictable.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: ody-876-no-repeats-quote (`frontend/lib/overview-scan/config.ts`, same `RULES_VERSION` value); ody-911-remove-uuid (`frontend/package.json`, `frontend/package-lock.json`: lockfile will conflict)
- Adds three dependencies (cspell dictionaries) and removes AI limit settings.
- Unfamiliar words that aren't close to a real word are no longer flagged.

**How to test on dev**
1. Write a lesson with "teh" and "recieve" → run the Overview scan; both are flagged.
2. Add a product name, a word used only in a code block, and a word used 3+ times → none are flagged.
3. Run the scan with the network blocked or AI budget used up → the spelling check still runs and no AI note appears.
4. Check the check's description text on the scan page reads the new wording.

## Screenshots (if appropriate):

<!-- add a screenshot from dev -->

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
