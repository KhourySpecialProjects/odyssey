# Presentation Mode Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix disappearing content in presentation mode, add overflow warnings in the editor, and add an AI auto-format button.

**Architecture:** Replace fragile HTML-comment layout markers with typed properties on generic blocks. Add a hidden measurement div in the editor that detects slide overflow. Add a Server Action that calls Haiku to auto-insert slide breaks and image layouts.

**Tech Stack:** Next.js 15, BlockNote, Tailwind v3.4, Anthropic SDK (claude-3-haiku-20240307)

---

## File Map

| File                                                            | Action | Responsibility                                                            |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `frontend/types/index.d.ts`                                     | Modify | Add `slideLayout`, `slideLayoutImageUrl` to generic block variant         |
| `frontend/lib/blocknote/convert-blocks.ts`                      | Modify | Emit `slideLayout` property instead of `<!--LAYOUT:-->` comments          |
| `frontend/components/presentation/utils.ts`                     | Modify | Read `slideLayout` property, remove comment parsing, keep blocks in array |
| `frontend/components/presentation/presentation-shell.tsx`       | Modify | Fix flex math, image-only slides, overflow-y-auto                         |
| `frontend/components/ui/blocknote/blocks/slide-break-block.tsx` | Modify | Accept overflow prop, show warning variant                                |
| `frontend/components/draft/lesson/blocknote-editor-client.tsx`  | Modify | Add overflow detection context provider                                   |
| `frontend/hooks/useSlideOverflowDetection.ts`                   | Create | Hidden measurement hook                                                   |
| `frontend/lib/actions/auto-format-slides.ts`                    | Create | Server Action for Haiku auto-format                                       |
| `frontend/components/draft/sidebar.tsx`                         | Modify | Add Auto-Format Slides button                                             |

---

### Task 1: Add `slideLayout` properties to the Block type

**Files:**

- Modify: `frontend/types/index.d.ts:135-142`

- [ ] **Step 1: Add optional properties to the generic block variant**

In `frontend/types/index.d.ts`, update the `droplets.generic` variant of the `Block` type:

```ts
  | {
      __component: "droplets.generic";
      content: string;
      id?: number;
      sourceBlockIds?: number[];
      _clientId?: string;
      slideLayout?: "image-left" | "image-right" | "full-image";
      slideLayoutImageUrl?: string;
    }
```

- [ ] **Step 2: Verify no type errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (existing errors are OK, no errors referencing `slideLayout`)

- [ ] **Step 3: Commit**

```bash
git add frontend/types/index.d.ts
git commit -m "feat(types): add slideLayout properties to generic block type"
```

---

### Task 2: Emit `slideLayout` property in block conversion

**Files:**

- Modify: `frontend/lib/blocknote/convert-blocks.ts:379-399`
- Test: `frontend/tests/lib/blocknote/convert-blocks.test.ts` (create if needed)

- [ ] **Step 1: Write a failing test for image layout conversion**

Check if a test file exists at `frontend/tests/lib/blocknote/convert-blocks.test.ts`. If not, create it. Add tests:

```ts
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";

describe("convertBlockNoteToV1Blocks - image layout", () => {
  it("emits slideLayout property for image-right layout", () => {
    const blocks = [
      {
        id: "test-img-1",
        type: "image",
        props: {
          url: "https://cdn.example.com/photo.jpg",
          name: "Test photo",
          layout: "image-right",
        },
        content: undefined,
        children: [],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);

    expect(result).toHaveLength(1);
    expect(result[0].__component).toBe("droplets.generic");

    const generic = result[0] as any;
    expect(generic.slideLayout).toBe("image-right");
    expect(generic.slideLayoutImageUrl).toBe(
      "https://cdn.example.com/photo.jpg",
    );
    // Content should be a clean <img> tag with no <!--LAYOUT:--> comment
    expect(generic.content).toContain("<img");
    expect(generic.content).not.toContain("<!--LAYOUT:");
  });

  it("emits slideLayout property for image-left layout", () => {
    const blocks = [
      {
        id: "test-img-2",
        type: "image",
        props: {
          url: "https://cdn.example.com/left.jpg",
          name: "Left photo",
          layout: "image-left",
        },
        content: undefined,
        children: [],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);
    const generic = result[0] as any;
    expect(generic.slideLayout).toBe("image-left");
    expect(generic.slideLayoutImageUrl).toBe(
      "https://cdn.example.com/left.jpg",
    );
  });

  it("emits slideLayout property for full-image layout", () => {
    const blocks = [
      {
        id: "test-img-3",
        type: "image",
        props: {
          url: "https://cdn.example.com/full.jpg",
          name: "Full photo",
          layout: "full-image",
        },
        content: undefined,
        children: [],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);
    const generic = result[0] as any;
    expect(generic.slideLayout).toBe("full-image");
  });

  it("does NOT emit slideLayout for default layout images", () => {
    const blocks = [
      {
        id: "test-img-4",
        type: "image",
        props: {
          url: "https://cdn.example.com/default.jpg",
          name: "Default photo",
          layout: "default",
        },
        content: undefined,
        children: [],
      },
    ];

    const result = convertBlockNoteToV1Blocks(blocks as any);
    const generic = result[0] as any;
    expect(generic.slideLayout).toBeUndefined();
    expect(generic.slideLayoutImageUrl).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest --testPathPattern="convert-blocks" --verbose 2>&1 | tail -20`
Expected: FAIL — `slideLayout` is undefined because images still emit `<!--LAYOUT:-->` comments

- [ ] **Step 3: Update the image case in convert-blocks.ts**

In `frontend/lib/blocknote/convert-blocks.ts`, replace the `case "image":` block (lines 379-399) with:

```ts
    case "image": {
      const url = (blockAny.props?.url as string) || "";
      const alt = (blockAny.props?.name as string) || "";
      const layout = (blockAny.props?.layout as string) || "default";
      const imgTag = `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" class="rounded-md" />`;

      if (layout !== "default" && url) {
        return {
          __component: "droplets.generic" as const,
          id: blockId,
          content: imgTag,
          slideLayout: layout as "image-left" | "image-right" | "full-image",
          slideLayoutImageUrl: url,
        };
      }
      return {
        __component: "droplets.generic" as const,
        id: blockId,
        content: imgTag,
      };
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest --testPathPattern="convert-blocks" --verbose 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/blocknote/convert-blocks.ts frontend/tests/lib/blocknote/convert-blocks.test.ts
git commit -m "feat(convert-blocks): emit slideLayout property instead of HTML comments"
```

---

### Task 3: Update slide splitting to use `slideLayout` property

**Files:**

- Modify: `frontend/components/presentation/utils.ts`

- [ ] **Step 1: Write failing tests for the new slide splitting behavior**

Create `frontend/tests/components/presentation/utils.test.ts`:

```ts
import { splitBlocksIntoSlides } from "@/components/presentation/utils";
import { SLIDE_BREAK_MARKER } from "@/lib/blocknote/slide-break";
import type { Lesson } from "@/types";

function makeLessonV1(blocks: any[]): Lesson {
  return {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    type: "lesson",
    blocks,
    blocksVersion: "v1",
    orderIndex: 0,
  } as Lesson;
}

describe("splitBlocksIntoSlides", () => {
  it("creates a slide for an image-right block with no sibling text", () => {
    const lesson = makeLessonV1([
      { __component: "droplets.generic", id: 1, content: SLIDE_BREAK_MARKER },
      {
        __component: "droplets.generic",
        id: 2,
        content: '<img src="https://example.com/img.jpg" alt="test" />',
        slideLayout: "image-right",
        slideLayoutImageUrl: "https://example.com/img.jpg",
      },
      { __component: "droplets.generic", id: 3, content: SLIDE_BREAK_MARKER },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    // Should have: lesson title card + the image slide
    expect(slides.length).toBeGreaterThanOrEqual(2);

    const imageSlide = slides.find((s) => s.layout === "image-right");
    expect(imageSlide).toBeDefined();
    expect(imageSlide!.layoutImageUrl).toBe("https://example.com/img.jpg");
    expect(imageSlide!.blocks.length).toBeGreaterThanOrEqual(1);
  });

  it("creates a slide with image-left layout and keeps text blocks", () => {
    const lesson = makeLessonV1([
      { __component: "droplets.generic", id: 1, content: SLIDE_BREAK_MARKER },
      { __component: "droplets.generic", id: 2, content: "<p>Some text</p>" },
      {
        __component: "droplets.generic",
        id: 3,
        content: '<img src="https://example.com/left.jpg" alt="" />',
        slideLayout: "image-left",
        slideLayoutImageUrl: "https://example.com/left.jpg",
      },
      { __component: "droplets.generic", id: 4, content: SLIDE_BREAK_MARKER },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    const imageSlide = slides.find((s) => s.layout === "image-left");
    expect(imageSlide).toBeDefined();
    expect(imageSlide!.layoutImageUrl).toBe("https://example.com/left.jpg");
    // Should have both the text block AND the image block
    expect(imageSlide!.blocks.length).toBe(2);
  });

  it("does NOT parse <!--LAYOUT:--> comments as layout markers", () => {
    // Legacy format — should be treated as a regular generic block, not a layout
    const lesson = makeLessonV1([
      { __component: "droplets.generic", id: 1, content: SLIDE_BREAK_MARKER },
      {
        __component: "droplets.generic",
        id: 2,
        content:
          '<!--LAYOUT:IMAGE_RIGHT:https://example.com/old.jpg--><img src="https://example.com/old.jpg" />',
      },
      { __component: "droplets.generic", id: 3, content: SLIDE_BREAK_MARKER },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    // The old comment block should just be a regular block in a default-layout slide
    const contentSlides = slides.filter(
      (s) =>
        s.lessonIndex === 0 &&
        s.blocks.length > 0 &&
        !s.blocks[0].content.includes("text-center"),
    );
    expect(contentSlides.length).toBe(1);
    expect(contentSlides[0].layout).toBe("default");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest --testPathPattern="presentation/utils" --verbose 2>&1 | tail -30`
Expected: FAIL — current code still parses HTML comments and discards layout blocks

- [ ] **Step 3: Update utils.ts to use slideLayout property**

Replace the contents of `frontend/components/presentation/utils.ts`:

```ts
/**
 * Presentation mode slide-splitting utilities.
 *
 * Splits on <!--SLIDE_BREAK--> markers. Image blocks with a `slideLayout`
 * property control slide layout (image-left, image-right, full-image).
 */
import { Block, Lesson } from "@/types";
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";
import { SLIDE_BREAK_MARKER } from "@/lib/blocknote/slide-break";

export type SlideLayout =
  | "default"
  | "image-left"
  | "image-right"
  | "full-image";

export type Slide = {
  blocks: Block[];
  title?: string;
  lessonName: string;
  lessonIndex: number;
  layout: SlideLayout;
  layoutImageUrl?: string;
};

// ── Helpers ──

function isEmptySpacing(block: Block): boolean {
  if (block.__component !== "droplets.generic") return false;
  return block.content.includes("empty-paragraph-spacing");
}

function isSlideBreak(block: Block): boolean {
  return (
    block.__component === "droplets.generic" &&
    block.content === SLIDE_BREAK_MARKER
  );
}

function hasSlideLayout(block: Block): block is Extract<
  Block,
  { __component: "droplets.generic" }
> & {
  slideLayout: SlideLayout;
  slideLayoutImageUrl: string;
} {
  return (
    block.__component === "droplets.generic" &&
    "slideLayout" in block &&
    block.slideLayout !== undefined
  );
}

function extractHeadingTitle(block: Block): string | undefined {
  if (block.__component !== "droplets.generic") return undefined;
  const match = block.content.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
  if (!match) return undefined;
  return match[1].replace(/<[^>]+>/g, "").trim() || undefined;
}

// ── Main ──

export function splitBlocksIntoSlides(
  lesson: Lesson,
  lessonIndex: number,
): Slide[] {
  const rawBlocks: Block[] =
    lesson.blocksVersion === "v2" && lesson.blocksV2
      ? convertBlockNoteToV1Blocks(lesson.blocksV2)
      : lesson.blocks ?? [];

  const cleanBlocks = rawBlocks.filter(
    (b) => !isEmptySpacing(b) && !isSlideBreak(b),
  );
  if (cleanBlocks.length === 0) return [];

  const hasSlideBreaks = rawBlocks.some(isSlideBreak);
  if (!hasSlideBreaks) return [];

  const slides: Slide[] = [];

  // Lesson title card
  slides.push({
    blocks: [
      {
        __component: "droplets.generic" as const,
        id: -(lessonIndex + 1) * 1000,
        content: `<h1 class="text-center">${lesson.name}</h1>`,
      },
    ],
    title: lesson.name,
    lessonName: lesson.name,
    lessonIndex,
    layout: "default",
  });

  return splitByMarkers(rawBlocks, lesson, lessonIndex, slides);
}

function splitByMarkers(
  rawBlocks: Block[],
  lesson: Lesson,
  lessonIndex: number,
  slides: Slide[],
): Slide[] {
  let current: Block[] = [];
  let heading: string | undefined;
  let currentLayout: SlideLayout = "default";
  let currentLayoutImageUrl: string | undefined;

  function flush() {
    if (current.length > 0) {
      slides.push({
        blocks: current,
        title: heading,
        lessonName: lesson.name,
        lessonIndex,
        layout: currentLayout,
        layoutImageUrl: currentLayoutImageUrl,
      });
      current = [];
      heading = undefined;
      currentLayout = "default";
      currentLayoutImageUrl = undefined;
    }
  }

  for (const block of rawBlocks) {
    if (isEmptySpacing(block)) continue;

    if (isSlideBreak(block)) {
      flush();
      continue;
    }

    // Read layout from typed property — block stays in the array
    if (hasSlideLayout(block)) {
      currentLayout = block.slideLayout;
      currentLayoutImageUrl = block.slideLayoutImageUrl;
    }

    const h = extractHeadingTitle(block);
    if (h) heading = h;

    current.push(block);
  }

  flush();
  return slides;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest --testPathPattern="presentation/utils" --verbose 2>&1 | tail -30`
Expected: PASS

- [ ] **Step 5: Run existing tests to check for regressions**

Run: `cd frontend && npx jest --verbose 2>&1 | tail -30`
Expected: All existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add frontend/components/presentation/utils.ts frontend/tests/components/presentation/utils.test.ts
git commit -m "feat(presentation): use slideLayout property instead of HTML comment parsing"
```

---

### Task 4: Fix presentation shell rendering

**Files:**

- Modify: `frontend/components/presentation/presentation-shell.tsx:436-503`

- [ ] **Step 1: Fix image-left/right layout rendering**

In `frontend/components/presentation/presentation-shell.tsx`, replace the image-left/right layout block (lines 436-477) with:

```tsx
if ((layout === "image-left" || layout === "image-right") && layoutImageUrl) {
  // Filter out the image-layout block from text content
  const textBlocks = allBlocks.filter(
    (b) => !(b.__component === "droplets.generic" && "slideLayout" in b),
  );

  const imgSide = (
    <div className="flex min-w-0 basis-1/2 items-center justify-center rounded-2xl bg-slate-100 p-4 dark:bg-slate-800/60">
      <img
        src={layoutImageUrl}
        alt=""
        className="max-h-[60vh] w-full rounded-xl object-cover shadow-md"
      />
    </div>
  );

  // If no text blocks, render image centered at larger size
  if (textBlocks.length === 0) {
    return (
      <div className="flex w-full items-center justify-center">
        <img
          src={layoutImageUrl}
          alt=""
          className="max-h-[75vh] w-auto rounded-lg object-contain"
        />
      </div>
    );
  }

  const textSide = (
    <div className="flex max-h-[60vh] min-w-0 basis-1/2 flex-col justify-center space-y-5 overflow-y-auto px-2">
      {textBlocks.map((block, idx) => (
        <PresentationBlockRenderer
          key={`${currentSlideKey}-${idx}`}
          block={block}
        />
      ))}
    </div>
  );

  return (
    <div
      className="flex w-full max-w-5xl items-stretch gap-6 text-left"
      style={{ minHeight: "60vh" }}
    >
      {layout === "image-left" ? (
        <>
          {imgSide}
          {textSide}
        </>
      ) : (
        <>
          {textSide}
          {imgSide}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Fix default layout overflow**

In the same file, replace the default layout block (lines 492-503) with:

```tsx
// Default layout
return (
  <div className="w-full max-w-4xl text-left">
    <div className="max-h-[85vh] space-y-4 overflow-y-auto [&_img]:max-h-[40vh] [&_img]:w-auto [&_img]:object-contain [&_pre]:max-h-[55vh] [&_pre]:overflow-y-auto">
      {allBlocks.map((block, idx) => (
        <PresentationBlockRenderer
          key={`${currentSlideKey}-${idx}`}
          block={block}
        />
      ))}
    </div>
  </div>
);
```

The only change: `overflow-hidden` to `overflow-y-auto`.

- [ ] **Step 3: Verify the app builds**

Run: `cd frontend && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/components/presentation/presentation-shell.tsx
git commit -m "fix(presentation): fix image layout flex math, overflow-y-auto, image-only slides"
```

---

### Task 5: Create the overflow detection hook

**Files:**

- Create: `frontend/hooks/useSlideOverflowDetection.ts`

- [ ] **Step 1: Create the hook**

Create `frontend/hooks/useSlideOverflowDetection.ts`:

```ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";
import { SLIDE_BREAK_TYPE } from "@/lib/blocknote/slide-break";
import type { CustomBlockNoteBlock } from "@/types";
import DOMPurify from "isomorphic-dompurify";

/**
 * Groups BlockNote blocks into slide chunks (split by slide-break blocks).
 * Returns the index of each slide-break block that has overflow in the preceding chunk.
 */
export function useSlideOverflowDetection(
  blocks: CustomBlockNoteBlock[] | undefined,
): Set<string> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [overflowingBreaks, setOverflowingBreaks] = useState<Set<string>>(
    new Set(),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create the hidden measurement div on mount
  useEffect(() => {
    const div = document.createElement("div");
    div.style.cssText = [
      "position: fixed",
      "top: -9999px",
      "left: -9999px",
      "width: 896px", // max-w-4xl = 56rem = 896px
      "opacity: 0",
      "pointer-events: none",
      "overflow: hidden",
    ].join(";");
    div.className =
      "prose prose-xl prose-sky prose-headings:font-bold prose-p:leading-relaxed max-w-none";
    document.body.appendChild(div);
    containerRef.current = div;

    return () => {
      document.body.removeChild(div);
      containerRef.current = null;
    };
  }, []);

  const measure = useCallback(() => {
    if (!containerRef.current || !blocks || blocks.length === 0) {
      setOverflowingBreaks(new Set());
      return;
    }

    const viewportHeight = window.innerHeight;
    const defaultBudget = viewportHeight * 0.85;
    const imageBudget = viewportHeight * 0.6;

    // Split blocks into chunks by slide-break
    const chunks: { blocks: CustomBlockNoteBlock[]; breakId: string | null }[] =
      [];
    let currentChunk: CustomBlockNoteBlock[] = [];

    for (const block of blocks) {
      if (block.type === SLIDE_BREAK_TYPE) {
        chunks.push({ blocks: currentChunk, breakId: block.id });
        currentChunk = [];
      } else {
        currentChunk.push(block);
      }
    }
    // Last chunk after the final slide break (no break ID to flag)
    // We don't flag this one since there's no slide break after it

    const overflows = new Set<string>();
    const container = containerRef.current;

    for (const chunk of chunks) {
      if (!chunk.breakId || chunk.blocks.length === 0) continue;

      // Convert to v1 blocks, then to HTML
      const v1Blocks = convertBlockNoteToV1Blocks(
        chunk.blocks as CustomBlockNoteBlock[],
      );

      // Check if any block has a slideLayout (affects budget)
      const hasImageLayout = v1Blocks.some(
        (b) => b.__component === "droplets.generic" && "slideLayout" in b,
      );
      const budget = hasImageLayout ? imageBudget : defaultBudget;

      // Render to HTML
      const html = v1Blocks
        .map((b) => {
          if (b.__component === "droplets.generic") return b.content;
          if (b.__component === "droplets.callout")
            return "<div style='height:80px'></div>";
          if (b.__component === "droplets.code-block")
            return `<pre style="max-height:55vh;overflow:hidden">${b.code}</pre>`;
          if (b.__component === "droplets.video")
            return "<div style='aspect-ratio:16/9;height:360px'></div>";
          return "<div style='height:60px'></div>"; // quizzes, sandpack, etc.
        })
        .join("");

      container.innerHTML = DOMPurify.sanitize(html, {
        ADD_TAGS: ["math", "semantics", "mrow", "mi", "mo", "mn"],
        ADD_ATTR: ["class", "style"],
      });

      if (container.scrollHeight > budget) {
        overflows.add(chunk.breakId);
      }
    }

    container.innerHTML = "";
    setOverflowingBreaks(overflows);
  }, [blocks]);

  // Debounced measurement on content change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(measure, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [measure]);

  // Re-measure on window resize
  useEffect(() => {
    const handleResize = () => measure();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [measure]);

  return overflowingBreaks;
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "useSlideOverflowDetection" | head -5`
Expected: No errors referencing this file (or no output)

- [ ] **Step 3: Commit**

```bash
git add frontend/hooks/useSlideOverflowDetection.ts
git commit -m "feat(editor): add useSlideOverflowDetection hook for measuring slide overflow"
```

---

### Task 6: Wire overflow detection into the editor and slide break block

**Files:**

- Modify: `frontend/components/draft/lesson/blocknote-editor-client.tsx`
- Modify: `frontend/components/ui/blocknote/blocks/slide-break-block.tsx`

- [ ] **Step 1: Create an overflow context**

Add a React context to share overflow state. At the top of `frontend/components/draft/lesson/blocknote-editor-client.tsx`, add:

```ts
import { createContext, useContext } from "react";
import { useSlideOverflowDetection } from "@/hooks/useSlideOverflowDetection";

const SlideOverflowContext = createContext<Set<string>>(new Set());
export const useSlideOverflow = () => useContext(SlideOverflowContext);
```

- [ ] **Step 2: Wrap the editor with the overflow context provider**

In the `BlockNoteEditorClient` component, add the hook call after `isReady`:

```ts
const overflowingBreaks = useSlideOverflowDetection(
  isReady ? (editor.document as unknown as CustomBlockNoteBlock[]) : undefined,
);
```

Add `CustomBlockNoteBlock` to the imports from `@/types`.

Wrap the return JSX (the `<div className="blocknote-no-link ...">` block) with:

```tsx
return (
  <SlideOverflowContext.Provider value={overflowingBreaks}>
    <div className="blocknote-no-link w-full rounded-lg border border-slate-200 dark:border-slate-700">
      {/* ... existing BlockNoteView ... */}
    </div>
  </SlideOverflowContext.Provider>
);
```

- [ ] **Step 3: Update the slide break block to show overflow warning**

Read the current `frontend/components/ui/blocknote/blocks/slide-break-block.tsx` first, then modify the render function to check overflow context. The slide break block needs to read `useSlideOverflow()` and check if its block ID is in the overflow set.

In the slide break block's render component, add:

```tsx
import { useSlideOverflow } from "@/components/draft/lesson/blocknote-editor-client";

// Inside the render function:
const overflowingBreaks = useSlideOverflow();
const isOverflowing = overflowingBreaks.has(props.block.id);
```

Then conditionally render the warning below the existing slide break line:

```tsx
{
  isOverflowing && (
    <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3.5 w-3.5"
      >
        <path
          fillRule="evenodd"
          d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm0 6.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
          clipRule="evenodd"
        />
      </svg>
      Slide content may overflow in presentation mode
    </div>
  );
}
```

- [ ] **Step 4: Verify the app builds**

Run: `cd frontend && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/components/draft/lesson/blocknote-editor-client.tsx frontend/components/ui/blocknote/blocks/slide-break-block.tsx
git commit -m "feat(editor): wire overflow detection into editor and slide break blocks"
```

---

### Task 7: Create the auto-format Server Action

**Files:**

- Create: `frontend/lib/actions/auto-format-slides.ts`

- [ ] **Step 1: Create the Server Action file**

Create `frontend/lib/actions/auto-format-slides.ts`:

````ts
"use server";

import Anthropic from "@anthropic-ai/sdk";

type AutoFormatOperation =
  | { type: "insert-slide-break"; afterBlockIndex: number }
  | {
      type: "set-image-layout";
      blockIndex: number;
      layout: "image-left" | "image-right" | "full-image";
    };

type BlockSummary = {
  index: number;
  type: string;
  textPreview: string;
  hasImage: boolean;
  imageUrl?: string;
};

export async function autoFormatSlides(
  blockSummaries: BlockSummary[],
): Promise<{ operations: AutoFormatOperation[] } | { error: string }> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Anthropic API key not configured" };
  }

  const blockList = blockSummaries
    .map((b) => {
      let desc = `[${b.index}] ${b.type}`;
      if (b.textPreview) desc += `: "${b.textPreview}"`;
      if (b.hasImage) desc += ` (image: ${b.imageUrl ?? "unknown"})`;
      return desc;
    })
    .join("\n");

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are formatting lesson content for a slide presentation. Given the block list below, decide:

1. Where to insert slide breaks to create well-sized slides. Each slide should have roughly 3-8 blocks of content. Break at natural content boundaries (before headings, between topics, before/after images).
2. For any image blocks, what presentation layout to use:
   - "image-left": image on left, text on right (use when text follows the image)
   - "image-right": image on right, text on left (use when text precedes the image)
   - "full-image": image fills the whole slide (use for standalone images with no adjacent text)

Rules:
- Do NOT insert a slide break before the very first block.
- Do NOT insert a slide break after the very last block.
- If slide breaks already exist (type: "slide-break"), work around them — do not duplicate.
- Keep text-heavy slides to ~25 lines or fewer.
- Keep image+text slides to ~15 lines of text.

Respond with ONLY a JSON array of operations. No explanation, no markdown fences.

Operation types:
{"type":"insert-slide-break","afterBlockIndex":N}
{"type":"set-image-layout","blockIndex":N,"layout":"image-left"|"image-right"|"full-image"}

Block list:
${blockList}`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";

    // Parse the JSON response — strip markdown fences if Haiku wraps them
    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const operations: AutoFormatOperation[] = JSON.parse(cleaned);

    // Validate operations
    const valid = operations.filter((op) => {
      if (op.type === "insert-slide-break") {
        return (
          typeof op.afterBlockIndex === "number" &&
          op.afterBlockIndex >= 0 &&
          op.afterBlockIndex < blockSummaries.length
        );
      }
      if (op.type === "set-image-layout") {
        return (
          typeof op.blockIndex === "number" &&
          op.blockIndex >= 0 &&
          op.blockIndex < blockSummaries.length &&
          ["image-left", "image-right", "full-image"].includes(op.layout)
        );
      }
      return false;
    });

    return { operations: valid };
  } catch (err) {
    console.error("Auto-format slides failed:", err);

    if (err instanceof Anthropic.APIError) {
      if (err.status === 429)
        return { error: "Rate limited — try again in a moment." };
      if (err.status === 529)
        return { error: "Service overloaded — try again later." };
    }

    return { error: "Failed to auto-format slides. Please try again." };
  }
}
````

- [ ] **Step 2: Verify no type errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "auto-format" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/actions/auto-format-slides.ts
git commit -m "feat(actions): add autoFormatSlides Server Action using Haiku"
```

---

### Task 8: Add the Auto-Format button to the sidebar

**Files:**

- Modify: `frontend/components/draft/sidebar.tsx`

- [ ] **Step 1: Read the current sidebar file**

Read `frontend/components/draft/sidebar.tsx` fully to understand the imports, state, and where the Present button is.

- [ ] **Step 2: Add the Auto-Format button**

Add the import at the top of the file:

```ts
import { autoFormatSlides } from "@/lib/actions/auto-format-slides";
import { Wand2, Loader2 } from "lucide-react";
```

Add state for the auto-format operation inside the component (near other state declarations):

```ts
const [isAutoFormatting, setIsAutoFormatting] = useState(false);
```

Add the handler function inside the component:

```ts
const handleAutoFormat = async () => {
  setIsAutoFormatting(true);
  try {
    // Build block summaries from current lessons
    const allBlocks: {
      index: number;
      type: string;
      textPreview: string;
      hasImage: boolean;
      imageUrl?: string;
    }[] = [];
    let globalIndex = 0;

    for (const lesson of lessons) {
      const blocks = lesson.blocksV2 ?? [];
      for (const block of blocks) {
        const b = block as any;
        const textContent =
          b.content
            ?.map((c: any) => c.text ?? "")
            .join("")
            .slice(0, 100) ?? "";

        allBlocks.push({
          index: globalIndex,
          type: b.type ?? "unknown",
          textPreview: textContent,
          hasImage: b.type === "image",
          imageUrl: b.props?.url,
        });
        globalIndex++;
      }
    }

    const result = await autoFormatSlides(allBlocks);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    // Apply operations to the editor
    // The parent page needs to handle applying these operations to the BlockNote editor.
    // For now, dispatch a custom event that the editor can listen to.
    window.dispatchEvent(
      new CustomEvent("auto-format-slides", {
        detail: { operations: result.operations },
      }),
    );

    toast.success(
      `Auto-formatted: ${result.operations.filter((o) => o.type === "insert-slide-break").length} slide breaks inserted`,
    );
  } catch (err) {
    console.error("Auto-format error:", err);
    toast.error("Failed to auto-format slides");
  } finally {
    setIsAutoFormatting(false);
  }
};
```

Add the button in the sidebar, right before the Present button (inside the `<div className="flex w-full flex-col gap-2 pb-2">` block, after the Preview link):

```tsx
<button
  onClick={handleAutoFormat}
  disabled={isAutoFormatting}
  className="flex items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-2 text-center text-black transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-700"
>
  {isAutoFormatting ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Formatting...
    </>
  ) : (
    <>
      <Wand2 className="h-4 w-4" />
      Auto-Format Slides
    </>
  )}
</button>
```

- [ ] **Step 3: Verify the app builds**

Run: `cd frontend && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/components/draft/sidebar.tsx
git commit -m "feat(sidebar): add Auto-Format Slides button using Haiku AI"
```

---

### Task 9: Wire auto-format operations into the BlockNote editor

**Files:**

- Modify: `frontend/components/draft/lesson/blocknote-editor-client.tsx`

- [ ] **Step 1: Add a listener for auto-format events**

In the `BlockNoteEditorClient` component, add a `useEffect` that listens for the `auto-format-slides` custom event and applies operations to the editor:

```ts
// Listen for auto-format operations from the sidebar
useEffect(() => {
  if (!isReady) return;

  const handleAutoFormat = (e: Event) => {
    const { operations } = (e as CustomEvent).detail;
    if (!operations || !Array.isArray(operations)) return;

    // Sort insert operations in reverse order so indices stay valid
    const insertOps = operations
      .filter((op: any) => op.type === "insert-slide-break")
      .sort((a: any, b: any) => b.afterBlockIndex - a.afterBlockIndex);

    const layoutOps = operations.filter(
      (op: any) => op.type === "set-image-layout",
    );

    // Apply layout changes first (doesn't shift indices)
    for (const op of layoutOps) {
      const block = editor.document[op.blockIndex];
      if (block && block.type === "image") {
        editor.updateBlock(block, {
          props: { layout: op.layout } as any,
        });
      }
    }

    // Insert slide breaks in reverse order
    for (const op of insertOps) {
      const afterBlock = editor.document[op.afterBlockIndex];
      if (afterBlock) {
        editor.insertBlocks(
          [{ type: "slide-break" as any }],
          afterBlock,
          "after",
        );
      }
    }
  };

  window.addEventListener("auto-format-slides", handleAutoFormat);
  return () =>
    window.removeEventListener("auto-format-slides", handleAutoFormat);
}, [editor, isReady]);
```

- [ ] **Step 2: Verify the app builds**

Run: `cd frontend && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/components/draft/lesson/blocknote-editor-client.tsx
git commit -m "feat(editor): handle auto-format slide operations from sidebar"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Run all tests**

Run: `cd frontend && npx jest --verbose 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 2: Run the build**

Run: `cd frontend && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Run linting**

Run: `cd frontend && npx next lint 2>&1 | tail -20`
Expected: No new lint errors

- [ ] **Step 4: Manual smoke test checklist**

Start the dev server (`npm run dev`) and verify:

1. Create a droplet with a lesson containing text + image (set to image-right layout) + slide breaks
2. Verify the overflow warning appears when a slide has too much content
3. Verify presentation mode shows the image-right layout correctly with text visible
4. Verify an image-right slide with NO text renders the image full-width (not half-empty)
5. Verify `overflow-y-auto` allows scrolling on overfull default-layout slides
6. Click "Auto-Format Slides" and verify slide breaks are inserted
7. Verify the overflow warnings update after auto-format

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: presentation mode fixes — overflow warnings, image layouts, auto-format"
```
