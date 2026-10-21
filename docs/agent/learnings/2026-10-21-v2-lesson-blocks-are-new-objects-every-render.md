# v2 lesson blocks are new objects on every render
Date: 2026-10-21
Author: implementer (ODY-785)
Status: new

## What we learned
For `blocksVersion === "v2"` lessons, `LessonRenderer` runs `convertBlockNoteToV1Blocks` on every render, so each `block` object has a new identity every time (same `id` and `content`, different object). Anything that depends on `block`, or on an array or object derived from it, re-runs on every render of the lesson.

## Why it matters
`GenericBlockRenderer` rebuilds its block's DOM in an effect. Depending on `block` (or on the lesson's whole `highlights` array) rebuilt every block on every parent render, which replaced every text node and wiped the reader's selection. Depend on `block.id`, strings and primitives, and key anything derived from highlights by value (see `blockHighlightsKey` in `generic-block-renderer.tsx`).

## Evidence
`frontend/components/droplets/lessons/lesson-renderer.tsx` (the `displayBlocks` conversion). Regression tests in `frontend/tests/components/droplets/lesson-highlighting.test.tsx`: "keeps the text nodes of a v2 lesson, whose blocks are rebuilt on every render" and "does not redraw when the server's echo only changes fields that aren't drawn".
