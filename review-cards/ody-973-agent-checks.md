title: Agents run one checks command with backend tests and a summary line (ODY-973)
risk: 🟢 skim
kind: cleanup

---

`bash scripts/ci-local.sh --agent` now also runs the backend Jest suite and ends with one `checks:` line for review cards, and Prettier no longer fails on `frontend/test-results/`.

`checks: prettier ✓ · eslint ✓ · frontend jest ✓ 8869 · backend jest ✓ 604 · frontend build ✓ · ckeditor ✓ · backend build ✓ · 8f6827ae`

**Test on dev:** run `bash scripts/ci-local.sh --agent` locally → it ends with a `checks:` line with test counts and the short SHA; a failing step shows ✗ with the first failure and exits non-zero.
**Overlaps:** none
**Suggested reviewer:** bradycai

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
