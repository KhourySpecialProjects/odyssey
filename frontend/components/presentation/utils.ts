/**
 * Presentation mode slide-splitting utilities.
 *
 * If the lesson has explicit <!--SLIDE_BREAK--> markers (from the "Slide Break"
 * BlockNote block), it splits on those markers — giving authors full control.
 *
 * If no markers exist, falls back to smart auto-splitting:
 * headings start new slides, heavy blocks get isolated, lightweight
 * blocks are grouped until they'd overflow.
 */
import { Block, Lesson } from "@/types";
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";

export type SlideLayout =
  | "default"
  | "image-left"
  | "image-right"
  | "full-image"
  | "two-columns";

export type Slide = {
  blocks: Block[];
  title?: string;
  lessonName: string;
  lessonIndex: number;
  layout?: SlideLayout;
};

// ── Helpers ──

function isEmptySpacing(block: Block): boolean {
  if (block.__component !== "droplets.generic") return false;
  return block.content.includes("empty-paragraph-spacing");
}

function isSlideBreak(block: Block): boolean {
  return (
    block.__component === "droplets.generic" &&
    block.content === "<!--SLIDE_BREAK-->"
  );
}

function isLayoutMarker(block: Block): boolean {
  return (
    block.__component === "droplets.generic" &&
    block.content.startsWith("<!--LAYOUT:")
  );
}

function getLayout(block: Block): SlideLayout {
  if (block.__component !== "droplets.generic") return "default";
  const c = block.content;
  if (c === "<!--LAYOUT:IMAGE_LEFT-->") return "image-left";
  if (c === "<!--LAYOUT:IMAGE_RIGHT-->") return "image-right";
  if (c === "<!--LAYOUT:FULL_IMAGE-->") return "full-image";
  if (c === "<!--LAYOUT:TWO_COLUMNS-->") return "two-columns";
  return "default";
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

  // Check if this lesson has explicit slide breaks
  const hasSlideBreaks = rawBlocks.some(isSlideBreak);

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
  });

  if (hasSlideBreaks) {
    // ── Explicit slide breaks: author-controlled ──
    return splitByMarkers(rawBlocks, lesson, lessonIndex, slides);
  } else {
    // No slide breaks → no slides for this lesson
    // TODO: Uncomment to enable auto-splitting for lessons without breaks
    // return splitAuto(rawBlocks, lesson, lessonIndex, slides);
    return [];
  }
}

/** Split on explicit <!--SLIDE_BREAK--> and layout markers. */
function splitByMarkers(
  rawBlocks: Block[],
  lesson: Lesson,
  lessonIndex: number,
  slides: Slide[],
): Slide[] {
  let current: Block[] = [];
  let heading: string | undefined;
  let currentLayout: SlideLayout = "default";

  function flush() {
    if (current.length > 0) {
      slides.push({
        blocks: current,
        title: heading,
        lessonName: lesson.name,
        lessonIndex,
        layout: currentLayout,
      });
      current = [];
      currentLayout = "default";
    }
  }

  for (const block of rawBlocks) {
    if (isEmptySpacing(block)) continue;

    const h = extractHeadingTitle(block);
    if (h) heading = h;

    // Slide break → flush and start new slide
    if (isSlideBreak(block)) {
      flush();
      continue;
    }

    // Layout marker → flush current, set layout for next slide
    if (isLayoutMarker(block)) {
      flush();
      currentLayout = getLayout(block);
      continue;
    }

    current.push(block);
  }

  flush();
  return slides;
}
