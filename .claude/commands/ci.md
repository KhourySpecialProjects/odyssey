---
disable-model-invocation: true
---

# Run CI Locally

Run the same checks that GitHub Actions runs on pull requests. Capture output
for debugging. If anything fails, show enough context to diagnose the problem
without flooding the conversation with noise.

## Mode: $ARGUMENTS

If no mode specified or "full", run all checks. If "quick", skip builds.

## Checks (run in order)

Run each check below. For EACH check:

- Capture both stdout and stderr
- If it passes: report ✓ and move to the next check
- If it fails: report ✗, show the RELEVANT output (see output rules below), then continue to the next check (don't stop on first failure)

### 1. Prettier

```bash
npx prettier . --check 2>&1 | tail -30
```

On failure: the output lists which files aren't formatted. Show the file list.
Then auto-fix: run `npm run prettier-write` and note that files were fixed.

### 2. ESLint

```bash
npm run lint 2>&1
```

On failure: ESLint output can be very long. Show only:

- The total error/warning count (last line of output)
- The first 5 files with errors
- For each file: the first 3 errors only

Do NOT dump the full ESLint output. If there are more than 15 errors, say
"[N] total errors across [M] files — showing first 5 files" and truncate.

### 3. Frontend Tests

```bash
cd frontend && npm test -- --verbose 2>&1
```

On failure: Jest output is noisy. Extract and show only:

- Which test suites failed (file names)
- Which individual tests failed (test names + short error message)
- The "Tests:" summary line (X passed, Y failed, Z total)

Do NOT show passing tests. Do NOT show full stack traces unless there are
fewer than 3 failures. For stack traces, show only the first 5 lines.

### 4. Frontend Build (skip if mode is "quick")

```bash
cd frontend && npm run build 2>&1 | tail -40
```

On failure: Next.js build errors are usually TypeScript errors. Show:

- The "Type error:" lines
- The file path and line number for each error
- Truncate after 10 errors

### 5. Backend Build (skip if mode is "quick")

```bash
cd backend && npm run build 2>&1 | tail -40
```

On failure: show the last 20 lines of output (usually contains the error).

## Output Rules

**Keep output concise.** The goal is diagnosis, not a log dump. If Claude's
context fills up with 500 lines of test output, it can't think clearly about
how to fix the problem.

**Truncation rules:**

- Never show more than 30 lines of raw output for any single check
- For passing checks: just ✓, no output
- For failing checks: show the minimum needed to understand what failed
- Always show file paths and line numbers when available
- Strip ANSI color codes from output before displaying

**After running all checks, always show total times:**

```bash
# Get rough timing for each step (optional but helpful)
time npm run lint 2>&1 > /dev/null
```

## Summary Format

After all checks, present:

```
CI Results
══════════
✓ Prettier (auto-fixed 3 files)
✗ ESLint — 7 errors in 3 files
  → frontend/components/droplets/droplet-card.tsx:23 — 'enrollment' is not defined
  → frontend/lib/requests/enrollment.ts:45 — Missing return type
  → frontend/components/dashboard/stats.tsx:12 — Unused import 'useState'
  → ... (4 more errors)
✓ Frontend tests — 42 passed
✗ Frontend build — 2 type errors
  → frontend/components/new/create-form.tsx:89 — Type 'string' is not assignable to type 'number'
  → frontend/lib/requests/droplet.ts:34 — Property 'slug' does not exist on type 'Droplet'
✓ Backend build

Verdict: NOT READY TO PUSH
Fix: 7 ESLint errors + 2 type errors (see above)
```

Or if everything passes:

```
CI Results
══════════
✓ Prettier
✓ ESLint
✓ Frontend tests — 42 passed
✓ Frontend build
✓ Backend build

Verdict: READY TO PUSH
```
