import { rangeOf, textOf, textParts } from "@/lib/anchors/dom";
import { resolveAnchor } from "@/lib/anchors/resolve";
import { OUTDATED } from "@/lib/anchors/types";
import type { Citation } from "./types";

const FLASH_MS = 1500;
const OPEN_POLL_MS = 50;
const OPEN_GIVE_UP_MS = 500;
const HIGHLIGHT_NAME = "mentor-source";
const FLASH_CLASS = "mentor-source--flash";

type Found = { element: Element; range?: Range };

const blockOf = (root: Element, blockIndex: number) =>
  root.querySelector(`[data-lesson-block="${blockIndex}"]`);

/** Where a citation is on the page right now; null if its text isn't drawn. */
export function findCitation(root: Element, citation: Citation): Found | null {
  const { anchor } = citation;
  const block = blockOf(root, citation.blockIndex);
  if (!block) return null;

  let element: Element = block;
  if (anchor.blockId !== undefined) {
    const inner = Array.from(block.querySelectorAll("[data-block-id]")).find(
      (el) => el.getAttribute("data-block-id") === anchor.blockId,
    );
    if (inner) element = inner;
  }
  if (!anchor.quote) return { element };

  // Offsets are only a hint here, so the quote and its surroundings decide
  const parts = textParts(element, false);
  const found = resolveAnchor(
    { [anchor.field]: [{ text: textOf(parts) }] },
    { ...anchor, blockId: undefined, endBlockId: undefined },
  );
  if (found === OUTDATED) return { element };
  const range = rangeOf(parts, found.start, found.end);
  return range ? { element, range } : { element };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Opens a closed expandable in the block, then waits for its text to draw. */
async function findAfterOpening(
  root: Element,
  citation: Citation,
  signal?: AbortSignal,
) {
  const trigger = blockOf(
    root,
    citation.blockIndex,
  )?.querySelector<HTMLElement>(
    'button[data-mentor-expand][data-state="closed"]',
  );
  if (!trigger || !citation.anchor.quote) return null;
  trigger.click();
  for (let t = 0; t < OPEN_GIVE_UP_MS; t += OPEN_POLL_MS) {
    await wait(OPEN_POLL_MS);
    if (signal?.aborted) return null;
    const found = findCitation(root, citation);
    if (found?.range) return found;
  }
  return findCitation(root, citation);
}

let clearFlash: (() => void) | undefined;

function flash({ element, range }: Found) {
  clearFlash?.();
  let remove: () => void;
  const highlights = globalThis.CSS?.highlights;
  if (range && highlights && typeof Highlight !== "undefined") {
    highlights.set(HIGHLIGHT_NAME, new Highlight(range));
    remove = () => highlights.delete(HIGHLIGHT_NAME);
  } else {
    // Reflow after the old class was removed, so the animation restarts
    void (element as HTMLElement).offsetWidth;
    element.classList.add(FLASH_CLASS);
    remove = () => element.classList.remove(FLASH_CLASS);
  }
  // A newer flash cancels this timer, so it can't clear the newer one
  const timer = setTimeout(() => {
    remove();
    clearFlash = undefined;
  }, FLASH_MS);
  clearFlash = () => {
    clearTimeout(timer);
    remove();
  };
}

/**
 * Scrolls a citation's passage to the centre and flashes it. Resolves false
 * when the passage can't be found.
 */
export async function showCitation(
  root: Element,
  citation: Citation,
  signal?: AbortSignal,
): Promise<boolean> {
  let found = findCitation(root, citation);
  // A quote that isn't drawn may be inside a closed expandable
  if (!found?.range && citation.anchor.quote) {
    found = (await findAfterOpening(root, citation, signal)) ?? found;
  }
  if (!found || signal?.aborted) return false;

  const reduced = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const target = found.range?.startContainer.parentElement ?? found.element;
  target.scrollIntoView({
    block: "center",
    behavior: reduced ? "auto" : "smooth",
  });
  flash(found);
  return true;
}

/** Where a note goes, in px from the lesson's top; scrollTop covers a scrolling root. */
export function noteYFor(root: Element, citations: Citation[]): number {
  const top = root.getBoundingClientRect().top;
  const block = citations[0] && blockOf(root, citations[0].blockIndex);
  const inView = block
    ? block.getBoundingClientRect().top - top
    : Math.max(-top, 0);
  return Math.max(inView + root.scrollTop, 0);
}
