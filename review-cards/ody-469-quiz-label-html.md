title: Quiz answers no longer put a div inside a label (ODY-469)
risk: 🟡 test on dev
---
## Description

Quiz answer text is no longer wrapped in a `<label>` (a block `div` inside a label is invalid HTML). Each radio or checkbox now gets its name from the answer text, and clicking the text still selects it.

**How it affects Odyssey:** Learners see no visual change in quiz questions; screen reader users hear the same answer names.

**Files**
- `frontend/components/droplets/lessons/quiz-question.tsx`: new `AnswerContent`, `aria-labelledby` on inputs
- `frontend/tests/components/quiz-question-labels.test.tsx`: tests

## Motivation and Context

Fixes invalid HTML (and a likely hydration warning) in quiz answers without losing accessibility or click-to-select.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: `ody-616-components-lint` and `ody-888-explain-my-answer` (`quiz-question.tsx`).
- Check the click target: text area now forwards the click to the input by code instead of through a label.

**How to test on dev**
1. Open a lesson with a single-answer quiz and click the answer text → the radio is selected.
2. Open a multi-answer quiz and click answer text twice → the checkbox toggles on and off.
3. Submit an answer → result and feedback show as before.
4. Check the browser console → no `div cannot be a descendant of label` warning.

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
