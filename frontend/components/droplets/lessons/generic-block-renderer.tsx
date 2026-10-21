"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getLoadedHighlighter,
  loadHighlighter,
  type HighlighterModule,
} from "./load-highlighter";
import { Highlight, HighlightColor } from "@/types";
import { SelectionToolbar, type ToolbarPosition } from "./selection-toolbar";
import {
  HIGHLIGHT_PIECE_SELECTOR,
  highlightHasNote,
  isPendingHighlightId,
} from "./highlight-ids";
import katex from "katex";
import { TableRenderer } from "./table-renderer";
import DOMPurify from "isomorphic-dompurify";

interface Block {
  content: string;
  id: number;
  /** Set on converted v2 blocks: the original block ids their highlights were saved under */
  sourceBlockIds?: number[];
}

interface GenericBlockRendererProps {
  block: Block;
  highlights: Highlight[];
  /** Saves a new highlight; resolves to the saved record, or null if it failed */
  onHighlight: (
    highlight: Highlight,
    isWithNote?: boolean,
  ) => Promise<Highlight | null>;
  /** Changes a saved highlight; resolves to the updated record, or null if it failed */
  onUpdateHighlight: (
    highlightId: number,
    changes: {
      color?: HighlightColor;
      position?: { start: number; end: number };
      text?: string;
    },
  ) => Promise<Highlight | null>;
  /**
   * Merges overlapping highlights (ODY-153): updates `baseId` to `changes`
   * (the union) and, once that succeeds, deletes `removeIds`. Resolves to the
   * updated base, or null if the update failed.
   */
  onMergeHighlights: (
    baseId: number,
    changes: {
      color: HighlightColor;
      position: { start: number; end: number };
      text: string;
    },
    removeIds: number[],
  ) => Promise<Highlight | null>;
  onDeleteHighlight: (highlightId: number) => Promise<boolean>;
  onNote: (notePos: number, highlight: Highlight) => void;
  enrollmentId: string | undefined;
  author?: boolean;
}

interface EnlargedImage {
  src: string;
  alt: string;
}

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
 * The one place a highlight span is made. Every drawn piece of a highlight
 * carries its id, so remove, recolour and notes can act on the highlight that
 * was clicked. Nothing else in the block may be treated as a highlight (lesson
 * authors can put inline `background-color` spans in their content).
 */
function createHighlightSpan(highlight: Highlight): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "ody-highlight";
  span.dataset.highlightId = String(highlight.id);
  span.style.borderRadius = "8px";
  span.style.backgroundColor = highlight.color;
  span.style.setProperty("color", "black", "important");
  return span;
}

/**
 * The text between two offsets. Offsets are counted over every text node in
 * document order (existing saved positions depend on that, line-number gutter
 * and KaTeX markup included), but the returned text leaves out what the reader
 * can't select as content: the gutter's digits and KaTeX's hidden MathML copy.
 */
function textBetween(container: Node, start: number, end: number): string {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let position = 0;
  let text = "";
  while (walker.nextNode()) {
    const value = walker.currentNode.textContent ?? "";
    const from = Math.max(start - position, 0);
    const to = Math.min(end - position, value.length);
    const hidden = walker.currentNode.parentElement?.closest(
      "[data-ody-line-numbers], .katex-mathml",
    );
    if (from < to && !hidden) text += value.slice(from, to);
    position += value.length;
    if (position >= end) break;
  }
  return text;
}

function highlightRange(
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
  highlight: Highlight,
) {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        return range.intersectsNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  for (const node of textNodes) {
    const nodeRange = document.createRange();
    const nodeStart = node === startNode ? startOffset : 0;
    const nodeEnd = node === endNode ? endOffset : node.textContent?.length;

    // A node that only touches the range's edge contributes nothing
    if (nodeStart >= (nodeEnd || 0)) continue;

    nodeRange.setStart(node, nodeStart);
    nodeRange.setEnd(node, nodeEnd || 0);

    const span = createHighlightSpan(highlight);

    const contents = nodeRange.extractContents();
    span.appendChild(contents);
    nodeRange.insertNode(span);
  }
}

/**
 * The offset of a boundary point in the block: the number of characters in the
 * text nodes before it, counted the same way the drawing and saved positions
 * count. A selection can end on an element rather than a text node (triple
 * click, Ctrl+A, Shift+Down), so for those the count is the length of the text
 * in the range from the start of the block to the point.
 * Returns -1 when the point isn't inside the block.
 */
function pointOffset(container: Node, node: Node, offset: number): number {
  if (!container.contains(node)) return -1;
  if (node.nodeType === Node.TEXT_NODE) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let position = 0;
    while (walker.nextNode()) {
      if (walker.currentNode === node) return position + offset;
      position += walker.currentNode.textContent?.length ?? 0;
    }
    return -1;
  }
  const range = document.createRange();
  range.setStart(container, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

/**
 * The element a range boundary sits in or next to: a text node's parent, or
 * for an element container the child at the boundary (the one after a start
 * point, the one before an end point).
 */
function elementAtPoint(
  node: Node,
  offset: number,
  isEnd: boolean,
): Element | null {
  if (node.nodeType !== Node.ELEMENT_NODE) return node.parentElement;
  // Splitting text to draw a highlight leaves empty text nodes behind: skip them
  const isEmptyText = (n: Node) =>
    n.nodeType === Node.TEXT_NODE && !n.textContent;
  const children = Array.from(node.childNodes);
  const child = isEnd
    ? children
        .slice(0, offset)
        .reverse()
        .find((n) => !isEmptyText(n))
    : children.slice(offset).find((n) => !isEmptyText(n));
  if (!child) return node as Element;
  return child.nodeType === Node.ELEMENT_NODE
    ? (child as Element)
    : child.parentElement;
}

// Stands in when a range can't report where it is (it returns nothing in jsdom)
const ZERO_RECT = {
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

/**
 * The bottom edge of what sticks to the top of the page (the site header and
 * the banners around it), so the toolbar can sit below a selection that is
 * under it instead.
 */
function stickyHeaderBottom(): number {
  const header = document.querySelector("header");
  if (!header) return 0;
  let bottom = header.getBoundingClientRect().bottom;
  const parent = header.parentElement;
  if (
    parent &&
    ["sticky", "fixed"].includes(getComputedStyle(parent).position)
  ) {
    bottom = Math.max(bottom, parent.getBoundingClientRect().bottom);
  }
  return bottom;
}

/**
 * The highlight a selection [start, end) sits entirely inside. `pieceId` is the
 * id of the innermost drawn piece at the selection, when there is one; it wins
 * if it is among the candidates (so selecting and clicking agree). Otherwise
 * the one drawn last: drawing is by start offset, ties in list order, so that
 * is the largest start, then the last in the list.
 */
function pickContaining(
  saved: Highlight[],
  start: number,
  end: number,
  pieceId: number | null,
): Highlight | undefined {
  const candidates = saved.filter(
    (h) => h.position.start <= start && end <= h.position.end,
  );
  const byPiece = candidates.find((h) => h.id === pieceId);
  if (byPiece) return byPiece;
  let last: Highlight | undefined;
  for (const h of candidates) {
    if (!last || h.position.start >= last.position.start) last = h;
  }
  return last;
}

const GenericBlockRenderer: React.FC<GenericBlockRendererProps> = ({
  block,
  highlights,
  onHighlight,
  onUpdateHighlight,
  onMergeHighlights,
  onDeleteHighlight,
  onNote,
  enrollmentId,
  author = false,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<{
    x: number;
    y: number;
    /** The saved highlight the toolbar is acting on, when there is one */
    highlightId: number | null;
    savedText: string;
    /** Where a note goes: the selection's (or clicked piece's) top, relative to the content */
    notePosition: number;
  }>({
    x: 0,
    y: 0,
    highlightId: null,
    savedText: "",
    notePosition: 0,
  });
  // What opened the toolbar. Only a selection-opened toolbar closes when the
  // selection collapses: a click on a highlight collapses it by itself.
  const toolbarSourceRef = useRef<"selection" | "click" | null>(null);
  // The selection (as "start-end") the user dismissed with Esc or an action, so
  // the same selection doesn't pop the toolbar straight back open.
  const dismissedRef = useRef<string | null>(null);
  // A pointer is down on the content: wait for it to come up before opening.
  const pointerDownRef = useRef(false);
  // A pointer is down on the toolbar: nothing may close it until the click lands
  // (in Safari and on iOS a button press doesn't focus it, and can collapse the
  // selection).
  const toolbarPointerRef = useRef(false);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("#fff300");
  const [toolbarPosition, setToolbarPosition] =
    useState<ToolbarPosition | null>(null);
  const [isOnHighlight, setIsOnHighlight] = useState(false);
  // The colour of the highlight the toolbar is on (shown as the pressed one)
  const [highlightColor, setHighlightColor] = useState<HighlightColor | null>(
    null,
  );
  const [enlargedImage, setEnlargedImage] = useState<EnlargedImage | null>(
    null,
  );

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

  // This block's highlights, stable by value. `highlights` is the whole
  // lesson's list and gets a new identity whenever any highlight changes
  // (including a save returning in another block); depending on it would
  // rebuild this block and wipe a selection the user started here. `block` can
  // also be a new object on every render (v2 lessons are converted each time).
  // So the drawing is keyed by this block's own highlights, and only by what
  // is drawn (id, offsets, colour): a server echo that only changes
  // `updatedAt`, or a note flag flipping, must not redraw. The actions read the
  // current, un-memoised list (`blockList`) so they never see stale text or
  // note flags.
  const sourceIds = block.sourceBlockIds ?? [];
  const blockList = highlights.filter(
    (h) => h.blockId === block.id || sourceIds.includes(h.blockId),
  );
  const blockHighlightsKey = JSON.stringify(
    blockList.map((h) => ({
      id: h.id,
      color: h.color,
      position: { start: h.position?.start, end: h.position?.end },
    })),
  );
  // Only the drawn fields are present (the drawing code reads nothing else)
  const blockHighlights = useMemo<Highlight[]>(
    () => JSON.parse(blockHighlightsKey),
    [blockHighlightsKey],
  );

  // The drawing effect is the only thing that writes to the block's DOM, and
  // it only re-runs when the content or this block's drawn highlights change.
  // It must not depend on hover, toolbar state, colour choice or callback
  // identity: a rebuild replaces every text node and drops the user's selection.
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
        lineNumbers.setAttribute("data-ody-line-numbers", "");

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
      const sortedHighlights = [...blockHighlights].sort(
        (a, b) => (a.position?.start || 0) - (b.position?.start || 0),
      );

      sortedHighlights.forEach((highlight) => {
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
        );

        let currentPosition = 0;
        let startNode: Node | null = null;
        let endNode: Node | null = null;
        let startOffset = 0;
        let endOffset = 0;

        let node = walker.nextNode();

        while (node) {
          const nodeLength = node.textContent?.length || 0;

          // `>`, not `>=`: a node that ends exactly where the highlight starts
          // would give an empty piece before the real one.
          if (
            !startNode &&
            currentPosition + nodeLength > highlight.position.start
          ) {
            startNode = node;
            startOffset = highlight.position.start - currentPosition;
          }

          if (
            !endNode &&
            currentPosition + nodeLength >= highlight.position.end
          ) {
            endNode = node;
            endOffset = highlight.position.end - currentPosition;
            break;
          }

          currentPosition += nodeLength;
          node = walker.nextNode();
        }

        if (!startNode || !endNode) return;

        try {
          const range = document.createRange();
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);

          range.surroundContents(createHighlightSpan(highlight));
        } catch {
          highlightRange(startNode, startOffset, endNode, endOffset, highlight);
        }
      });

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
  }, [nonTableContent, blockHighlights]);

  // Highlights with a server record. Pending ones (temporary id) are inert:
  // they can't be removed, recoloured, noted or merged until the save returns.
  const savedHighlights = blockList.filter((h) => !isPendingHighlightId(h.id));

  /** The id on the drawn highlight piece that contains `el`, if any. */
  const pieceHighlightId = (el: Element | null | undefined): number | null => {
    const piece = el?.closest<HTMLElement>(HIGHLIGHT_PIECE_SELECTOR);
    return piece ? Number(piece.dataset.highlightId) : null;
  };

  /**
   * The live selection, when it lies inside this block's content: its offsets
   * (counted as the drawing counts them), text and range. Null for no
   * selection, a collapsed one, or one that reaches outside the block.
   */
  const readSelection = () => {
    const container = contentRef.current;
    const selection = window.getSelection();
    if (
      !container ||
      !selection ||
      selection.rangeCount === 0 ||
      selection.isCollapsed
    ) {
      return null;
    }
    const range = selection.getRangeAt(0);
    if (
      !container.contains(range.startContainer) ||
      !container.contains(range.endContainer)
    ) {
      return null;
    }
    const text = selection.toString();
    const a = pointOffset(container, range.startContainer, range.startOffset);
    const b = pointOffset(container, range.endContainer, range.endOffset);
    if (text.length === 0 || a < 0 || b < 0 || a === b) return null;
    return { range, start: Math.min(a, b), end: Math.max(a, b), text };
  };

  /**
   * Reads the live selection into `popupRef`: what the toolbar's actions act
   * on. Null when there is no usable selection, or it sits inside a highlight
   * that hasn't finished saving (offer nothing).
   */
  const syncPopupFromSelection = () => {
    const selection = readSelection();
    if (!selection) return null;
    const { range, start, end, text } = selection;

    const startPieceId = pieceHighlightId(
      elementAtPoint(range.startContainer, range.startOffset, false),
    );
    const endPieceId = pieceHighlightId(
      elementAtPoint(range.endContainer, range.endOffset, true),
    );
    const samePieceId =
      startPieceId !== null && startPieceId === endPieceId
        ? startPieceId
        : null;
    if (samePieceId !== null && isPendingHighlightId(samePieceId)) return null;

    // A selection entirely inside one saved highlight is that highlight
    // (recolour, note, remove). With several to choose from, take the one a
    // click there would pick: the innermost drawn piece at the selection when
    // it is one of them, otherwise the one drawn last.
    const containing = pickContaining(savedHighlights, start, end, samePieceId);

    const rect = range.getBoundingClientRect() ?? ZERO_RECT;
    const contentTop = contentRef.current?.getBoundingClientRect().top ?? 0;
    popupRef.current.x = start;
    popupRef.current.y = end;
    popupRef.current.savedText = text;
    popupRef.current.highlightId = containing?.id ?? null;
    popupRef.current.notePosition = rect.top - contentTop;
    setIsOnHighlight(!!containing);
    setHighlightColor(containing?.color ?? null);
    return { rect, signature: `${start}-${end}` };
  };

  /**
   * Where the toolbar goes: the selection's edges relative to this block, the
   * top of the free area (under the sticky header) and the block's width. The
   * toolbar measures itself and picks above, below, and a clamped x.
   */
  const placeToolbar = (rect: DOMRect): ToolbarPosition => {
    const wrapper = wrapperRef.current?.getBoundingClientRect();
    const wrapperTop = wrapper?.top ?? 0;
    const wrapperLeft = wrapper?.left ?? 0;
    return {
      x: rect.left + rect.width / 2 - wrapperLeft,
      anchorTop: rect.top - wrapperTop,
      anchorBottom: rect.bottom - wrapperTop,
      minTop: stickyHeaderBottom() - wrapperTop,
      maxX: wrapper?.width ?? 0,
    };
  };

  const toolbarHasFocus = () =>
    !!wrapperRef.current
      ?.querySelector('[role="toolbar"]')
      ?.contains(document.activeElement);

  /** Opens, updates or closes the toolbar to match the live selection. */
  const syncToolbarWithSelection = () => {
    const found = syncPopupFromSelection();
    if (!found) {
      dismissedRef.current = null;
      // A collapsed selection closes a toolbar the selection opened, unless
      // the user is working in the toolbar (focus in it, or a press on it that
      // hasn't produced its click yet). A click-opened one stays.
      if (
        toolbarSourceRef.current === "selection" &&
        !toolbarHasFocus() &&
        !toolbarPointerRef.current
      ) {
        setToolbarPosition(null);
      }
      return;
    }
    if (dismissedRef.current === found.signature) return;
    toolbarSourceRef.current = "selection";
    setToolbarPosition(placeToolbar(found.rect));
  };

  // Keep the selection listeners calling the latest handlers
  const syncRef = useRef(syncToolbarWithSelection);
  useLayoutEffect(() => {
    syncRef.current = syncToolbarWithSelection;
  });

  const selectionEnabled = Boolean(enrollmentId) && !author;
  useEffect(() => {
    if (!selectionEnabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    const inToolbar = (target: EventTarget | null) =>
      !!wrapperRef.current
        ?.querySelector('[role="toolbar"]')
        ?.contains(target as Node);

    // Keyboard and touch selections only ever fire `selectionchange`, so that
    // is what opens the toolbar. It fires a lot, so wait for it to settle, and
    // wait out a mouse drag completely: `pointerup` checks at once.
    const onSelectionChange = () => {
      clearTimeout(timer);
      if (pointerDownRef.current) return;
      timer = setTimeout(() => syncRef.current(), 150);
    };
    const onPointerDown = (e: Event) => {
      if (inToolbar(e.target)) {
        // A press on the toolbar must never close it
        clearTimeout(releaseTimer);
        toolbarPointerRef.current = true;
      } else if (contentRef.current?.contains(e.target as Node)) {
        pointerDownRef.current = true;
        // A new gesture: the selection it makes may open the toolbar again
        dismissedRef.current = null;
      }
    };
    // pointercancel: a touch long-press hands over to the browser's own
    // selection handles
    const onPointerEnd = () => {
      // Only a gesture that started on this block's content is checked here.
      // A press on a toolbar button can collapse the selection (Safari, iOS)
      // and must not close the toolbar before its click arrives; it stays
      // protected until after the click (which follows the pointerup).
      if (toolbarPointerRef.current) {
        releaseTimer = setTimeout(() => {
          toolbarPointerRef.current = false;
        }, 0);
      }
      if (!pointerDownRef.current) return;
      pointerDownRef.current = false;
      clearTimeout(timer);
      syncRef.current();
    };
    // Don't stay waiting for a pointerup that never comes
    const onForget = () => {
      pointerDownRef.current = false;
      toolbarPointerRef.current = false;
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerEnd);
    document.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("blur", onForget);
    return () => {
      clearTimeout(timer);
      clearTimeout(releaseTimer);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerEnd);
      document.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("blur", onForget);
    };
  }, [selectionEnabled]);

  /** The saved highlight the toolbar is acting on (clicked, or selected within). */
  const targetHighlight = (): Highlight | null => {
    const id = popupRef.current.highlightId;
    if (id === null) return null;
    return savedHighlights.find((h) => h.id === id) ?? null;
  };

  const handlePopupDelete = () => {
    const target = targetHighlight();
    popupRef.current.highlightId = null;
    if (target?.id === undefined) return;
    void onDeleteHighlight(target.id);
  };

  /**
   * Applies `color` to whatever the toolbar is acting on, and resolves to the
   * highlight that now holds the selection (null when nothing was saved).
   * - the clicked highlight, or the one the selection sits inside: recoloured;
   * - a selection overlapping saved highlights (ODY-153): one is updated to
   *   cover the union and the others are absorbed, except that a highlight
   *   with a note is never deleted (its note would become a general note);
   * - otherwise: a new highlight.
   * Everything is read before the first await, so the toolbar can close.
   */
  const saveSelection = async (
    color: HighlightColor,
    isWithNote: boolean,
  ): Promise<Highlight | null> => {
    const { x: start, y: end, savedText } = popupRef.current;
    const container = contentRef.current;

    const target = targetHighlight();
    if (popupRef.current.highlightId !== null) {
      if (target?.id === undefined) return null;
      if (target.color === color) return target;
      return onUpdateHighlight(target.id, { color });
    }

    if (!container || start === end) return null;

    const overlapping = savedHighlights.filter(
      (h) => h.position.start < end && start < h.position.end,
    );

    if (overlapping.length === 0) {
      if (!savedText) return null;
      return onHighlight(
        {
          text: savedText,
          position: { start, end },
          color,
          blockId: block.id,
        },
        isWithNote,
      );
    }

    // A highlight with a note is kept: as the base when it is the only noted
    // one, otherwise left in place inside the union. Without a note to protect,
    // the earliest is the base.
    const byStart = [...overlapping].sort(
      (a, b) =>
        a.position.start - b.position.start || (a.id ?? 0) - (b.id ?? 0),
    );
    const notedOnes = byStart.filter(highlightHasNote);
    const base = notedOnes.length === 1 ? notedOnes[0] : byStart[0];
    if (base.id === undefined) return null;
    const removeIds = byStart.flatMap((h) =>
      h === base || highlightHasNote(h) || h.id === undefined ? [] : [h.id],
    );
    const unionStart = Math.min(
      start,
      ...overlapping.map((h) => h.position.start),
    );
    const unionEnd = Math.max(end, ...overlapping.map((h) => h.position.end));
    const changes = {
      color,
      position: { start: unionStart, end: unionEnd },
      text: textBetween(container, unionStart, unionEnd),
    };

    // Nothing to absorb: it is a plain update
    if (removeIds.length === 0) return onUpdateHighlight(base.id, changes);
    return onMergeHighlights(base.id, changes, removeIds);
  };

  const handleCreateNote = async () => {
    const notePosition = popupRef.current.notePosition;
    // A clicked highlight is noted as it is; anything else is saved first
    const highlight =
      popupRef.current.highlightId !== null
        ? targetHighlight()
        : await saveSelection(selectedColor, true);
    if (highlight) onNote(notePosition, highlight);
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

    if (!enrollmentId || author) return;

    // Clicking on or inside a drawn highlight shows the toolbar with Remove.
    // Anything without our highlight marker (including authored
    // background-color spans and the note bar's flash span) is not a highlight.
    const piece = target.closest<HTMLElement>(HIGHLIGHT_PIECE_SELECTOR);
    if (!piece || !contentRef.current) return;

    const id = Number(piece.dataset.highlightId);
    if (isPendingHighlightId(id)) return;
    const highlight = savedHighlights.find((h) => h.id === id);
    if (!highlight) return;

    const rect = piece.getBoundingClientRect();
    popupRef.current.x = highlight.position.start;
    popupRef.current.y = highlight.position.end;
    popupRef.current.savedText = highlight.text;
    popupRef.current.highlightId = id;
    popupRef.current.notePosition =
      rect.top - contentRef.current.getBoundingClientRect().top;

    toolbarSourceRef.current = "click";
    dismissedRef.current = null;
    setToolbarPosition(placeToolbar(rect));
    setIsOnHighlight(true);
    setHighlightColor(highlight.color);
  };

  const handleCloseEnlarged = () => {
    setEnlargedImage(null);
  };

  // A toolbar action can run before the debounced selection check has caught
  // up with the selection, so it reads the live selection first. A click-opened
  // toolbar acts on the clicked highlight and has no selection to read.
  const refreshForAction = () => {
    if (toolbarSourceRef.current === "selection") syncPopupFromSelection();
  };

  // Close after an action and clear the selection. Both the clearing and the
  // redraw that follows fire `selectionchange`; the selection is collapsed by
  // then, so nothing reopens, and remembering it covers a selection that
  // survives.
  const closeAfterAction = () => {
    dismissedRef.current = `${popupRef.current.x}-${popupRef.current.y}`;
    returnFocusToContent();
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  // When the toolbar had keyboard focus and goes away, focus would drop to the
  // page; give it back to the text the toolbar belongs to.
  const returnFocusToContent = () => {
    if (toolbarHasFocus()) contentRef.current?.focus({ preventScroll: true });
  };

  const handleToolbarClose = (reason: "escape" | "outside") => {
    if (reason === "escape") {
      dismissedRef.current = `${popupRef.current.x}-${popupRef.current.y}`;
      returnFocusToContent();
    }
    setToolbarPosition(null);
  };

  // Esc belongs to the toolbar only when the reader is in this block (or on
  // the page itself); with focus in some other widget (a dialog, a menu) that
  // widget gets it.
  const ownsEscape = () => {
    const active = document.activeElement;
    return (
      !active ||
      active === document.body ||
      !!wrapperRef.current?.contains(active)
    );
  };

  const handleToolbarApplyColor = (color: HighlightColor) => {
    refreshForAction();
    setSelectedColor(color);
    void saveSelection(color, false);
    closeAfterAction();
  };

  const handleToolbarDelete = () => {
    refreshForAction();
    handlePopupDelete();
    closeAfterAction();
  };

  const handleToolbarNote = () => {
    refreshForAction();
    void handleCreateNote();
    closeAfterAction();
  };

  return (
    <div ref={wrapperRef} className="relative">
      {tableData && <TableRenderer tableData={tableData} />}

      {nonTableContent && (
        <div
          ref={contentRef}
          // focusable by script only, so focus can return here from the toolbar
          tabIndex={-1}
          onClick={handleContentClick}
          className="prose prose-lg prose-sky prose-table:block prose-code:text-inherit prose-table:overflow-x-scroll prose-p:my-1 prose-li:my-1 prose-headings:text-inherit prose-strong:text-inherit max-w-none select-text dark:text-slate-300"
        ></div>
      )}

      {/* Inside the block, after the content: Tab reaches it, and it scrolls with the text */}
      {enrollmentId && !author && (
        <SelectionToolbar
          position={toolbarPosition}
          selectedColor={
            isOnHighlight && highlightColor ? highlightColor : selectedColor
          }
          isOnHighlight={isOnHighlight}
          ownsEscape={ownsEscape}
          onApplyColor={handleToolbarApplyColor}
          onDelete={handleToolbarDelete}
          onNote={handleToolbarNote}
          onClose={handleToolbarClose}
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
