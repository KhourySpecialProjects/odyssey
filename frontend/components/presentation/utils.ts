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

const LEGACY_LAYOUT_MAP: Record<string, SlideLayout> = {
  IMAGE_LEFT: "image-left",
  IMAGE_RIGHT: "image-right",
  FULL_IMAGE: "full-image",
};

function hasSlideLayout(block: Block): block is Extract<
  Block,
  { __component: "droplets.generic" }
> & {
  slideLayout: SlideLayout;
  slideLayoutImageUrl: string;
} {
  if (
    block.__component === "droplets.generic" &&
    "slideLayout" in block &&
    block.slideLayout !== undefined
  ) {
    return true;
  }

  // Backward compat: parse legacy <!--LAYOUT:...--> comment format
  if (
    block.__component === "droplets.generic" &&
    block.content.startsWith("<!--LAYOUT:")
  ) {
    const match = block.content.match(
      /<!--LAYOUT:(IMAGE_LEFT|IMAGE_RIGHT|FULL_IMAGE):(.*?)-->/,
    );
    if (match) {
      const layout = LEGACY_LAYOUT_MAP[match[1]];
      if (layout) {
        (block as any).slideLayout = layout;
        (block as any).slideLayoutImageUrl = match[2];
        return true;
      }
    }
  }

  return false;
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
