import type * as Highlighter from "./highlighter";

export type HighlighterModule = typeof Highlighter;

// highlight.js is only fetched once something actually renders code. The
// loaded module is shared by every caller so later renders can highlight
// synchronously. Import ./highlighter only through this module (never
// statically) so it stays out of the initial bundle.
let loadedHighlighter: HighlighterModule | null = null;
let highlighterPromise: Promise<HighlighterModule> | null = null;

export function loadHighlighter(): Promise<HighlighterModule> {
  if (!highlighterPromise) {
    highlighterPromise = import("./highlighter")
      .then((mod) => {
        loadedHighlighter = mod;
        return mod;
      })
      .catch((error) => {
        // Allow a later render to retry (e.g. after a transient chunk failure)
        highlighterPromise = null;
        throw error;
      });
  }
  return highlighterPromise;
}

/** The highlighter if it has already finished loading, otherwise null. */
export function getLoadedHighlighter(): HighlighterModule | null {
  return loadedHighlighter;
}
