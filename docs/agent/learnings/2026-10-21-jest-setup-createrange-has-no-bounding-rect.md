# jest.setup.ts replaces `document.createRange`, so ranges can't report a position
Date: 2026-10-21
Author: implementer (ODY-785)
Status: new

## What we learned
`frontend/jest.setup.ts` overrides `document.createRange` so every range it returns has `getBoundingClientRect = jest.fn()`, which returns `undefined`. jsdom has no layout anyway. Code that places something from `range.getBoundingClientRect()` (the highlight toolbar) gets `undefined` and either throws or silently does nothing.

## Why it matters
A test that opens the toolbar from a selection passes or fails for reasons that have nothing to do with the code under test. Stubbing only `Range.prototype.getBoundingClientRect` is not enough, because the override sets an own property on each range. Production code should also tolerate a missing rect (`range.getBoundingClientRect() ?? ZERO_RECT`).

## Evidence
`frontend/jest.setup.ts` lines 23-25. Working pattern: `frontend/tests/components/droplets/selection-toolbar.test.tsx` sets `Range.prototype.getBoundingClientRect` in `beforeEach` and also sets `range.getBoundingClientRect` on every range the test builds. jsdom's `Selection` and `Range` are real, so `range.setStart/setEnd` plus `getSelection().addRange()` work; `selectionchange` must be dispatched by hand (`document.dispatchEvent(new Event("selectionchange"))`), and a mouse selection is finished with `fireEvent.pointerUp`.
