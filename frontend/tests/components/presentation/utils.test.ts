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

  it("does NOT parse old LAYOUT comments as layout markers", () => {
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
