title: Make React hooks, key and quote lint rules errors in components/ (ODY-616)
risk: 🟡 test on dev
---
## Description

Turns `exhaustive-deps`, `jsx-key` and `no-unescaped-entities` into lint errors. Fixes what they found: escaped quotes in text, one missing `key`, and a short `eslint-disable` with a reason on each deliberate exception.

**How it affects Odyssey:** Nobody should see a change, apart from a small tweak to the draft lesson-order hook and a missing `key` in the slideshow.

**Files**
- `frontend/.eslintrc.json, eslint.config.mjs`: rules become errors; no-op rule stubs so disable comments resolve in the root run
- `frontend/components/draft/metadata/hooks/useLessonOrder.tsx`: effect dependency list shortened
- `frontend/components/ui/slideshow.tsx`: `key` added
- `frontend/components/**`: `&quot;`/`&apos;` in text and justified `eslint-disable` comments (about 30 files)

## Motivation and Context

The warnings were ignored, so real hook and key bugs went unnoticed. Making them errors stops new ones; each existing exception now says why.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps:
  - `claude/ody-614-blocknote-hooks`, `claude/ody-615-lib-types-lint`: `frontend/.eslintrc.json`
  - `claude/ody-446-callout-style`, `claude/ody-527-tailwind-classes`, `claude/ody-529-lesson-progress`: `frontend/components/droplets/lessons/lesson-renderer.tsx`
  - `claude/ody-529-lesson-progress`, `claude/ody-471-preview-sync`, `claude/ody-211-delete-draft`: `droplets/sidebar.tsx`, `draft/sidebar.tsx`
  - `claude/ody-211-delete-draft`: `frontend/components/draft/metadata/content-action-button.tsx`
  - `claude/ody-261-latex-dollar-signs`: `blocknote-editor-client.tsx`, `generic-block-renderer.tsx`
  - `claude/ody-469-quiz-label-html`, `claude/ody-888-explain-my-answer`: `quiz-question.tsx`
  - `claude/ody-281-delete-spinners`: `draft/lesson/blocks/callout.tsx`
- Touches many files, so it is likely to conflict with other branches; merge it late.
- The `useLessonOrder` dependency change is the only one that can change behavior.
- Blocknote block files are set to a warning for `exhaustive-deps`, pending ODY-614.

**How to test on dev**
1. Open a draft with several lessons and drag to reorder them → order saves and the list does not jump back.
2. Open a gallery or slideshow in a lesson → images show and page without console warnings.
3. Open the dialog in the droplet sidebar to edit a published droplet → the text shows straight quotes and apostrophes.

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
