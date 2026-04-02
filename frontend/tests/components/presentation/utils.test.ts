import {
  splitBlocksIntoSlides,
  isColumnBreak,
} from "@/components/presentation/utils";
import { SLIDE_BREAK_MARKER } from "@/lib/blocknote/slide-break";
import { COLUMN_BREAK_MARKER } from "@/lib/blocknote/column-break";
import { Lesson } from "@/types";

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
  it("creates a content slide with default layout", () => {
    const lesson = makeLessonV1([
      { __component: "droplets.generic", id: 1, content: SLIDE_BREAK_MARKER },
      { __component: "droplets.generic", id: 2, content: "<p>Some text</p>" },
      { __component: "droplets.generic", id: 3, content: SLIDE_BREAK_MARKER },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    expect(slides.length).toBeGreaterThanOrEqual(2);
    const contentSlide = slides[1];
    expect(contentSlide.layout).toBe("default");
    expect(contentSlide.blocks.length).toBe(1);
  });

  it("creates a two-column slide when slide break has nextSlideLayout: two-columns", () => {
    const lesson = makeLessonV1([
      {
        __component: "droplets.generic",
        id: 1,
        content: SLIDE_BREAK_MARKER,
        nextSlideLayout: "two-columns",
      },
      {
        __component: "droplets.generic",
        id: 2,
        content: "<p>Left content</p>",
      },
      {
        __component: "droplets.generic",
        id: 3,
        content: "<p>Right content</p>",
      },
      { __component: "droplets.generic", id: 4, content: SLIDE_BREAK_MARKER },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    const twoColSlide = slides.find((s) => s.layout === "two-columns");
    expect(twoColSlide).toBeDefined();
    expect(twoColSlide!.blocks.length).toBe(2);
  });

  it("produces default layout when slide break has no nextSlideLayout", () => {
    const lesson = makeLessonV1([
      { __component: "droplets.generic", id: 1, content: SLIDE_BREAK_MARKER },
      {
        __component: "droplets.generic",
        id: 2,
        content: "<p>Some content</p>",
      },
      { __component: "droplets.generic", id: 3, content: SLIDE_BREAK_MARKER },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    // Skip the lesson title card (index 0)
    const contentSlide = slides[1];
    expect(contentSlide).toBeDefined();
    expect(contentSlide!.layout).toBe("default");
  });

  it("returns no slides when lesson has no slide breaks", () => {
    const lesson = makeLessonV1([
      { __component: "droplets.generic", id: 1, content: "<p>No breaks</p>" },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    expect(slides.length).toBe(0);
  });
});

describe("isColumnBreak", () => {
  it("returns true for a droplets.generic block with COLUMN_BREAK_MARKER content", () => {
    const block = {
      __component: "droplets.generic" as const,
      id: 1,
      content: COLUMN_BREAK_MARKER,
    };
    expect(isColumnBreak(block)).toBe(true);
  });

  it("returns false for a slide-break block", () => {
    const block = {
      __component: "droplets.generic" as const,
      id: 1,
      content: SLIDE_BREAK_MARKER,
    };
    expect(isColumnBreak(block)).toBe(false);
  });

  it("returns false for a non-generic block component", () => {
    const block = {
      __component: "droplets.text" as any,
      id: 1,
      content: COLUMN_BREAK_MARKER,
    };
    expect(isColumnBreak(block)).toBe(false);
  });
});

describe("splitBlocksIntoSlides — column-break behavior", () => {
  it("column-break block passes through into the slide's blocks array (not a slide boundary)", () => {
    const lesson = makeLessonV1([
      {
        __component: "droplets.generic",
        id: 1,
        content: SLIDE_BREAK_MARKER,
        nextSlideLayout: "two-columns",
      },
      { __component: "droplets.generic", id: 2, content: "<p>Left</p>" },
      { __component: "droplets.generic", id: 3, content: COLUMN_BREAK_MARKER },
      { __component: "droplets.generic", id: 4, content: "<p>Right</p>" },
      { __component: "droplets.generic", id: 5, content: SLIDE_BREAK_MARKER },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    const twoColSlide = slides.find((s) => s.layout === "two-columns");
    expect(twoColSlide).toBeDefined();
    // All 3 blocks (left content, column-break, right content) are in the same slide
    expect(twoColSlide!.blocks.length).toBe(3);
    // The column-break block is preserved in the slide's blocks array
    const hasColumnBreak = twoColSlide!.blocks.some(
      (b) => b.content === COLUMN_BREAK_MARKER,
    );
    expect(hasColumnBreak).toBe(true);
  });

  it("column-break does NOT split the slide into two separate slides", () => {
    const lesson = makeLessonV1([
      {
        __component: "droplets.generic",
        id: 1,
        content: SLIDE_BREAK_MARKER,
        nextSlideLayout: "two-columns",
      },
      { __component: "droplets.generic", id: 2, content: "<p>Left</p>" },
      { __component: "droplets.generic", id: 3, content: COLUMN_BREAK_MARKER },
      { __component: "droplets.generic", id: 4, content: "<p>Right</p>" },
      { __component: "droplets.generic", id: 5, content: SLIDE_BREAK_MARKER },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    // Should only have: lesson title card + 1 two-column slide (not 3 slides)
    expect(slides.length).toBe(2);
  });

  it("column-break-only slide produces no slides (filtered from cleanBlocks)", () => {
    const lesson = makeLessonV1([
      { __component: "droplets.generic", id: 1, content: SLIDE_BREAK_MARKER },
      { __component: "droplets.generic", id: 2, content: COLUMN_BREAK_MARKER },
      { __component: "droplets.generic", id: 3, content: SLIDE_BREAK_MARKER },
    ]);

    // cleanBlocks filters out both slide-break and column-break blocks,
    // so the lesson appears empty and returns no slides
    const slides = splitBlocksIntoSlides(lesson, 0);
    expect(slides.length).toBe(0);
  });

  it("column-break is filtered from cleanBlocks (does not count as real content)", () => {
    // A lesson where the only non-marker blocks are column-breaks should return no slides
    const lesson = makeLessonV1([
      { __component: "droplets.generic", id: 1, content: COLUMN_BREAK_MARKER },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    expect(slides.length).toBe(0);
  });

  it("multiple column-breaks in one slide all pass through into blocks array", () => {
    const lesson = makeLessonV1([
      {
        __component: "droplets.generic",
        id: 1,
        content: SLIDE_BREAK_MARKER,
        nextSlideLayout: "two-columns",
      },
      { __component: "droplets.generic", id: 2, content: "<p>Block A</p>" },
      { __component: "droplets.generic", id: 3, content: COLUMN_BREAK_MARKER },
      { __component: "droplets.generic", id: 4, content: "<p>Block B</p>" },
      { __component: "droplets.generic", id: 5, content: COLUMN_BREAK_MARKER },
      { __component: "droplets.generic", id: 6, content: "<p>Block C</p>" },
      { __component: "droplets.generic", id: 7, content: SLIDE_BREAK_MARKER },
    ]);

    const slides = splitBlocksIntoSlides(lesson, 0);
    const twoColSlide = slides.find((s) => s.layout === "two-columns");
    expect(twoColSlide).toBeDefined();
    // 3 content blocks + 2 column-break markers = 5 blocks in the slide
    expect(twoColSlide!.blocks.length).toBe(5);
  });
});
