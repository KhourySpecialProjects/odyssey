title: Show lesson position, completed lessons and the next lesson's name (ODY-529)
risk: 🟡 test on dev
---
## Description

Lesson pages now show "Lesson 2 of 5" with a progress bar. The sidebar puts a check next to completed lessons and has a labelled Back to Explore link. The footer button says "Next: <lesson name>", or "Finish → Recap" on the last lesson.

**How it affects Odyssey:** Learners, on every droplet lesson page (sidebar, footer and the top of the lesson).

**Files**
- `frontend/components/droplets/lessons/lesson-renderer.tsx`: position text and progress bar above the title
- `frontend/components/droplets/sidebar.tsx`: completed check mark, `Explore` label on back link
- `frontend/components/droplets/footer.tsx`: Next button shows next lesson name; tooltip and aria-label with full name
- `frontend/tests/components/droplets/*`: tests for footer, sidebar and lesson renderer

## Motivation and Context

Learners could not tell where they were in a droplet, which lessons they had finished, or what "Next" led to.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps:
  - `claude/ody-527-tailwind-classes`: `frontend/components/droplets/footer.tsx`, `frontend/components/droplets/lessons/lesson-renderer.tsx`
  - `claude/ody-616-components-lint`: `frontend/components/droplets/lessons/lesson-renderer.tsx`, `frontend/components/droplets/sidebar.tsx`
  - `claude/ody-446-callout-style`: `frontend/components/droplets/lessons/lesson-renderer.tsx`
- Long next-lesson names are cut off at about 12rem; the full name is in the tooltip and screen-reader label.
- The progress bar uses a fixed color (`#2D7597`), not a theme token.

**How to test on dev**
1. Open a multi-lesson droplet at lesson 1 → "Lesson 1 of N" and a small bar show above the title.
2. Finish a lesson, then look at the sidebar → a green check shows next to it, with "Completed" for screen readers.
3. Check the footer → Next button reads "Next: <name>"; hover shows the full name.
4. Go to the last lesson → button reads "Finish → Recap" and still saves progress before going to the recap.
5. Check the sidebar's top link → shows an arrow and "Explore" and goes to `/explore`.

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
