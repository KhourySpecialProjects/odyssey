title: Use crypto.randomUUID() instead of the uuid package (ODY-911)
risk: 🟡 test on dev
---
## Description

Replaces every `uuid` import in the frontend with `crypto.randomUUID()` and removes the package, so Jest no longer breaks on uuid 14.

**How it affects Odyssey:** Nobody sees a difference; generated ids and upload file names are still random UUIDs. Touches image, dataset and notebook uploads and the PDF/PPTX import.

**Files**
- `frontend/lib/actions.ts`: three `uuidv4()` calls become `crypto.randomUUID()`
- `frontend/lib/blocknote/markdown-to-blocknote.ts`: same swap
- `frontend/lib/import/*`: pdf, pptx, section-helpers and split-with-ai swap
- `frontend/jest.setup.ts, frontend/jest.config.js`: adds a `randomUUID` fallback; drops `uuid` from transform list
- `frontend/package.json, frontend/package-lock.json`: removes `uuid`
- `frontend/testing/**, frontend/lib/import/__tests__/section-helpers.test.ts`: drop the `uuid` mocks

## Motivation and Context

uuid 14 broke Jest. Node and browsers already have `randomUUID`, so the dependency isn't needed.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: ody-615-lib-types-lint (`frontend/lib/actions.ts`, `frontend/lib/blocknote/markdown-to-blocknote.ts`); ody-924-spelling-without-ai (`frontend/package.json`, `frontend/package-lock.json`: lockfile will conflict, so merge one then regenerate)
- `frontend/lib/actions.ts` and `split-with-ai.ts` are `"use server"` files; only internals changed, and their exports are in the auth allowlist.
- `crypto.randomUUID()` needs a secure context in browsers (HTTPS or localhost); the changed call sites in `actions.ts` and import run on the server.

**How to test on dev**
1. Upload an image in the lesson editor → upload works and the file name has a UUID prefix.
2. Import a PDF or PPTX into a draft → sections appear with no error.
3. Import a Markdown/notebook lesson → blocks appear and a notebook can be saved.
4. Check that `uuid` is gone from `frontend/package.json` and the app builds.

## Screenshots (if appropriate):

<!-- add a screenshot from dev -->

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
