# Integration report: claude/integration-2026-11-10

Throwaway branch: develop plus 38 of 39 listed `claude/ody-*` branches, combined by cherry-pick. Not for PR or merge.

## Branches

| # | Branch | Status |
|---|--------|--------|
| 1 | ody-623-set-env-no-secrets | clean |
| 2 | ody-718-dead-request-functions | clean (its commit carries a `Claude-Session` trailer from the source branch, left as is) |
| 3 | ody-211-delete-draft | clean |
| 4 | ody-281-delete-spinners | clean |
| 5 | ody-488-group-refresh | clean |
| 6 | ody-875-edit-scans-carry-over | clean |
| 7 | ody-922-dismissals-carry-over | clean (875's commit skipped as empty) |
| 8 | ody-878-scan-fingerprint | clean |
| 9 | ody-897-remove-mark-addressed | clean |
| 10 | ody-915-prompt-saved-by | clean |
| 11 | ody-154-notes-close-animation | clean |
| 12 | ody-195-wider-lesson-content | clean |
| 13 | ody-914-mentor-sheet-stacking | conflicts resolved |
| 14 | ody-247-admin-droplet-filters | clean |
| 15 | ody-256-reset-filters | clean |
| 16 | ody-261-latex-dollar-signs | clean |
| 17 | ody-446-callout-style | clean |
| 18 | ody-469-quiz-label-html | clean |
| 19 | ody-471-preview-sync | clean |
| 20 | ody-472-no-drag-paste | clean |
| 21 | ody-473-favorites-in-activity | clean |
| 22 | ody-496-explore-cards-align | conflicts resolved |
| 23 | ody-529-lesson-progress | clean |
| 24 | ody-535-draft-save-feedback | clean |
| 25 | ody-543-a11y-learner-path | clean |
| 26 | ody-546-dashboard-spacing | clean |
| 27 | ody-614-blocknote-hooks | clean |
| 28 | ody-719-lock-holder-fields | clean |
| 29 | ody-872-dock-dialog-role | clean |
| 30 | ody-876-no-repeats-quote | clean |
| 31 | ody-879-flag-scroll-to-block | **left out** |
| 32 | ody-888-explain-my-answer | conflicts resolved |
| 33 | ody-911-remove-uuid | clean |
| 34 | ody-917-admin-dialog-close | clean |
| 35 | ody-924-spelling-without-ai | conflicts resolved |
| 36 | ody-916-eval-saved-prompt | clean |
| 37 | ody-527-tailwind-classes | conflicts resolved |
| 38 | ody-615-lib-types-lint | clean |
| 39 | ody-616-components-lint | conflicts resolved |

Counts: 32 clean, 6 with conflicts resolved, 1 left out.

## Left out

**ody-879-flag-scroll-to-block.** develop already has ODY-913 (`hooks/use-scan-target.ts`, `lessonTarget()` in `lib/overview-scan/view.ts`). It does the same `?block=` scroll and highlight, and also highlights spelling words. 879 adds a second hook (`use-scroll-to-block`) and a different href builder. Conflicts were in `components/draft/lesson/lesson-renderer.tsx`, `lib/overview-scan/view.ts` and `testing/lib/overview-scan/view.test.ts`. Keeping both would run two scroll hooks on one page. Keeping one means dropping the other's logic, so the pick was aborted.

## Conflicts

| Branch | File | Resolution |
|--------|------|-----------|
| 914 | frontend/lib/lesson-panel.ts | Kept 195/154 additions (`contentClosed`, `contentPanelOpen`, `closeFallbackMs`), plus 914's `sm:z-[55]` and `right-[392px]` |
| 914 | frontend/tests/components/droplets/droplet-lesson-wrapper.test.tsx | Kept both tests (195's "content width" describe and 914's z-index test) |
| 496 | frontend/components/droplets/droplet-tile.tsx | Link keeps both `className="block h-full"` (496) and `draggable={false}` (472) |
| 888 | frontend/components/droplets/lessons/quiz-question.tsx | Import lines unioned: `Sparkles` (888) and `useId` (469) |
| 924 | frontend/lib/overview-scan/rules/content.ts | 924's offline `likelyTypos`; each flag keeps ODY-913's `words` field |
| 924 | frontend/testing/lib/overview-scan/rules/content.test.ts | Expected flags keep the `words` arrays; AI-not-run flag removed (924 drops AI) |
| 924 | frontend/testing/lib/overview-scan/rules/spelling-ai.test.ts | Deleted (924 removes the AI spelling check it tested) |
| 527 | frontend/components/droplets/lessons/lesson-renderer.tsx | Kept 446's `CalloutSurface` layout; applied 527's `justify-left` to `justify-start` on the callout HTML |
| 616 | frontend/.eslintrc.json | Kept 615's stricter error levels (superset of 616's); kept 616's blocknote `overrides` |

`frontend/package-lock.json` did not conflict (911 and 924 touched different entries). `npm ci` accepts it, so no regenerated lock was needed.

## Integration-fix commits

None.

## Checks

| Check | Result |
|-------|--------|
| frontend `npm ci` | pass |
| frontend `npx tsc --noEmit` | pass |
| frontend `npx jest --ci` | pass, 518 suites, 8274 tests, 0 failures |
| root `npm run lint` | pass |
| root `npx prettier --check .` | pass |
| backend `npm ci`, `npm test` | pass, 25 suites, 476 tests |
| backend `npm run build` | pass |
| frontend `npm run build` | pass |
