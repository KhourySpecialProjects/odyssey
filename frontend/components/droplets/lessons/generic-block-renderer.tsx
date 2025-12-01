"use client";

import React, { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import { Highlight, HighlightColor } from "@/types";
import { HighlightDropdown } from "./highlight-dropdown";
//import "katex/dist/katex.min.css";
import katex from "katex";
import { TableRenderer } from "./table-renderer";

interface Block {
  content: string;
  id: number;
}

interface GenericBlockRendererProps {
  block: Block;
  highlights: Highlight[];
  onHighlight: (highlight: Highlight, isWithNote?: boolean) => void;
  onDeleteHighlight: (highlightId: number) => void;
  onNote: (notePos: number, text: string) => void;
  enrollmentId: string | undefined;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  activeBlock: number | undefined;
  setActiveBlock: (id: number) => void;
  author?: boolean;
}

interface EnlargedImage {
  src: string;
  alt: string;
}

const GenericBlockRenderer: React.FC<GenericBlockRendererProps> = ({
  block,
  highlights,
  onHighlight,
  onDeleteHighlight,
  onNote,
  enrollmentId,
  expanded,
  setExpanded,
  activeBlock,
  setActiveBlock,
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
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("#fff300");
  const [enlargedImage, setEnlargedImage] = useState<EnlargedImage | null>(
    null,
  );

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

  useEffect(() => {
    const handleMouseEnter = () => {
      setActiveBlock(block.id);
    };

    const handleMouseLeave = () => {
      //
    };

    if (contentRef.current) {
      contentRef.current.addEventListener("mouseover", handleMouseEnter);
      contentRef.current.addEventListener("mouseleave", handleMouseLeave);
    }
    return () => {
      if (contentRef.current) {
        contentRef.current.removeEventListener("mouseover", handleMouseEnter);
        contentRef.current.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [block.id]);

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
    if (!contentRef.current) return;
    if (contentRef.current) {
      const processedContent = processLatex(nonTableContent);
      contentRef.current.innerHTML = processedContent;

      const inlineLatexElements =
        contentRef.current.querySelectorAll(".katex-inline");
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

      const blockLatexElements =
        contentRef.current.querySelectorAll(".katex-block");
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

      const codeBlocks = contentRef.current.querySelectorAll("pre code");
      codeBlocks.forEach((codeBlock) => {
        if (codeBlock.classList.contains("language-plaintext")) {
          codeBlock.classList.remove("language-plaintext");
        }
      });
      hljs.highlightAll();

      const preBlocks = contentRef.current.querySelectorAll("pre");

      preBlocks.forEach((pre) => {
        const code = pre.querySelector("code");
        if (!code) return;

        const lines = (code.textContent?.match(/\n/g) || []).length + 1;

        const lineNumbers = document.createElement("div");
        lineNumbers.className =
          "absolute left-0 top-0 bottom-0 min-w-[2.5rem] flex flex-col text-slate-500 text-sm border-r border-slate-300 bg-slate-50 select-none";

        const lineContainer = document.createElement("div");
        lineContainer.className = "pt-3 pl-3";

        for (let i = 1; i <= lines; i++) {
          const line = document.createElement("span");
          line.className = "text-right pr-2 leading-5 block";
          line.style.paddingTop = "0.15rem";
          line.style.paddingBottom = "0.18rem";
          line.textContent = `${i}`;
          lineContainer.appendChild(line);
        }

        lineNumbers.appendChild(lineContainer);
        pre.style.position = "relative";
        pre.style.paddingLeft = "3rem";
        pre.style.paddingTop = "0rem";
        pre.insertBefore(lineNumbers, pre.firstChild);
      });
      const blockHighlights = highlights.filter((h) => h.blockId === block.id);

      const sortedHighlights = [...blockHighlights].sort(
        (a, b) => (a.position?.start || 0) - (b.position?.start || 0),
      );

      sortedHighlights.forEach((highlight) => {
        const walker = document.createTreeWalker(
          contentRef.current!,
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
    }
  }, [
    nonTableContent,
    highlights,
    isHighlighting,
    contentRef,
    popupRef,
    onNote,
    savedSelectionRef,
    selectedColor,
    mousePositionY,
  ]);

  const getTextOffset = (parent: Node, node: Node): number => {
    let offset = 0;
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      if (walker.currentNode === node) break;
      offset += walker.currentNode.textContent?.length || 0;
    }
    return offset;
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

      const highlightSpan =
        range.startContainer.parentElement?.closest(
          'span[style*="background-color"]',
        ) ||
        range.endContainer?.parentElement?.closest(
          'span[style*="background-color"]',
        );

      if (highlightSpan) {
        popupRef.current.x = highlightStart;
        popupRef.current.y = highlightEnd;
        popupRef.current.highlightSpan = highlightSpan as HTMLElement;
        popupRef.current.savedRange = savedSelectionRef.current;
        return;
      }

      if (isHighlighting && text) {
        onHighlight({
          text,
          position: {
            start: highlightStart,
            end: highlightEnd,
          },
          color: selectedColor,
          blockId: block.id,
        });

        const newRange = document.createRange();
        newRange.setStart(range.startContainer, range.startOffset);
        newRange.setEnd(range.endContainer, range.endOffset);

        const span = document.createElement("span");
        span.style.borderRadius = "8px";
        span.style.backgroundColor = selectedColor;
        span.style.setProperty("color", "black", "important");

        const textNode = document.createTextNode(text);
        span.appendChild(textNode);

        newRange.deleteContents();
        newRange.insertNode(span);

        if (span.parentNode) {
          span.parentNode.normalize();
        }
      }

      popupRef.current.x = highlightStart;
      popupRef.current.y = highlightEnd;
      popupRef.current.highlightSpan = null;
      popupRef.current.savedRange = savedSelectionRef.current;
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

  const handlePopupHighlight = (isWithNote?: boolean) => {
    if (!contentRef.current || !popupRef.current.savedRange) {
      return;
    }

    const range = popupRef.current.savedRange;
    const text = range.toString();

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

    const globalStart = Math.min(startOffset, endOffset);
    const globalEnd = Math.max(startOffset, endOffset);

    if (text) {
      onHighlight(
        {
          text,
          position: {
            start: globalStart,
            end: globalEnd,
          },
          color: selectedColor,
          blockId: block.id,
        },
        isWithNote,
      );

      popupRef.current.highlightSpan = null;

      const newRange = document.createRange();
      newRange.setStart(range.startContainer, range.startOffset);
      newRange.setEnd(range.endContainer, range.endOffset);

      const span = document.createElement("span");
      span.style.borderRadius = "8px";
      span.style.backgroundColor = selectedColor;
      span.style.setProperty("color", "black", "important");

      const textNode = document.createTextNode(text);
      span.appendChild(textNode);

      newRange.deleteContents();
      newRange.insertNode(span);

      if (span.parentNode) {
        span.parentNode.normalize();
      }
    }
  };

  const handleApplyColor = (color: HighlightColor) => {
    if (
      popupRef.current.highlightSpan &&
      popupRef.current.highlightSpan.textContent
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

  const handleImageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG") {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setEnlargedImage({
      src: target.getAttribute("src") || "",
      alt: target.getAttribute("alt") || "",
    });
  };

  const handleCloseEnlarged = () => {
    setEnlargedImage(null);
  };

  return (
    <div>
      {enrollmentId && !author && (
        <HighlightDropdown
          selectedColor={selectedColor}
          handleApplyColor={handleApplyColor}
          isHighlighting={isHighlighting}
          setIsHighlighting={() => setIsHighlighting(!isHighlighting)}
          handlePopupHighlight={handlePopupHighlight}
          handlePopupDelete={handlePopupDelete}
          handleCreateNote={handleCreateNote}
          setExpanded={setExpanded}
          expanded={expanded}
          isActive={activeBlock === block.id}
        />
      )}
      <div style={{ display: "none" }}></div>

      {tableData && <TableRenderer tableData={tableData} />}

      {nonTableContent && (
        <div
          ref={contentRef}
          onMouseUp={() => handleMouseUp()}
          onMouseDown={(e) => handleMouseDown(e)}
          onClick={handleImageClick}
          className="prose prose-lg prose-sky prose-table:block prose-code:text-inherit prose-table:overflow-x-scroll prose-p:my-1 prose-li:my-1 prose-headings:text-inherit prose-strong:text-inherit mt-2 select-text dark:text-slate-300"
          dangerouslySetInnerHTML={{ __html: nonTableContent }}
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
