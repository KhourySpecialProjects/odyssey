# Presentation Mode: Overflow Warnings, Image Layout Fixes, and AI Auto-Format

**Date:** 2026-03-31
**Status:** Draft
**Related ticket:** ODY-386

## Problem

Presentation mode has three categories of issues that make slide creation unreliable:

1. **Disappearing content** — Image blocks with layout settings (image-right, image-left) are discarded during slide splitting if no adjacent text blocks exist. The slide vanishes entirely.
2. **Silent clipping** — The default slide layout uses `overflow-hidden` with a `max-h-[85vh]` cap. Content that exceeds this is silently cut off with no scroll or indicator.
3. **No authoring feedback** — There is no way for an author to know if their content will fit on a slide until they enter presentation mode and notice something missing.

## Decisions Made

- **Author-side prevention** over runtime scaling or scrolling. The editor warns authors when content overflows rather than auto-shrinking or scrolling at presentation time.
- **Pixel-precise measurement** over heuristic estimation. A hidden renderer measures actual content height.
- **Inline overflow warning** in the editor between slide breaks (not sidebar-only).
- **Replace HTML comment layout markers** with a `slideLayout` property on existing generic blocks. No new block type.
- **AI auto-format** via Haiku to insert slide breaks and image layouts in one click.

## Design

### 1. Fix Image Layout System

**Current (broken):** `convert-blocks.ts` encodes image layout as an HTML comment prefix: `<!--LAYOUT:IMAGE_RIGHT:url--><img ... />`. During slide splitting in `utils.ts`, `isLayoutMarker()` matches this block, extracts the layout/URL, and discards the block entirely via `continue`. If no other blocks exist between the slide breaks, `flush()` skips creating the slide because `current.length === 0`.

**New approach:** Add `slideLayout` and `slideLayoutImageUrl` as optional properties on the generic block object.

#### convert-blocks.ts changes

For image blocks with non-default layout, emit:

```ts
{
  __component: "droplets.generic",
  id: blockId,
  content: imgTag,              // clean <img> tag, no comment prefix
  slideLayout: "image-right",   // new property
  slideLayoutImageUrl: url,     // new property
}
```

#### utils.ts changes

- Remove `isLayoutMarker()`, `getLayout()`, `getLayoutImageUrl()` functions.
- In `splitByMarkers()`, check for `block.slideLayout` instead of parsing HTML comments.
- When a block has `slideLayout`, set the slide's layout and image URL from it, but **keep the block in the `current` array** (do not `continue`).
- The block stays in the slide, so `current.length > 0` is always true when an image-layout block exists.

#### presentation-shell.tsx changes

For image-left/right slides:

- The image-layout block is in `allBlocks`. Filter it out when rendering the text side (it's already rendered as the image side via `slide.layoutImageUrl`).
- If no text blocks remain after filtering, render the image centered at a larger size instead of an empty half-split.
- Fix flex math: replace `w-1/2 shrink-0` + `w-1/2` + `gap-10` (totals >100%) with `basis-1/2 min-w-0` on both sides.

#### Type changes

Add optional `slideLayout` and `slideLayoutImageUrl` to the `droplets.generic` variant of the `Block` type. These properties are only read by the presentation pipeline — the regular lesson renderer ignores them.

### 2. Overflow Warning in the Editor

#### Hidden measurement container

A zero-opacity, pointer-events-none `<div>` rendered inside the editor page. Styled to match presentation mode's exact CSS constraints:

- Same `max-w-4xl` width
- Same `prose-xl` typography
- Same padding/margins as the slide viewport

This div is never visible to the author.

#### Measurement flow

1. When editor content changes (debounced ~500ms after last keystroke/block change):
   - Walk the BlockNote document and identify groups of blocks between slide break blocks.
   - For each group, convert to HTML using the same `convertBlockNoteToV1Blocks` pipeline.
   - Inject the HTML into the hidden measurement div.
   - Compare `scrollHeight` vs the viewport budget:
     - Default layout: `85vh` equivalent (computed from `window.innerHeight * 0.85`)
     - Image-left/right layout: `60vh` equivalent
   - Record which slide groups overflow.
2. Re-measure on `window.resize` (debounced).

#### Overflow indicator

When a slide group overflows, display a warning bar above the corresponding slide break in the editor:

- Styled as a variant of the existing slide break line (amber/red tinted)
- Text: "Slide content may overflow in presentation mode"
- Non-interactive — purely informational

#### Implementation location

The measurement logic lives in a custom hook (`useSlideOverflowDetection`) used by the BlockNote editor client component. The overflow state is a `Set<number>` of slide-break block indices that have overflow. The slide break block component reads this state (via context or prop) to conditionally show the warning.

### 3. Presentation Shell Cleanup

Bug fixes applied alongside the architectural changes:

1. **`overflow-hidden` to `overflow-y-auto`** on the default layout container (`presentation-shell.tsx:494`). Safety net so content scrolls rather than being silently clipped.
2. **Fix flex math on image-left/right** — `basis-1/2 min-w-0` on both sides, smaller gap.
3. **Image-only slides** — When an image-layout slide has no text blocks after filtering, render the image centered with optional caption instead of a half-empty split layout.
4. **Remove all HTML comment parsing** — Delete `isLayoutMarker`, `getLayout`, `getLayoutImageUrl` from `utils.ts`.

### 4. AI Auto-Format Button

A one-click button that uses Claude Haiku to automatically insert slide breaks and set image layouts on a lesson's content.

#### Button placement

In the editor sidebar, near the existing "Present" button. Label: "Auto-Format Slides" (or similar).

#### Flow

1. **On click** — Serialize the lesson's BlockNote content to a text/block summary.
2. **Send to Haiku** — API call with a system prompt instructing Haiku to:
   - Analyze the content structure (headings, paragraphs, images, code blocks, quizzes).
   - Decide where to insert slide breaks at logical content boundaries.
   - Set appropriate image layouts (image-left, image-right, full-image) for any images based on surrounding content.
   - Keep each slide's content within the viewport budget (~25 lines of text for default, ~18 for image layouts).
3. **Haiku returns** — A structured response: a list of operations (insert slide break after block N, set image M to layout X).
4. **Apply to editor** — Execute the operations as BlockNote transactions. Slide breaks are inserted, image layout props are updated.
5. **Author reviews** — The slide breaks and image layouts appear in the editor. The overflow warnings immediately validate whether each slide fits. The author can adjust before presenting.

#### Constraints

- **Non-destructive** — Only inserts slide breaks and changes image layout props. Never modifies, reorders, or deletes content.
- **Idempotent-ish** — If slide breaks already exist, Haiku should work with/around them rather than duplicating.
- **Fallback** — If the API call fails, show a toast error. The editor state is unchanged.

#### API integration

Uses the existing Anthropic SDK. The API call is made from a Server Action to keep the API key server-side. The editor calls the Server Action and applies the returned operations client-side.

## Out of Scope

- **No auto-scaling / fit-to-slide** — Authors fix overflow themselves (manually or via AI auto-format)
- **No touch/swipe navigation** — Separate feature
- **No presenter notes or slide grid overview** — Separate features
- **No changes to the regular lesson renderer** — Only the presentation pipeline is affected
- **No changes to the BlockNote schema definition** — `slideLayout` rides on the existing generic block as an extra property, not a new block spec

## Files Affected

| File                                                               | Change                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `frontend/types/index.ts` (or wherever Block is defined)           | Add optional `slideLayout`, `slideLayoutImageUrl` to generic block             |
| `frontend/lib/blocknote/convert-blocks.ts`                         | Emit `slideLayout` property instead of `<!--LAYOUT:...-->` comment             |
| `frontend/components/presentation/utils.ts`                        | Read `slideLayout` property, remove HTML comment parsing, keep blocks in array |
| `frontend/components/presentation/presentation-shell.tsx`          | Fix flex math, handle image-only slides, `overflow-y-auto`                     |
| `frontend/components/presentation/presentation-block-renderer.tsx` | No changes (generic blocks render the same)                                    |
| `frontend/components/ui/blocknote/blocks/slide-break-block.tsx`    | Show overflow warning variant                                                  |
| New: `frontend/hooks/useSlideOverflowDetection.ts`                 | Hidden measurement logic                                                       |
| New: `frontend/lib/actions/auto-format-slides.ts`                  | Server Action for Haiku API call                                               |
| `frontend/components/draft/sidebar.tsx`                            | Add "Auto-Format Slides" button                                                |
