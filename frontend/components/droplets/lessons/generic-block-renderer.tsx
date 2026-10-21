"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getLoadedHighlighter,
  loadHighlighter,
  type HighlighterModule,
} from "./load-highlighter";
import { Highlight, HighlightColor } from "@/types";
import { SelectionToolbar } from "./selection-toolbar";
import { isPendingHighlightId } from "./highlight-ids";
//import "katex/dist/katex.min.css";
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
  onHighlight: (
    highlight: Highlight,
    isWithNote?: boolean,
  ) => Promise<Highlight | null> | void;
  onDeleteHighlight: (highlightId: number) => Promise<boolean> | void;
  onNote: (notePos: number, text: string) => void;
  enrollmentId: string | undefined;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
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

function highlightRange(
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
  color: HighlightColor,
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

    nodeRange.setStart(node, nodeStart);
    nodeRange.setEnd(node, nodeEnd || 0);

    const span = document.createElement("span");

    span.style.backgroundColor = color;
    span.style.borderRadius = "8px";
    span.style.setProperty("color", "black", "important");

    const contents = nodeRange.extractContents();
    span.appendChild(contents);
    nodeRange.insertNode(span);
  }
}

const GenericBlockRenderer: React.FC<GenericBlockRendererProps> = ({
  block,
  highlights,
  onHighlight,
  onDeleteHighlight,
  onNote,
  enrollmentId,
  author = false,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<{
    x: number;
    y: number;
    highlightSpan: HTMLElement | null;
    showColors: boolean;
    savedRange: Range | null;
    savedText: string;
  }>({
    x: 0,
    y: 0,
    highlightSpan: null,
    showColors: false,
    savedRange: null,
    savedText: "",
  });
  const savedSelectionRef = useRef<Range | null>(null);
  const [mousePositionY, setMousePositionY] = useState(0);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("#fff300");
  const [toolbarPosition, setToolbarPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isOnHighlight, setIsOnHighlight] = useState(false);
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
  // So the key is built from this block's own highlights, and the memo only
  // changes when their content does.
  const sourceIds = block.sourceBlockIds ?? [];
  const blockHighlightsKey = JSON.stringify(
    highlights.filter(
      (h) => h.blockId === block.id || sourceIds.includes(h.blockId),
    ),
  );
  const blockHighlights = useMemo<Highlight[]>(
    () => JSON.parse(blockHighlightsKey),
    [blockHighlightsKey],
  );

  // The drawing effect is the only thing that writes to the block's DOM, and
  // it only re-runs when the content or this lesson's highlights change. It
  // must not depend on hover, toolbar state, colour or callback identity: a
  // rebuild replaces every text node and drops the user's selection.
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

          if (
            !startNode &&
            currentPosition + nodeLength >= highlight.position.start
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

          const span = document.createElement("span");
          span.style.borderRadius = "8px";
          span.style.backgroundColor = highlight.color;
          span.style.setProperty("color", "black", "important");
          range.surroundContents(span);
        } catch {
          highlightRange(
            startNode,
            startOffset,
            endNode,
            endOffset,
            highlight.color,
          );
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

  const getTextOffset = (parent: Node, node: Node): number => {
    let offset = 0;
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      if (walker.currentNode === node) break;
      offset += walker.currentNode.textContent?.length || 0;
    }
    return offset;
  };

  // A highlight that is still being saved has a temporary id and can't be
  // removed, recoloured or merged yet. Drawn pieces carry no id, so find the
  // highlights covering [start, end) by offsets: pending only if no saved
  // highlight covers it too.
  const isInsidePendingHighlight = (start: number, end: number) => {
    const covers = (h: Highlight) =>
      h.position.start <= start && end <= h.position.end;
    const covering = blockHighlights.filter(covers);
    return (
      covering.some((h) => isPendingHighlightId(h.id)) &&
      !covering.some((h) => !isPendingHighlightId(h.id))
    );
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const notesBarTop = rect.top + scrollTop;
    const clickY = e.clientY + scrollTop - notesBarTop;
    setMousePositionY(clickY);
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);
    savedSelectionRef.current = range.cloneRange();

    let text = selection.toString();
    popupRef.current.savedText = text;
    popupRef.current.savedRange = savedSelectionRef.current;
    const latexParent = range.startContainer.parentElement?.closest(
      ".katex-inline, .katex-block",
    );
    if (latexParent) {
      text = decodeURIComponent(latexParent.getAttribute("data-latex") || text);
    }
    if (text.length > 0 && contentRef.current) {
      const walker = document.createTreeWalker(
        contentRef.current,
        NodeFilter.SHOW_TEXT,
      );

      let currentPosition = 0;
      let startOffset = -1;
      let endOffset = -1;
      let node = walker.nextNode();

      while (node) {
        const nodeLength = node.textContent?.length || 0;

        if (node === range.startContainer && startOffset === -1) {
          startOffset = currentPosition + range.startOffset;
        }
        if (node === range.endContainer && endOffset === -1) {
          endOffset = currentPosition + range.endOffset;
          break;
        }

        currentPosition += nodeLength;
        node = walker.nextNode();
      }

      if (startOffset === -1 || endOffset === -1) return;

      const highlightStart = Math.min(startOffset, endOffset);
      const highlightEnd = Math.max(startOffset, endOffset);

      // Inside a highlight that hasn't finished saving: offer nothing
      if (isInsidePendingHighlight(highlightStart, highlightEnd)) return;

      const startSpan = range.startContainer.parentElement?.closest(
        'span[style*="background-color"]',
      ) as HTMLElement | null;
      const endSpan = range.endContainer?.parentElement?.closest(
        'span[style*="background-color"]',
      ) as HTMLElement | null;
      // Only treat as "edit existing highlight" when the entire selection is
      // contained within the same span; a partial overlap is a new selection.
      const highlightSpan =
        startSpan && endSpan && startSpan === endSpan ? startSpan : null;

      popupRef.current.x = highlightStart;
      popupRef.current.y = highlightEnd;
      popupRef.current.highlightSpan = highlightSpan;
      popupRef.current.savedRange = savedSelectionRef.current;

      // Show floating selection toolbar
      const selectionRect = range.getBoundingClientRect();
      const toolbarY =
        selectionRect.top > 50
          ? selectionRect.top - 44
          : selectionRect.bottom + 8;
      setToolbarPosition({
        x: selectionRect.left + selectionRect.width / 2,
        y: toolbarY,
      });
      setIsOnHighlight(!!highlightSpan);
    }
  };

  const handlePopupDelete = () => {
    const savedRange = popupRef.current.savedRange;

    if (!contentRef.current || !savedRange) {
      return;
    }

    const spans = Array.from(
      contentRef.current.querySelectorAll('span[style*="background-color"]'),
    );

    spans.forEach((span) => {
      // A nested span goes with its parent when the parent is unwrapped
      if (!contentRef.current?.contains(span)) return;
      const spanRange = document.createRange();
      spanRange.selectNodeContents(span);

      const rangeIntersects =
        savedRange.compareBoundaryPoints(Range.END_TO_START, spanRange) < 0 &&
        savedRange.compareBoundaryPoints(Range.START_TO_END, spanRange) > 0;

      if (rangeIntersects) {
        const highlightId = highlights.find(
          (h) =>
            (h.text === span.textContent ||
              h.text.includes(span.textContent || "")) &&
            h.blockId === block.id,
        )?.id;

        if (highlightId) {
          onDeleteHighlight(highlightId);
        }

        const textNode = document.createTextNode(span.textContent || "");
        const parent = span.parentNode;
        if (parent) {
          parent.replaceChild(textNode, span);
          parent.normalize();
        }
      }
    });

    popupRef.current.highlightSpan = null;
    popupRef.current.savedRange = null;
  };

  const handlePopupHighlight = (
    isWithNote?: boolean,
    colorOverride?: HighlightColor,
  ) => {
    if (!contentRef.current) return;

    const colorToUse = colorOverride ?? selectedColor;
    const globalStart = popupRef.current.x;
    const globalEnd = popupRef.current.y;
    const text = popupRef.current.savedText;

    if (!text || globalStart === globalEnd) return;

    // The block never wraps the selection by hand: the parent adds the
    // highlight to its state and the drawing effect draws it from there.
    const existingSpan = popupRef.current.highlightSpan;
    const effectiveColor = existingSpan
      ? (existingSpan.style.backgroundColor as HighlightColor)
      : colorToUse;

    onHighlight(
      {
        text,
        position: { start: globalStart, end: globalEnd },
        color: effectiveColor,
        blockId: block.id,
      },
      isWithNote,
    );

    popupRef.current.highlightSpan = null;
  };

  const handleApplyColor = (color: HighlightColor) => {
    const savedRange = popupRef.current.savedRange;
    if (
      popupRef.current.highlightSpan &&
      popupRef.current.highlightSpan.textContent &&
      savedRange &&
      popupRef.current.highlightSpan.contains(savedRange.startContainer) &&
      popupRef.current.highlightSpan.contains(savedRange.endContainer)
    ) {
      const blockOffset = getTextOffset(
        contentRef.current!,
        popupRef.current.highlightSpan.firstChild!,
      );

      const spanLength = popupRef.current.highlightSpan.textContent.length;

      const highlightId = highlights.find(
        (h) => h.text === popupRef.current.highlightSpan?.textContent,
      )?.id;
      if (highlightId) {
        onDeleteHighlight(highlightId);
      }
      onHighlight({
        text: popupRef.current.highlightSpan.textContent,
        position: {
          start: blockOffset,
          end: blockOffset + spanLength,
        },
        color: color,
        blockId: block.id,
      });
    } else {
      setSelectedColor(color);
    }
  };

  const handleCreateNote = () => {
    handlePopupHighlight(true);
    onNote(
      mousePositionY,
      popupRef.current.savedText.replace(/[\r\n]+/g, "") || "",
    );
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

    // If clicking on or inside a highlight span, show toolbar with delete option
    const highlightSpan = target.closest(
      'span[style*="background-color"]',
    ) as HTMLElement | null;
    if (!highlightSpan || !contentRef.current) return;

    // Walk the tree to find the character offsets of this span
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
    );
    let currentPosition = 0;
    let spanStart = -1;
    let spanEnd = -1;
    let node = walker.nextNode();
    while (node) {
      const nodeLength = node.textContent?.length || 0;
      if (highlightSpan.contains(node)) {
        if (spanStart === -1) spanStart = currentPosition;
        spanEnd = currentPosition + nodeLength;
      }
      currentPosition += nodeLength;
      node = walker.nextNode();
    }

    if (spanStart === -1) return;

    if (isInsidePendingHighlight(spanStart, spanEnd)) return;

    const range = document.createRange();
    range.selectNodeContents(highlightSpan);
    popupRef.current.x = spanStart;
    popupRef.current.y = spanEnd;
    popupRef.current.savedText = highlightSpan.textContent || "";
    popupRef.current.highlightSpan = highlightSpan;
    popupRef.current.savedRange = range;
    savedSelectionRef.current = range;

    const rect = highlightSpan.getBoundingClientRect();
    const toolbarY = rect.top > 50 ? rect.top - 44 : rect.bottom + 8;
    setToolbarPosition({ x: rect.left + rect.width / 2, y: toolbarY });
    setIsOnHighlight(true);
  };

  const handleCloseEnlarged = () => {
    setEnlargedImage(null);
  };

  const handleToolbarApplyColor = (color: HighlightColor) => {
    setSelectedColor(color);
    if (isOnHighlight) {
      handleApplyColor(color);
    } else {
      handlePopupHighlight(false, color);
    }
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleToolbarDelete = () => {
    handlePopupDelete();
    setToolbarPosition(null);
  };

  const handleToolbarNote = () => {
    handleCreateNote();
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div>
      {enrollmentId && !author && (
        <SelectionToolbar
          position={toolbarPosition}
          selectedColor={selectedColor}
          isOnHighlight={isOnHighlight}
          onApplyColor={handleToolbarApplyColor}
          onDelete={handleToolbarDelete}
          onNote={handleToolbarNote}
          onClose={() => setToolbarPosition(null)}
        />
      )}
      <div style={{ display: "none" }}></div>

      {tableData && <TableRenderer tableData={tableData} />}

      {nonTableContent && (
        <div
          ref={contentRef}
          onMouseUp={() => handleMouseUp()}
          onMouseDown={(e) => handleMouseDown(e)}
          onClick={handleContentClick}
          className="prose prose-lg prose-sky prose-table:block prose-code:text-inherit prose-table:overflow-x-scroll prose-p:my-1 prose-li:my-1 prose-headings:text-inherit prose-strong:text-inherit max-w-none select-text dark:text-slate-300"
        ></div>
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
