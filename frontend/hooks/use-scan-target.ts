"use client";

import { useEffect } from "react";
import { SCAN_TARGET_TITLE } from "@/lib/overview-scan/view";

// A scan flag's Go to lesson (ODY-913) adds ?block=<id>, and &words=a,b for a
// spelling flag. The lesson opens scrolled to that block, which flashes once,
// and the words stay highlighted while they're there to fix. Nothing here
// changes the page's DOM: the flash is a Web Animation and the highlight is a
// CSS Custom Highlight, so the BlockNote editor never sees an edit.

export const SCAN_HIGHLIGHT = "scan-spelling";
const POLL_MS = 50;
// The editor mounts after the lock check, which can take a few seconds
const GIVE_UP_MS = 8000;
const FLASH_MS = 600;

const reducedMotion = () =>
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const canHighlight = () =>
  typeof CSS !== "undefined" &&
  "highlights" in CSS &&
  typeof Highlight !== "undefined";

// BlockNote: .bn-block-outer > .bn-block (the blockContainer, with data-id) >
// .bn-block-content, then a .bn-block-group of children. Blocks are siblings
// at the outer level.
const CONTAINER = '[data-node-type="blockContainer"]';
const contentOf = (container: Element | null) =>
  container?.querySelector<HTMLElement>(":scope > .bn-block-content") ?? null;
const OUTER = '[data-node-type="blockOuter"]';

/**
 * The flagged block: a BlockNote block, a Classic block or the lesson's name.
 * A list's flag names its first item, so the items after it come too.
 */
export function targetElements(id: string): HTMLElement[] {
  if (id === SCAN_TARGET_TITLE) {
    const title = document.querySelector<HTMLElement>("[data-lesson-title]");
    return title ? [title] : [];
  }
  const sel = CSS.escape(id);
  const editor = document.querySelector<HTMLElement>(
    `${CONTAINER}[data-id="${sel}"]`,
  );
  if (!editor) {
    const classic = document.querySelector<HTMLElement>(
      `[data-block-id="${sel}"]`,
    );
    return classic ? [classic] : [];
  }
  const first = contentOf(editor) ?? editor;
  const type = first.getAttribute("data-content-type") ?? "";
  if (!type.endsWith("ListItem")) return [first];
  const items = [first];
  const itemAfter = (outer: Element | null) =>
    contentOf(
      outer?.nextElementSibling?.querySelector(`:scope > ${CONTAINER}`) ?? null,
    );
  for (
    let outer = editor.closest(OUTER), next = itemAfter(outer);
    next?.getAttribute("data-content-type") === type;
    outer = outer!.nextElementSibling, next = itemAfter(outer)
  )
    items.push(next!);
  return items;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A Range over every whole-word, case-sensitive match of `words` in `roots`. */
export function wordRanges(
  roots: readonly Node[],
  words: readonly string[],
): Range[] {
  if (!words.length) return [];
  // The scan's word boundaries (lib/overview-scan/text.ts `words`)
  const pattern = new RegExp(
    `(?<![A-Za-z0-9]|[A-Za-z0-9]['’-])(?:${words.map(escapeRe).join("|")})(?![A-Za-z0-9]|['’-][A-Za-z0-9])`,
    "g",
  );
  const ranges: Range[] = [];
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const m of (node.textContent ?? "").matchAll(pattern)) {
        const range = document.createRange();
        range.setStart(node, m.index!);
        range.setEnd(node, m.index! + m[0].length);
        ranges.push(range);
      }
    }
  }
  return ranges;
}

function readTarget(): { block: string; words: string[] } | null {
  const params = new URLSearchParams(window.location.search);
  const block = params.get("block");
  if (!block) return null;
  const words = (params.get("words") ?? "").split(",").filter(Boolean);
  return { block, words };
}

/**
 * Removed once the target is shown or given up on, not on arrival, so
 * StrictMode's second effect run still finds it. Then a reload or Back
 * doesn't jump again.
 */
function clearTarget() {
  const url = new URL(window.location.href);
  url.searchParams.delete("block");
  url.searchParams.delete("words");
  // Next syncs its router with a null-state replaceState (its documented form)
  window.history.replaceState(null, "", url);
}

/** Scrolls to the scan flag's block on arrival and highlights its words. */
export function useScanTarget() {
  useEffect(() => {
    const target = readTarget();
    if (!target) return;
    let observer: MutationObserver | undefined;
    const started = Date.now();

    const show = (els: HTMLElement[]) => {
      els[0].scrollIntoView({
        block: "center",
        behavior: reducedMotion() ? "auto" : "smooth",
      });
      if (!reducedMotion())
        els.forEach((el) =>
          el.animate?.([{ backgroundColor: "rgba(253, 230, 138, 0.7)" }, {}], {
            duration: FLASH_MS,
            easing: "ease-out",
          }),
        );
      if (!target.words.length || !canHighlight()) return;
      // Repainted as the author types, so a fixed word loses its highlight
      const paint = () => {
        const ranges = wordRanges(els, target.words);
        if (ranges.length)
          CSS.highlights.set(SCAN_HIGHLIGHT, new Highlight(...ranges));
        else CSS.highlights.delete(SCAN_HIGHLIGHT);
      };
      paint();
      observer = new MutationObserver(paint);
      els.forEach((el) =>
        observer!.observe(el, {
          subtree: true,
          childList: true,
          characterData: true,
        }),
      );
    };

    const attempt = () => {
      const els = targetElements(target.block);
      if (els.length) show(els);
      const done = els.length > 0 || Date.now() - started >= GIVE_UP_MS;
      if (done) clearTarget();
      return done;
    };
    const poll = attempt()
      ? undefined
      : setInterval(() => {
          if (attempt()) clearInterval(poll);
        }, POLL_MS);

    return () => {
      clearInterval(poll);
      observer?.disconnect();
      if (canHighlight()) CSS.highlights.delete(SCAN_HIGHLIGHT);
    };
  }, []);
}
