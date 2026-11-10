title: Show who last saved the Scorecard prompts (ODY-915)
risk: 🔴 careful
---
## Description

Saving the Scorecard prompts now records which System Admin saved and when, and the admin page shows "Last saved by <name> on <date>".

**How it affects Odyssey:** System Admins on `/admin/scorecard-prompts`: a new "Last saved" line under the editor. Nobody else sees it.

**Files**
- `backend/src/api/ai-scoring-setting/content-types/ai-scoring-setting/schema.json`: new `promptUpdatedBy` (relation) and `promptUpdatedAt`
- `backend/types/generated/contentTypes.d.ts`: generated types
- `backend/src/api/ai-scoring-setting/controllers/custom-ai-scoring-setting.ts`: accepts and checks `userId`
- `backend/src/lib/ai-scoring-settings.ts`: stamps user and time on save
- `frontend/lib/requests/ai-scoring-prompt.ts`: sends the session user's id on save
- `frontend/lib/ai-review/prompt-settings.ts`: new `loadPromptSavedBy`
- `frontend/app/(general)/admin/scorecard-prompts/page.tsx`: shows the line
- `docs/agent/backend-architecture.md`: notes the fields
- `tests (backend + frontend)`: settings, request, page and loader tests

## Motivation and Context

The prompts change how AI scoring behaves, but nothing showed who changed them last.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: ody-878-scan-fingerprint (`backend/types/generated/contentTypes.d.ts`, `docs/agent/backend-architecture.md`); ody-897-remove-mark-addressed (`docs/agent/backend-architecture.md`)
- Strapi schema change; Strapi needs a restart and the generated types file may conflict with ody-878.
- The saver id comes from the session in a `withAuth([SysAdmin])` action, never from the caller's input. The backend rejects an id that is not a positive integer or matches no user (400).
- Saving with no user clears the previous name.

**How to test on dev**
1. Sign in as a System Admin, open `/admin/scorecard-prompts` before any save → no "Last saved" line (or the old one).
2. Edit a prompt and save → the page shows "Last saved by <your name> on <date>".
3. Reload → the line is still there.
4. Sign in as a different System Admin, save → the name changes.
5. Check the page still loads if the line can't be read (it just hides).

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
