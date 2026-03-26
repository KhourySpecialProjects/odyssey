/**
 * Presentation mode slide-splitting utilities.
 *
 * Splits on <!--SLIDE_BREAK--> markers. If an image block within a slide
 * has a layout set, it emits a <!--LAYOUT:...--> marker that controls
 * how that slide is presented (image-left, image-right, full-image).
 */
import { Block, Lesson } from "@/types";
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";

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
  const c = (block as { content: string }).content;
  if (c.startsWith("<!--LAYOUT:IMAGE_LEFT")) return "image-left";
  if (c.startsWith("<!--LAYOUT:IMAGE_RIGHT")) return "image-right";
  if (c.startsWith("<!--LAYOUT:FULL_IMAGE")) return "full-image";
  return "default";
}

function getLayoutImageUrl(block: Block): string | undefined {
  const match = (block as { content: string }).content.match(
    /<!--LAYOUT:[A-Z_]+:(.*?)-->/,
  );
  return match ? match[1] : undefined;
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
    (b) => !isEmptySpacing(b) && !isSlideBreak(b) && !isLayoutMarker(b),
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

    // Layout markers set the layout for the current slide (not added to content)
    if (isLayoutMarker(block)) {
      currentLayout = getLayout(block);
      currentLayoutImageUrl = getLayoutImageUrl(block);
      continue;
    }

    const h = extractHeadingTitle(block);
    if (h) heading = h;

    current.push(block);
  }

  flush();
  return slides;
}
