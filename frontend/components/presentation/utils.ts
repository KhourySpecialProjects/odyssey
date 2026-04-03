/**
 * Presentation mode slide-splitting utilities.
 *
 * Splits on <!--SLIDE_BREAK--> markers. Two-column layout is controlled
 * by the `nextSlideLayout` property on slide-break blocks.
 */
import { Block, Lesson } from "@/types";
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";
import { SLIDE_BREAK_MARKER } from "@/lib/blocknote/slide-break";
import { COLUMN_BREAK_MARKER } from "@/lib/blocknote/column-break";

export type SlideLayout = "default" | "two-columns";

export type Slide = {
  blocks: Block[];
  title?: string;
  lessonName: string;
  lessonIndex: number;
  layout: SlideLayout;
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

export function isColumnBreak(block: Block): boolean {
  return (
    block.__component === "droplets.generic" &&
    block.content === COLUMN_BREAK_MARKER
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
    (b) => !isEmptySpacing(b) && !isSlideBreak(b) && !isColumnBreak(b),
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
  // Layout requested by the slide-break block for the NEXT slide
  let pendingLayout: SlideLayout | undefined;

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
      heading = undefined;
      currentLayout = pendingLayout ?? "default";
      pendingLayout = undefined;
    } else if (pendingLayout !== undefined) {
      currentLayout = pendingLayout;
      pendingLayout = undefined;
    }
  }

  for (const block of rawBlocks) {
    if (isEmptySpacing(block)) continue;

    if (isSlideBreak(block)) {
      const raw =
        block.__component === "droplets.generic" && "nextSlideLayout" in block
          ? block.nextSlideLayout
          : undefined;
      pendingLayout = raw === "two-columns" ? "two-columns" : undefined;
      flush();
      continue;
    }

    const h = extractHeadingTitle(block);
    if (h) heading = h;

    current.push(block);
  }

  flush();
  return slides;
}
