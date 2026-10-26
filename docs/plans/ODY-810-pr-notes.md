# ODY-810 PR notes

Freeze a draft for its creator while it's in review.

## Summary

- While a droplet is in review, every one of its authors (any role) can read the draft but not change it, review it or publish it. Only a reviewer who isn't an author reviews it.
- The freeze is enforced on the server (all write actions, `publishDraftToOriginal`, the lock actions) and shown in the UI (lesson editor, Overview, sidebar).
- Authors get a **Withdraw from review** button. Editing reopens when the reviewer requests changes, when it's published, or when an author withdraws.
- Open lesson tabs switch to read-only within 10 s of the droplet entering review, or straight away if the next autosave is refused (one info toast, no error toast, no retry).

## Proposed ODY-504 update (needs your OK)

Checked against `git diff e6754c59 -- frontend/testing/security/server-action-auth-allowlist.ts`: exactly these 11 entries were removed from `PENDING_AUTH`, and 25 `ODY-504` entries remain (36 before).

> **Update from ODY-810.** These 11 entries now have real auth and are removed from `PENDING_AUTH`:
>
> - `lesson.ts`: `updateLesson`, `addLesson`, `deleteLesson`, `duplicateLessonToDroplet`
> - `droplet.ts`: `updateDroplet`, `updateDropletLearningObjective`, `updateDropletFunFact`, `publishDraftToOriginal`
> - `dataset.ts`: `createDataset`, `deleteDataset`
> - `lesson-lock.ts`: `getLessonLockStatus`
>
> **The rule they now enforce:** writes require an author of the droplet, or System Admin or Content Editor. Faculty skip the manual review (ODY-798): they write and publish only their own droplets, and never review someone else's. While a droplet is in review, its authors (any role) can't change content, `status` or `afterReview`, except `inReview: false` (Withdraw). Only non-author reviewers can review or publish it. `publishDraftToOriginal` also checks that the draft belongs to the original. `acquireLessonLock` now refuses callers who have no write rights or whose droplet is frozen.
>
> **Still open for ODY-504 (25 entries):**
>
> - `droplet.ts`: `archiveDroplet`, `createDroplet`, `createNewTag`, `deepDeleteDroplet`, `duplicateDroplet`, `favoriteDroplet`, `getDraftDroplets`, `getDropletById`, `getDropletBySlug`, `getDroplets`, `getFavoritedDropletIds`, `getInReviewDroplets`, `getRandomFunFactDroplet`, `updateDropletAverageRating`
> - `lesson.ts`: `completeLesson`, `getLessonBySlug`, `markLessonAsComplete`, `revalidateLesson`
> - `lesson-lock.ts`: `getCurrentAuthorizedUserId`
> - `dataset.ts`: `getDatasetsByDropletId`
> - `galleries.ts`: `getGalleryBySlug`
> - `actions/auto-format-slides.ts`: `autoFormatSlides`
> - `import/`: `customPromptAI`, `expandLessonContent`, `splitTextWithAI`
>
> Also still open: lock heartbeat and release ownership, and the inline closures in the draft Overview page. The entry count drops from 36 to 25.

## Known gaps (accepted, not closed here)

1. **Direct publish by an Admin or Faculty author.** When a droplet is not in review, a System Admin can publish any draft directly, and a Faculty member their own (`isReviewerFor` outside review). An author can also Withdraw and then publish directly. The user accepted this; it is not closed in this ticket.
2. **Dataset file delete by URL (ODY-510).** `lib/actions.ts#deleteDataset(fileUrl)` can delete any dataset's file by URL, and `#uploadDataset` writes a file with no droplet. Both write files only, take no droplet id, and stay in `PENDING_AUTH` for ODY-510. The record actions (`createDataset`, `deleteDataset` in `lib/requests/dataset.ts`) are frozen.

Also out of scope: ODY-811 (stale copy after a lock handover between co-authors; this branch only avoids making it worse), ODY-798/804, and the rest of ODY-504.

## Testing

- Jest: new suites for the helpers, the server checks, the lesson, droplet and dataset actions, `useEditingLock`, the lesson renderer, the sidebar, withdraw, the read-only Overview and `useDropletUpdate`.
- Manual run (Task 12) needs a live app and Strapi; see the report for the steps.

## Known limitations (not fixed here)

- **Lock poll cost.** `getLessonLockStatus` now does about three Strapi reads per open lesson tab every 10 s, in every state (the lock status, the lesson's droplets, and their authors). It was one read, and only while another editor held the lock. Fine at current scale; a single combined endpoint or a longer interval would cut it if it shows up in Strapi load.
- **`useEditingLock` ref pattern.** The hook keeps its timers and flags in refs shared across effect runs, as it did before this work. It is not changed here, and ODY-811 will touch it again.
- **Classic blocks and `inert`.** The Classic editors have no `editable` prop, so a read-only lesson relies on `inert` (set on the DOM node, because the React 19 runtime bundled with the App Router ignores `inert=""` as a prop). `inert` blocks focus and keyboard input, but a Classic block that already had focus when the tab froze is only blurred by the browser, not made non-editable.
