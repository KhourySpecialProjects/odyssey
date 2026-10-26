"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  getLoadedHighlighter,
  loadHighlighter,
  type HighlighterModule,
} from "./load-highlighter";
import { Highlight, HighlightColor } from "@/types";
import { SelectionToolbar, type ToolbarAnchor } from "./selection-toolbar";
//import "katex/dist/katex.min.css";
import katex from "katex";
import { TableRenderer } from "./table-renderer";
import DOMPurify from "isomorphic-dompurify";

interface Block {
  content: string;
  id: number;
  /** Ids of the BlockNote blocks grouped into this one */
  sourceBlockIds?: number[];
}

/** A highlight the reader just made, before it's saved */
export type HighlightDraft = Pick<
  Highlight,
  "text" | "position" | "color" | "blockId"
>;

/**
 * Saved highlights a new one overlaps: `baseId` is extended to cover the
 * draft, and the highlights in `removeIds` are deleted.
 */
export interface HighlightMerge {
  baseId: number;
  removeIds: number[];
}

interface GenericBlockRendererProps {
  block: Block;
  highlights: Highlight[];
  /** Saves a highlight. Resolves to it once saved, or null if that failed. */
  onHighlight: (
    highlight: HighlightDraft,
    options?: { merge?: HighlightMerge; withNote?: boolean },
  ) => Promise<Highlight | null>;
  onRecolorHighlight: (highlightId: number, color: HighlightColor) => void;
  onDeleteHighlight: (highlightId: number) => void;
  onNote: (notePos: number, highlight: Highlight) => void;
  enrollmentId: string | undefined;
  author?: boolean;
}

interface EnlargedImage {
  src: string;
  alt: string;
}

/** What the toolbar acts on: new text, or a saved highlight */
type ToolbarTarget =
  | { kind: "selection"; start: number; end: number; text: string }
  | { kind: "highlight"; highlightId: number };

interface ToolbarState {
  target: ToolbarTarget;
  anchor: ToolbarAnchor;
  /** Where a note made from here goes, in px from the top of the block */
  notePos: number;
}

/** Class on every drawn piece of a highlight; data-highlight-id names it */
const HIGHLIGHT_CLASS = "lesson-highlight";

// How long the selection has to stay still before the toolbar opens
const SELECTION_DELAY_MS = 150;

type SavedHighlight = Highlight & { id: number };

// A new highlight has a negative id until its save returns
const isSaved = (highlight: Highlight): highlight is SavedHighlight =>
  (highlight.id ?? 0) > 0;

const processLatex = (content: string) => {
  content = content.replace(/\$\$(.*?)\$\$/g, (match, latex) => {
    try {
      return `<div class="katex-block" data-latex="${encodeURIComponent(latex)}">${latex}</div>`;
    } catch (e) {
      console.error("Failed to process block LaTeX:", e);
      return match;
    }
  });

  content = content.replace(/\$(.*?)\$/g, (match, latex) => {
    try {
      return `<span class="katex-inline" data-latex="${encodeURIComponent(latex)}">${latex}</span>`;
    } catch (e) {
      console.error("Failed to process inline LaTeX:", e);
      return match;
    }
  });

  return content;
};

/**
 * The block's text nodes, in order. Highlight positions are character offsets
 * across all of them (line numbers and LaTeX markup included).
 */
function textNodes(container: Node): Text[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

/** The character offset of a boundary point, counted from the block's start */
function offsetOf(container: Node, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, offset);
  return range.toString().length;
}

type Piece = { node: Text; from: number; to: number };

const isBlank = ({ node, from, to }: Piece) =>
  !/\S/.test(node.data.slice(from, to));

/**
 * Inline code the piece covers whole. It's painted itself, so its padding and
 * border don't cut a gap in the highlight.
 */
function wholeInlineCode({ node, from, to }: Piece): HTMLElement | null {
  const code = node.parentElement;
  return code?.tagName === "CODE" &&
    !code.closest("pre") &&
    code.childNodes.length === 1 &&
    from === 0 &&
    to === node.length
    ? code
    : null;
}

/**
 * Draws a highlight as one tagged element per text node it covers, styled to
 * read as one bar: only its two ends are rounded, and whitespace at either
 * end isn't painted.
 */
function drawHighlight(container: HTMLElement, highlight: Highlight) {
  const { start, end } = highlight.position ?? {};
  if (start == null || end == null || start >= end) return;

  const pieces: Piece[] = [];
  let offset = 0;
  for (const node of textNodes(container)) {
    const piece = {
      node,
      from: Math.max(start - offset, 0),
      to: Math.min(end - offset, node.length),
    };
    // A line break between paragraphs would paint an empty line
    const betweenBlocks =
      isBlank(piece) &&
      node.data.includes("\n") &&
      !node.parentElement?.closest("pre");
    if (piece.from < piece.to && !betweenBlocks) pieces.push(piece);
    offset += node.length;
    if (offset >= end) break;
  }

  while (pieces.length > 0 && isBlank(pieces[0])) pieces.shift();
  while (pieces.length > 0 && isBlank(pieces[pieces.length - 1])) pieces.pop();
  if (pieces.length === 0) return;
  const first = pieces[0];
  const last = pieces[pieces.length - 1];
  while (/\s/.test(first.node.data[first.from])) first.from++;
  while (/\s/.test(last.node.data[last.to - 1])) last.to--;

  for (const piece of pieces) {
    let element = wholeInlineCode(piece);
    if (!element) {
      const { node, from, to } = piece;
      const text = from > 0 ? node.splitText(from) : node;
      if (to - from < text.length) text.splitText(to - from);
      element = document.createElement("span");
      text.replaceWith(element);
      element.appendChild(text);
    }

    const [left, right] = [piece === first, piece === last].map((round) =>
      round ? "8px" : "0px",
    );
    element.classList.add(HIGHLIGHT_CLASS);
    element.dataset.highlightId = String(highlight.id);
    element.style.backgroundColor = highlight.color;
    element.style.borderRadius = `${left} ${right} ${right} ${left}`;
    element.style.setProperty("color", "black", "important");
  }
}

/** A rect's position relative to `parent`, for placing the toolbar */
function anchorIn(parent: HTMLElement, rect: DOMRect): ToolbarAnchor {
  const parentRect = parent.getBoundingClientRect();
  return {
    top: rect.top - parentRect.top,
    bottom: rect.bottom - parentRect.top,
    centerX: rect.left + rect.width / 2 - parentRect.left,
  };
}

const GenericBlockRenderer: React.FC<GenericBlockRendererProps> = ({
  block,
  highlights,
  onHighlight,
  onRecolorHighlight,
  onDeleteHighlight,
  onNote,
  enrollmentId,
  author = false,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("#fff300");
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<EnlargedImage | null>(
    null,
  );
  const canHighlight = !!enrollmentId && !author;

  const blockHighlights = highlights.filter(
    (h) =>
      h.blockId === block.id || !!block.sourceBlockIds?.includes(h.blockId),
  );
  // The block is redrawn only when this changes, so a new highlights array
  // (or a hover, or a colour pick) leaves the reader's selection alone
  const highlightKey = blockHighlights
    .map((h) => `${h.id}:${h.position?.start}-${h.position?.end}:${h.color}`)
    .join(",");
  const blockHighlightsRef = useRef(blockHighlights);
  useEffect(() => {
    blockHighlightsRef.current = blockHighlights;
  });

  // Check if content contains a table
  const tableMatch = block.content.match(
    /<!--TABLE_START-->([\s\S]*?)<!--TABLE_END-->/,
  );
  let tableData = null;
  try {
    tableData = tableMatch ? JSON.parse(tableMatch[1]) : null;
  } catch (e) {
    console.error("Failed to parse table data:", e);
  }
  const nonTableContent = tableMatch
    ? block.content.replace(/<!--TABLE_START-->[\s\S]*?<!--TABLE_END-->/, "")
    : block.content;

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    // highlight.js rewrites each code element's markup, so it must run before
    // line numbers and saved highlights are applied. Until it (and any language
    // grammar the page's code needs) has loaded, the content renders without it
    // and re-renders once it arrives.
    const renderContent = (highlighter: HighlighterModule | null) => {
      const processedContent = processLatex(nonTableContent);
      container.innerHTML = DOMPurify.sanitize(processedContent);

      const inlineLatexElements = container.querySelectorAll(".katex-inline");
      inlineLatexElements.forEach((element) => {
        const latex = element.textContent || "";
        try {
          const mathElement = document.createElement("span");
          mathElement.innerHTML = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
          });
          element.parentNode?.replaceChild(mathElement, element);
        } catch (e) {
          console.error("Failed to render inline LaTeX:", e);
        }
      });

      const blockLatexElements = container.querySelectorAll(".katex-block");
      blockLatexElements.forEach((element) => {
        const latex = decodeURIComponent(
          element.getAttribute("data-latex") || "",
        );
        try {
          const mathElement = document.createElement("div");
          mathElement.innerHTML = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: true,
          });
          element.parentNode?.replaceChild(mathElement, element);
        } catch (e) {
          console.error("Failed to render block LaTeX:", e);
        }
      });

      const codeBlocks = container.querySelectorAll("pre code");
      codeBlocks.forEach((codeBlock) => {
        if (codeBlock.classList.contains("language-plaintext")) {
          codeBlock.classList.remove("language-plaintext");
        }
      });
      // Scoped to this block (like RenderedContent) so a re-render of one block
      // can't touch another block's code
      if (codeBlocks.length > 0) highlighter?.highlightCodeBlocks(container);

      const preBlocks = container.querySelectorAll("pre");

      preBlocks.forEach((pre) => {
        const code = pre.querySelector("code");
        if (!code) return;

        const rawLines = code.textContent?.split("\n") ?? [];
        if (rawLines[rawLines.length - 1] === "") rawLines.pop();
        const lineCount = rawLines.length;

        // Force code line-height to match gutter — prose-lg sets ~1.777
        // which causes lines to drift out of sync with the 1.25rem gutter.
        code.style.lineHeight = "1.25rem";
        code.style.display = "block";
        code.style.padding = "0";
        code.style.margin = "0";

        pre.style.position = "relative";
        pre.style.paddingTop = "0.75rem";
        pre.style.paddingBottom = "0.75rem";
        pre.style.paddingLeft = "3rem";
        pre.style.paddingRight = "1rem";

        const lineNumbers = document.createElement("div");
        lineNumbers.className =
          "absolute left-0 top-0 bottom-0 min-w-[2.5rem] flex flex-col text-sm border-r border-gray-200 bg-gray-100 text-gray-400 select-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
        lineNumbers.style.paddingTop = "0.75rem";

        for (let i = 1; i <= lineCount; i++) {
          const line = document.createElement("div");
          line.className = "pr-2 text-right font-mono";
          line.style.lineHeight = "1.25rem";
          line.style.height = "1.25rem";
          line.textContent = `${i}`;
          lineNumbers.appendChild(line);
        }

        pre.insertBefore(lineNumbers, pre.firstChild);
      });

      // Drawn from the saved list only, so nothing else needs to add spans
      [...blockHighlightsRef.current]
        .sort((a, b) => (a.position?.start || 0) - (b.position?.start || 0))
        .forEach((highlight) => drawHighlight(container, highlight));

      return codeBlocks.length > 0;
    };

    const highlighter = getLoadedHighlighter();
    const hasCodeBlocks = renderContent(highlighter);
    if (!hasCodeBlocks) return;

    // Load highlight.js on first use, plus any language grammars this block's
    // code needs that aren't bundled with it. Re-render once highlight.js first
    // arrives, or later only if a newly loaded grammar is now usable.
    let cancelled = false;
    const ready: Promise<HighlighterModule | null> = highlighter
      ? highlighter
          .loadLanguages(container)
          .then((loaded) => (loaded ? highlighter : null))
      : loadHighlighter().then(async (loaded) => {
          await loaded.loadLanguages(container);
          return loaded;
        });
    ready
      .then((loaded) => {
        // Skip if the content changed or the block unmounted while loading
        if (loaded && !cancelled && contentRef.current === container) {
          renderContent(loaded);
        }
      })
      .catch((e) => console.error("Failed to load syntax highlighting:", e));
    return () => {
      cancelled = true;
    };
  }, [nonTableContent, highlightKey]);

  // The toolbar follows the selection however it was made: mouse, Shift +
  // arrow keys, or a long-press on a phone
  const readSelection = () => {
    const root = rootRef.current;
    const container = contentRef.current;
    const selection = window.getSelection();
    if (!root || !container) return;

    const range =
      selection && selection.rangeCount > 0 && !selection.isCollapsed
        ? selection.getRangeAt(0)
        : null;
    if (!range) {
      // A toolbar opened by clicking a highlight has no selection to begin
      // with, and one in use from the keyboard has already read its own
      const toolbarFocused = !!root
        .querySelector('[role="toolbar"]')
        ?.contains(document.activeElement);
      setToolbar((current) =>
        current?.target.kind === "selection" && !toolbarFocused
          ? null
          : current,
      );
      return;
    }
    if (
      !container.contains(range.startContainer) ||
      !container.contains(range.endContainer)
    ) {
      setToolbar(null);
      return;
    }

    const start = offsetOf(container, range.startContainer, range.startOffset);
    const end = offsetOf(container, range.endContainer, range.endOffset);
    if (start === end) return;

    let text = selection!.toString();
    const latexParent = range.startContainer.parentElement?.closest(
      ".katex-inline, .katex-block",
    );
    if (latexParent) {
      text = decodeURIComponent(latexParent.getAttribute("data-latex") || text);
    }

    const rect = range.getBoundingClientRect();
    // Inside one saved highlight: offer to recolour or remove it. Of nested
    // ones (from before overlaps merged), the innermost.
    const covering = blockHighlightsRef.current
      .filter(isSaved)
      .filter((h) => h.position.start <= start && end <= h.position.end)
      .sort(
        (a, b) =>
          a.position.end -
          a.position.start -
          (b.position.end - b.position.start),
      )[0];

    setToolbar({
      target: covering
        ? { kind: "highlight", highlightId: covering.id }
        : { kind: "selection", start, end, text },
      anchor: anchorIn(root, rect),
      notePos: rect.top - container.getBoundingClientRect().top,
    });
  };
  const readSelectionRef = useRef(readSelection);
  useEffect(() => {
    readSelectionRef.current = readSelection;
  });

  useEffect(() => {
    if (!canHighlight) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleSelectionChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => readSelectionRef.current(), SELECTION_DELAY_MS);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [canHighlight]);

  const closeToolbar = useCallback(() => setToolbar(null), []);

  const finishToolbar = () => {
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  /**
   * A new highlight over the selected text. If it overlaps saved highlights,
   * it's merged with them: the one with a note (or the first) is extended.
   */
  const draftFor = (
    target: Extract<ToolbarTarget, { kind: "selection" }>,
    color: HighlightColor,
  ): { draft: HighlightDraft; merge?: HighlightMerge } => {
    const overlapping = blockHighlights
      .filter(isSaved)
      .filter(
        (h) => h.position.start < target.end && target.start < h.position.end,
      )
      .sort((a, b) => a.position.start - b.position.start);
    if (overlapping.length === 0 || !contentRef.current) {
      return {
        draft: {
          text: target.text,
          position: { start: target.start, end: target.end },
          color,
          blockId: block.id,
        },
      };
    }

    const start = Math.min(target.start, overlapping[0].position.start);
    const end = Math.max(target.end, ...overlapping.map((h) => h.position.end));
    const base = overlapping.find((h) => h.note) ?? overlapping[0];
    return {
      draft: {
        text: (contentRef.current.textContent ?? "").slice(start, end),
        position: { start, end },
        color,
        blockId: base.blockId,
      },
      merge: {
        baseId: base.id,
        removeIds: overlapping.filter((h) => h !== base).map((h) => h.id),
      },
    };
  };

  const handleApplyColor = (color: HighlightColor) => {
    setSelectedColor(color);
    if (!toolbar) return;
    const { target } = toolbar;
    if (target.kind === "highlight") {
      onRecolorHighlight(target.highlightId, color);
    } else {
      const { draft, merge } = draftFor(target, color);
      void onHighlight(draft, { merge });
    }
    finishToolbar();
  };

  const handleDelete = () => {
    if (toolbar?.target.kind === "highlight") {
      onDeleteHighlight(toolbar.target.highlightId);
    }
    finishToolbar();
  };

  // The note is linked to the highlight it's made from, so a new one is saved
  // first and the note waits for it
  const handleNote = async () => {
    if (!toolbar) return;
    const { target, notePos } = toolbar;
    finishToolbar();

    if (target.kind === "highlight") {
      const highlight = blockHighlights.find(
        (h) => h.id === target.highlightId,
      );
      if (highlight) onNote(notePos, highlight);
      return;
    }
    const { draft, merge } = draftFor(target, selectedColor);
    const saved = await onHighlight(draft, { merge, withNote: true });
    if (saved) onNote(notePos, saved);
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    if (target.tagName === "IMG") {
      e.preventDefault();
      e.stopPropagation();
      setEnlargedImage({
        src: target.getAttribute("src") || "",
        alt: target.getAttribute("alt") || "",
      });
      return;
    }

    // A drag that ends on a highlight is a selection, handled above
    if (!canHighlight || !window.getSelection()?.isCollapsed) return;

    const piece = target.closest<HTMLElement>(`.${HIGHLIGHT_CLASS}`);
    const highlightId = Number(piece?.dataset.highlightId);
    const highlight = blockHighlights
      .filter(isSaved)
      .find((h) => h.id === highlightId);
    const root = rootRef.current;
    const container = contentRef.current;
    if (!piece || !highlight || !root || !container) return;

    const firstPiece = container.querySelector(
      `.${HIGHLIGHT_CLASS}[data-highlight-id="${highlightId}"]`,
    );
    setToolbar({
      target: { kind: "highlight", highlightId },
      anchor: anchorIn(root, piece.getBoundingClientRect()),
      notePos:
        (firstPiece ?? piece).getBoundingClientRect().top -
        container.getBoundingClientRect().top,
    });
  };

  const handleCloseEnlarged = () => {
    setEnlargedImage(null);
  };

  const toolbarTarget = toolbar?.target;
  const toolbarHighlight =
    toolbarTarget?.kind === "highlight"
      ? blockHighlights.find((h) => h.id === toolbarTarget.highlightId)
      : undefined;

  return (
    <div ref={rootRef} className="relative">
      {tableData && <TableRenderer tableData={tableData} />}

      {nonTableContent && (
        <div
          ref={contentRef}
          onClick={handleContentClick}
          className="prose prose-lg prose-sky prose-table:block prose-code:text-inherit prose-table:overflow-x-scroll prose-p:my-1 prose-li:my-1 prose-headings:text-inherit prose-strong:text-inherit max-w-none select-text dark:text-slate-300"
        ></div>
      )}

      {canHighlight && toolbar && (
        <SelectionToolbar
          anchor={toolbar.anchor}
          selectedColor={toolbarHighlight?.color ?? selectedColor}
          isOnHighlight={toolbar.target.kind === "highlight"}
          onApplyColor={handleApplyColor}
          onDelete={handleDelete}
          onNote={handleNote}
          onClose={closeToolbar}
        />
      )}

      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/50"
          onClick={handleCloseEnlarged}
        >
          <img
            src={enlargedImage?.src}
            alt={enlargedImage?.alt}
            className="absolute top-1/2 left-1/2 max-h-[75%] w-full max-w-[75%] -translate-x-[50%] -translate-y-[40%] bg-cyan-300 object-contain xl:h-full xl:w-auto xl:-translate-x-[35%]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default GenericBlockRenderer;
