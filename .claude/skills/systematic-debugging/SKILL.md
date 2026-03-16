---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior. 4-phase root cause process that prevents fix-first-think-later mistakes. Covers Strapi API errors, Next.js hydration mismatches, cache staleness, and enrollment state bugs.
---

# Systematic Debugging for Odyssey

## STOP — Do Not Fix Anything Yet

Before writing a single line of fix code, complete all 4 phases. Premature fixes are the #1 cause of recurring bugs and wasted tokens.

## Phase 1: Reproduce & Observe

**Goal:** See the bug happen. Understand exactly what occurs vs. what should occur.

1. **Get the exact error.** Read the error message, stack trace, or test failure output completely. Note the file, line number, and error type.

2. **Reproduce it.** Run the failing command:

   ```bash
   cd frontend && npx jest path/to/failing.test.ts   # test failure
   cd frontend && npm run dev                          # runtime error (check terminal + browser console)
   cd frontend && npm run build                        # build error
   ```

3. **Document what you see:**
   - Expected behavior: [what should happen]
   - Actual behavior: [what actually happens]
   - Error message: [exact text]

## Phase 2: Trace the Root Cause

**Goal:** Find WHERE and WHY the bug originates — not just where it manifests.

**Strategy: Follow the data flow backward from the error.**

### For Strapi/API errors:

1. Read the request function in `lib/requests/` that fetches this data
2. Check the Strapi schema: `backend/src/api/{type}/content-types/{type}/schema.json`
3. Check if `fetchAPI()` auto-flatten is handling the response correctly
4. Check cache tags — is stale data being served? (`CACHE_TAGS` in the request, `revalidateTag()` in the action)
5. Check if a Server Action is using raw `fetch()` without `flattenAttributes()`

### For Next.js hydration mismatches:

1. Check if a Server Component is accidentally using browser APIs
2. Check if `"use client"` is missing on an interactive component
3. Check for conditional rendering that differs server-side vs. client-side (e.g., `window.innerWidth`)
4. Check for Zustand stores being read during SSR

### For test failures:

1. Read the test — understand what it expects
2. Read the implementation — understand what it does
3. Check mocks — is `fetchAPI` mocked correctly? Is the mock returning flat data (not nested Strapi format)?
4. Check imports — is the test importing from the right path? (`@/lib/utils` vs relative)

### For cache/stale data issues:

1. Check `CACHE_TAGS` on the request function — is the right tag used?
2. Check the Server Action — does it call `revalidateTag()` with the matching tag?
3. Check for the `cache`/`next` mutual exclusion bug — are both passed to `fetchAPI()`?
4. Check per-user tags — is `CACHE_TAGS.enrollments(userId)` being invalidated, not just `CACHE_TAGS.allEnrollments`?

### For enrollment state bugs:

1. Read the enrollment schema: `backend/src/api/enrollment/content-types/enrollment/schema.json`
2. Check `enrollment-populates.ts` — is the query populating the right relations?
3. Check nullable fields: `rating` is nullable, `viewedLessons` can be empty
4. Check the `droplet-lesson` join table for `orderIndex` — lesson ordering bugs often originate here

## Phase 3: Verify Your Theory

**Goal:** Confirm the root cause before writing a fix.

Ask yourself:

- "Does my theory explain ALL symptoms, not just some?"
- "If I'm right, what other observable effects would exist?" Then check for them.
- "Could there be a simpler explanation?"

**Verification techniques:**

- Add a temporary `console.log()` at the suspected origin point
- Check `git log -p path/to/file` — did a recent change introduce this?
- Search for similar patterns: `Grep` for the same function/pattern elsewhere — is it broken there too?

## Phase 4: Fix with Precision

**Goal:** Minimal, targeted fix at the root cause — not the symptom.

1. Fix the root cause, not the symptom location
2. Write or update a test that would have caught this bug
3. Run the test: `cd frontend && npx jest path/to/test.ts`
4. Run related tests to check for regressions
5. Verify the fix doesn't break the `cache`/`next` mutual exclusion, missing `flattenAttributes()`, or missing `revalidateTag()` patterns

## Anti-Patterns

- **Shotgun debugging:** Changing multiple things at once to "see what sticks." Change ONE thing, verify, repeat.
- **Fix-and-pray:** Writing a fix without understanding the root cause. The bug will return.
- **Googling the error message first:** Read the code first. Most bugs are in our code, not the framework.
- **Ignoring the test:** If there's a test for this behavior, the test defines correctness. If the test is wrong, fix the test first.
