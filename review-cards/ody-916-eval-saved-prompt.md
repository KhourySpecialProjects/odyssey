title: Let the ODY-813 eval run the saved Score with AI prompt (ODY-916)
risk: 🟢 skim
---
## Description

Adds a `--saved-prompt` flag to the eval script that runs the prompt saved at `/admin/scorecard-prompts` and prints its version. The run folder ends in `-saved`.

**How it affects Odyssey:** Nobody — internal. Only developers running the eval script; the app is unchanged.

**Files**
- `frontend/scripts/ai-review/eval.ts`: new `--saved-prompt` flag
- `frontend/scripts/ai-review/lib/plan.ts`: loads the saved prompt and its version
- `frontend/scripts/ai-review/README.md`: how to use it
- `frontend/testing/lib/ai-review/eval-saved-prompt.test.ts`: tests

## Motivation and Context

The eval used only the code's default prompt, so it couldn't check wording a System Admin had saved in production.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: none
- Without the flag, nothing changes. With it, the script reads `ai-scoring-setting` using `STRAPI_ACCESS_TOKEN`, so point the env at the right Strapi.

**How to test on dev**
No manual test: dev-only script, app behaviour is unchanged; CI covers it.

## Screenshots (if appropriate):

<!-- add a screenshot from dev -->

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
