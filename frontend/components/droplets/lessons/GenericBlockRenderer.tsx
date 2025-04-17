"use client";

import React, { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import { Highlight, HighlightColor } from "@/types";
import { HighlightDropdown } from "./highlight-dropdown";
import "katex/dist/katex.min.css";
import katex from "katex";

interface GenericBlockRendererProps {
  block: any;
  highlights: Highlight[];
  onHighlight: (highlight: Highlight, isWithNote?: boolean) => void;
  onDeleteHighlight: (highlightId: number) => void;
  onNote: (notePos: number, text: string) => void;
  genericBlocks: number[];
  enrollmentId: string | undefined;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
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
  genericBlocks,
  enrollmentId,
  expanded,
  setExpanded,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<{
    x: number;
    y: number;
    highlightSpan: HTMLElement | null;
    showColors: boolean;
    savedRange: Range | null;
  }>({
    x: 0,
    y: 0,
    highlightSpan: null,
    showColors: false,
    savedRange: null,
  });
  const savedSelectionRef = useRef<Range | null>(null);
  const [mousePositionY, setMousePositionY] = useState(0);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("#fff300");
  const currentSelectionRef = useRef<Range | null>(null);
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
    if (contentRef.current) {
      const processedContent = processLatex(block.content);
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
          "absolute left-0 top-0 bottom-0 min-w-[2.5rem] flex flex-col text-slate-500 text-sm select-none border-r border-slate-300 bg-slate-50";

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
      const sortedHighlights = [...highlights].sort(
        (a, b) => (a.position?.start || 0) - (b.position?.start || 0),
      );

      sortedHighlights.forEach((highlight) => {
        if (!highlight.position?.start || !highlight.position?.end) return;

        const walker = document.createTreeWalker(
          contentRef.current!,
          NodeFilter.SHOW_TEXT,
        );

        let currentPosition = 0;
        let currentNode = walker.nextNode();

        while (
          currentNode &&
          currentPosition + (currentNode.textContent?.length || 0) <=
            highlight.position.start
        ) {
          currentPosition += currentNode.textContent?.length || 0;
          currentNode = walker.nextNode();
        }
        if (!currentNode) return;

        const startNode = currentNode;
        const startOffset = highlight.position.start - currentPosition;

        let endNode = startNode;
        let endOffset = highlight.position.end - currentPosition;

        while (
          currentNode &&
          currentPosition + (currentNode.textContent?.length || 0) <
            highlight.position.end
        ) {
          currentPosition += currentNode.textContent?.length || 0;
          currentNode = walker.nextNode();
          if (currentNode) endNode = currentNode;
        }

        if (currentNode) {
          endOffset = Math.min(
            currentNode.textContent?.length || 0,
            highlight.position.end - currentPosition,
          );

          const range = document.createRange();
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);

          const span = document.createElement("span");
          span.style.borderRadius = "8px";
          span.style.backgroundColor = highlight.color;
          span.style.color = "black";

          try {
            range.surroundContents(span);
          } catch (e) {
            console.warn("Failed to highlight range:", e);
          }
        }
      });
    }
  }, [
    block,
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

    let range = selection.getRangeAt(0);
    savedSelectionRef.current = range.cloneRange();
    //currentSelectionRef.current = range.cloneRange();

    // const span = document.createElement("span");
    //     //span.style.borderRadius = "8px";
    //     span.style.backgroundColor = "rgb(0, 120, 215)";
    //     span.style.color = "white"
    //     span.style.userSelect = "text";
    //     span.style.padding = "5px 0";
    //     currentSelectionRef.current.surroundContents(span);

    let text = selection.toString();
    const latexParent = range.startContainer.parentElement?.closest(
      ".katex-inline, .katex-block",
    );
    if (latexParent) {
      text = decodeURIComponent(latexParent.getAttribute("data-latex") || text);
    }
    if (text.length > 0 && contentRef.current) {
      const blockOffset = getTextOffset(
        contentRef.current,
        range.startContainer,
      );
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;
      const highlightSpan =
        startContainer.parentElement?.closest(
          'span[style*="background-color"]',
        ) ||
        endContainer?.parentElement?.closest('span[style*="background-color"]');
      if (highlightSpan) {
        popupRef.current.x = blockOffset + range.startOffset;
        popupRef.current.y = blockOffset + range.endOffset;
        popupRef.current.highlightSpan = highlightSpan as HTMLElement;
        popupRef.current.savedRange = savedSelectionRef.current;
        return;
      }

      if (isHighlighting && text) {
        onHighlight({
          text,
          position: {
            start: blockOffset + range.startOffset,
            end: blockOffset + range.endOffset,
          },
          color: selectedColor,
        });
        const span = document.createElement("span");
        span.style.borderRadius = "8px";
        span.style.backgroundColor = selectedColor;
        range.surroundContents(span);
      }
      popupRef.current.x = blockOffset + range.startOffset;
      popupRef.current.y = blockOffset + range.endOffset;
      popupRef.current.highlightSpan = null;
      popupRef.current.savedRange = savedSelectionRef.current;
    }
  };

  const handlePopupDelete = () => {
    if (popupRef.current.highlightSpan) {
      const highlightId = highlights.find(
        (h) => h.text === popupRef.current.highlightSpan?.textContent,
      )?.id;

      if (highlightId) {
        onDeleteHighlight(highlightId);
        const parent = popupRef.current.highlightSpan.parentNode;
        if (parent) {
          const textNode = document.createTextNode(
            popupRef.current.highlightSpan.textContent || "",
          );
          parent.replaceChild(textNode, popupRef.current.highlightSpan);
          parent.normalize();
        }
      }
    }
  };

  const handlePopupHighlight = (isWithNote?: boolean) => {
    if (!contentRef.current || !popupRef.current.savedRange) {
      return;
    }

    const range = popupRef.current.savedRange;
    const text = range.toString();
    const blockOffset = getTextOffset(contentRef.current, range.startContainer);

    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    if (text) {
      onHighlight(
        {
          text,
          position: {
            start: blockOffset + startOffset,
            end: blockOffset + endOffset,
          },
          color: selectedColor,
        },
        isWithNote,
      );
      popupRef.current.highlightSpan = null;
    }

    const span = document.createElement("span");
    span.style.borderRadius = "8px";
    span.style.backgroundColor = selectedColor;
    range.surroundContents(span);
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
      });
    } else {
      setSelectedColor(color);
    }
  };

  const handleCreateNote = () => {
    handlePopupHighlight(true);
    onNote(mousePositionY, popupRef.current.savedRange?.toString() || "");
    console.log(
      "this is the highlight noted ",
      popupRef.current.savedRange?.toString(),
    );
  };

  const handleImageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    console.log("target name ", target.tagName);
    if (target.tagName === "IMG") {
      e.preventDefault();
      e.stopPropagation();
      setEnlargedImage({
        src: target.getAttribute("src") || "",
        alt: target.getAttribute("alt") || "",
      });
    }
  };

  const handleCloseEnlarged = () => {
    setEnlargedImage(null);
  };

  return (
    <div className="">
      {block.id === genericBlocks[0] && enrollmentId && (
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
        />
      )}

      <div
        ref={contentRef}
        onMouseUp={(e) => handleMouseUp()}
        onMouseDown={(e) => handleMouseDown(e)}
        onClick={handleImageClick}
        className="mt-2 prose prose-lg prose-sky prose-table:block prose-code:text-inherit prose-table:overflow-x-scroll prose-p:my-1 prose-li:my-1 select-text dark:text-slate-300 prose-headings:text-inherit prose-strong:text-inherit"
        dangerouslySetInnerHTML={{ __html: block.content }}
      ></div>

      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/50"
          onClick={handleCloseEnlarged}
        >
          <img
            src={enlargedImage?.src}
            alt={enlargedImage?.alt}
            className="w-full xl:w-auto xl:h-full max-w-[75%] max-h-[75%] object-contain absolute top-1/2 -translate-y-[40%] left-1/2 -translate-x-[50%] xl:-translate-x-[35%] bg-cyan-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default GenericBlockRenderer;
