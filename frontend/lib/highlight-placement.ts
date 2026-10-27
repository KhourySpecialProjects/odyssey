import { Highlight, HighlightContext } from "@/types";
// Not the lib/anchors index, which brings the BlockNote editor's plugin too
import { resolveAnchor } from "@/lib/anchors/resolve";
import { CONTEXT, OUTDATED } from "@/lib/anchors/types";

/** A lesson block that can hold highlights, with its text as it's drawn */
export type HighlightBlock = {
  id: number;
  /** Ids of the BlockNote blocks grouped into this one */
  sourceBlockIds?: number[];
  text: string;
};

/** A saved highlight, at the place it covers in the lesson as it is now */
export type PlacedHighlight = Highlight & {
  /** The words it covered were edited, so it's drawn over their new text */
  edited?: boolean;
};

export type HighlightPlacement = {
  placed: PlacedHighlight[];
  /**
   * Highlights whose text has been deleted from the lesson. They're kept, not
   * dropped, so the reader can move or remove them.
   */
  detached: Highlight[];
};

// resolveAnchor looks within one field; all of a lesson's blocks are one
const FIELD = "lesson";

// Saved text found somewhere new needs this much of its saved surroundings
// still beside it (or to be the only copy in the lesson), so a short phrase
// isn't moved onto an unrelated copy of the same words
const MIN_CONTEXT = 8;

/** The context saved with a new highlight, from its block's drawn text */
export function highlightContext(
  text: string,
  start: number,
  end: number,
): HighlightContext {
  return {
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
  };
}

/**
 * Finds each highlight in the lesson as it is now (ODY-198). A highlight's
 * position is character offsets in its block's drawn text, and its block id
 * is that of the block's first paragraph, so an edit anywhere above it moves
 * it onto other words unless it's found again here.
 *
 * Highlights with a saved context are found with lib/anchors' resolveAnchor.
 * Older ones only have their text: they stay at their offsets while the text
 * there still matches, or move to another copy of it.
 */
export function placeHighlights(
  highlights: Highlight[],
  blocks: HighlightBlock[],
  lessonUpdatedAt?: string,
): HighlightPlacement {
  const placement: HighlightPlacement = { placed: [], detached: [] };
  for (const highlight of highlights) {
    const placed = place(highlight, blocks, lessonUpdatedAt);
    if (placed) placement.placed.push(placed);
    else placement.detached.push(highlight);
  }
  return placement;
}

function place(
  highlight: Highlight,
  blocks: HighlightBlock[],
  lessonUpdatedAt?: string,
): PlacedHighlight | null {
  // A new highlight has a negative id until it's saved, and was made on the
  // text as it is now
  if ((highlight.id ?? 0) <= 0) return highlight;

  const { blockId, context } = highlight;
  const { start = 0, end = 0 } = highlight.position ?? {};
  const home = blocks.find(
    (block) =>
      block.id === blockId || !!block.sourceBlockIds?.includes(blockId),
  );
  const at = (
    block: HighlightBlock,
    from: number,
    to: number,
    edited = false,
  ): PlacedHighlight => ({
    ...highlight,
    blockId: block.id,
    position: { start: from, end: to },
    ...(edited && { edited }),
  });
  const unmoved = (block: HighlightBlock, from: number, to: number) =>
    block === home && from === start && to === end;

  if (context) {
    const found = resolveAnchor(
      { [FIELD]: blocks.map(({ id, text }) => ({ id: String(id), text })) },
      {
        v: 1,
        field: FIELD,
        blockId: home && String(home.id),
        start,
        end,
        ...context,
      },
    );
    if (found === OUTDATED) return null;
    const block = blocks.find(({ id }) => String(id) === found.blockId);
    if (!block) return null;
    if (
      found.exact &&
      !unmoved(block, found.start, found.end) &&
      !isUnique(blocks, context.quote) &&
      contextAround(block.text, found.start, found.end, context) <
        Math.min(MIN_CONTEXT, context.prefix.length + context.suffix.length)
    ) {
      return null;
    }
    return at(block, found.start, found.end, !found.exact);
  }

  // Saved without a context. Its text is the selection as the browser copied
  // it, so spacing may differ from the drawn text.
  if (
    home &&
    (savedSince(highlight, lessonUpdatedAt) ||
      sameWords(home.text.slice(start, end), highlight.text))
  ) {
    return at(home, start, end);
  }
  const found = findWords(blocks, home, highlight.text, start);
  return found ? at(found.block, found.start, found.end) : null;
}

/**
 * Highlights saved since the lesson's last edit were measured on its text as
 * it is now, even where their saved text doesn't match it (a selection that
 * started in a formula saves the formula's source)
 */
function savedSince({ createdAt }: Highlight, lessonUpdatedAt?: string) {
  return (
    !!createdAt &&
    !!lessonUpdatedAt &&
    Date.parse(createdAt) >= Date.parse(lessonUpdatedAt)
  );
}

const sameWords = (a: string, b: string) =>
  a.replace(/\s+/g, "") === b.replace(/\s+/g, "");

/** Matches text with any spacing between its words */
function wordsPattern(text: string): RegExp | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const escaped = words.map((word) =>
    word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return new RegExp(escaped.join("\\s*"), "g");
}

/**
 * Another copy of text saved without a context: the one nearest its old
 * offsets in its own block, or else the only copy in the lesson
 */
function findWords(
  blocks: HighlightBlock[],
  home: HighlightBlock | undefined,
  text: string,
  near: number,
): { block: HighlightBlock; start: number; end: number } | null {
  const pattern = wordsPattern(text);
  if (!pattern) return null;
  const copies = blocks.flatMap((block) =>
    Array.from(block.text.matchAll(pattern), (match) => ({
      block,
      start: match.index,
      end: match.index + match[0].length,
    })),
  );

  const inHome = copies.filter((copy) => copy.block === home);
  if (inHome.length > 0) {
    return inHome.reduce((best, copy) =>
      Math.abs(copy.start - near) < Math.abs(best.start - near) ? copy : best,
    );
  }
  return copies.length === 1 ? copies[0] : null;
}

function isUnique(blocks: HighlightBlock[], quote: string): boolean {
  let copies = 0;
  for (const { text } of blocks) {
    for (
      let at = text.indexOf(quote);
      at !== -1;
      at = text.indexOf(quote, at + 1)
    ) {
      if (++copies > 1) return false;
    }
  }
  return copies === 1;
}

/** How many characters of the saved prefix and suffix still sit either side */
function contextAround(
  text: string,
  start: number,
  end: number,
  { prefix, suffix }: HighlightContext,
): number {
  let before = 0;
  while (
    before < prefix.length &&
    text[start - 1 - before] === prefix[prefix.length - 1 - before]
  ) {
    before++;
  }
  let after = 0;
  while (after < suffix.length && text[end + after] === suffix[after]) {
    after++;
  }
  return before + after;
}
