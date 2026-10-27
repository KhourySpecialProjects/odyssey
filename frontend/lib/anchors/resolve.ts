import {
  Anchor,
  AnchorBlock,
  AnchorContent,
  AnchorRange,
  CONTEXT,
  OUTDATED,
} from "./types";

// The unchanged text needed either side to trust an edited quote's new text
const EDGE = 10;

/**
 * Finds an anchor in the current content:
 * 1. at its offsets in its own block, if the text there is still the quote;
 * 2. otherwise the quote anywhere in its field, choosing between copies by
 *    how much of the saved prefix and suffix still surround them;
 * 3. otherwise, if the quoted text itself was edited but the text either
 *    side of it wasn't, the text now between them;
 * 4. otherwise "outdated". An anchor is never dropped silently.
 */
export function resolveAnchor(
  content: AnchorContent,
  anchor: Anchor,
): AnchorRange | typeof OUTDATED {
  const blocks = content[anchor.field] ?? [];
  // Its own block: by id, or the only block of a field without ids
  const home =
    anchor.blockId !== undefined
      ? blocks.find((block) => block.id === anchor.blockId)
      : blocks.length === 1
        ? blocks[0]
        : undefined;
  const rangeIn = (
    block: AnchorBlock,
    start: number,
    end: number,
    exact = true,
  ): AnchorRange => ({
    field: anchor.field,
    ...(block.id !== undefined && { blockId: block.id }),
    start,
    end,
    exact,
  });

  const { quote, start, end } = anchor;
  if (!quote) {
    // A whole block
    return anchor.blockId !== undefined && home
      ? rangeIn(home, 0, home.text.length)
      : OUTDATED;
  }

  if (
    home &&
    start !== undefined &&
    end !== undefined &&
    home.text.slice(start, end) === quote
  ) {
    return rangeIn(home, start, end);
  }

  let best: { block: AnchorBlock; start: number; score: number } | undefined;
  for (const block of blocks) {
    for (
      let at = block.text.indexOf(quote);
      at !== -1;
      at = block.text.indexOf(quote, at + 1)
    ) {
      // Surroundings decide; its own block, then nearness, break a tie
      const score =
        contextMatch(block.text, at, at + quote.length, anchor) +
        (block === home ? 0.5 - Math.abs(at - (start ?? 0)) * 1e-6 : 0);
      if (!best || score > best.score) best = { block, start: at, score };
    }
  }
  if (best) return rangeIn(best.block, best.start, best.start + quote.length);

  const edited = betweenContext(blocks, home, anchor);
  return edited
    ? rangeIn(edited.block, edited.start, edited.end, false)
    : OUTDATED;
}

/** How many characters of the saved prefix and suffix still sit either side */
function contextMatch(
  text: string,
  start: number,
  end: number,
  { prefix = "", suffix = "" }: Anchor,
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

/**
 * The text between the saved prefix and suffix, when both are still there
 * close together. A prefix shorter than CONTEXT ran from the start of the
 * block, so the block must still start with it; likewise a short suffix and
 * the block's end.
 */
function betweenContext(
  blocks: AnchorBlock[],
  home: AnchorBlock | undefined,
  { prefix = "", suffix = "", quote = "" }: Anchor,
): { block: AnchorBlock; start: number; end: number } | undefined {
  const maxLength = quote.length * 2 + 20;
  const ordered = home ? [home, ...blocks.filter((b) => b !== home)] : blocks;

  let best: { block: AnchorBlock; start: number; end: number } | undefined;
  for (const block of ordered) {
    const { text } = block;
    const starts =
      prefix.length < CONTEXT
        ? text.startsWith(prefix)
          ? [prefix.length]
          : []
        : indexesOf(text, prefix.slice(-EDGE)).map((at) => at + EDGE);
    for (const start of starts) {
      const end =
        suffix.length < CONTEXT
          ? text.endsWith(suffix)
            ? text.length - suffix.length
            : -1
          : text.indexOf(suffix.slice(0, EDGE), start);
      const length = end - start;
      if (end === -1 || length <= 0 || length > maxLength) continue;
      const closer =
        !best ||
        Math.abs(length - quote.length) <
          Math.abs(best.end - best.start - quote.length);
      if (closer) best = { block, start, end };
    }
    // Its own block wins if it has one
    if (best && block === home) return best;
  }
  return best;
}

function indexesOf(text: string, part: string): number[] {
  const found: number[] = [];
  for (
    let at = text.indexOf(part);
    at !== -1;
    at = text.indexOf(part, at + 1)
  ) {
    found.push(at);
  }
  return found;
}
