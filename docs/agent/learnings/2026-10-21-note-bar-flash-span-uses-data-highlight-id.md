# The note bar's flash span also uses `data-highlight-id`
Date: 2026-10-21
Author: implementer (ODY-785)
Status: new

## What we learned
When a note is selected in the notes bar, `note-block.tsx` wraps the note's highlighted text in the lesson for about a second in a span with `data-highlight-id="highlight-id"` (a literal string, not a number), then unwraps it. Our own drawn highlight pieces use the same attribute with the numeric record id. A selector like `[data-highlight-id]` matches the flash span too, and `Number("highlight-id")` is NaN, which reads as a pending highlight.

## Why it matters
During the flash, clicking a highlight could do nothing (the flash span was found first and treated as pending). Our pieces are therefore marked `class="ody-highlight"` as well, and all our code selects `.ody-highlight[data-highlight-id]` (`HIGHLIGHT_PIECE_SELECTOR` in `components/droplets/lessons/highlight-ids.ts`). Don't rename or reuse the attribute without changing both places.

## Evidence
`frontend/components/droplets/lessons/note-taking/note-block.tsx` lines 139 and 227. Test: "does not treat the note bar's flash span as a highlight, or a pending one" in `frontend/tests/components/droplets/lesson-highlighting.test.tsx`.
