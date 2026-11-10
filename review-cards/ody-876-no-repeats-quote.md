title: Quote the repeated paragraph in Overview scan no-repeats flags (ODY-876)
risk: 🟡 test on dev
---
## Description

The scan's "no repeats" flag now starts with the first ~8 words of the repeated paragraph in quotes, instead of just saying "This paragraph".

**How it affects Odyssey:** Creators and reviewers reading Overview scan results: a repeat flag now shows which paragraph it means.

**Files**
- `frontend/lib/overview-scan/rules/structure.ts`: new `quoteStart` helper, used in the no-repeats message
- `frontend/lib/overview-scan/config.ts`: bumps `RULES_VERSION` to 2026-11-10
- `frontend/lib/overview-scan/rules/structure.test.ts`: tests for the quote

## Motivation and Context

With several flags on one lesson, "This paragraph also appears in …" didn't say which paragraph. Quoting its start makes it findable.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: ody-924-spelling-without-ai (both set `RULES_VERSION` in `frontend/lib/overview-scan/config.ts` to the same value, so it should merge cleanly)
- Message text changed, so `RULES_VERSION` was bumped; older saved scans show the old wording.

**How to test on dev**
1. Make a droplet where the same paragraph appears in two lessons → run the Overview scan.
2. Open the flag on the second lesson → it reads `"first few words…" also appears in <lesson>.`
3. Try a very long paragraph and one with bold/links → the quote is short, ends with …, and has no markup.

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
