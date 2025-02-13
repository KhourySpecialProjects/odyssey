"use client";

//Refactored the rendering of generic blocks into this separate component
//to make it easier to handle syntax highlighting of code blocks.

import React, { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import { Highlight } from "@/types";
import { Highlighter, X, Palette, Pencil } from "lucide-react";

interface GenericBlockRendererProps {
  block: any;
  highlights: Highlight[];
  onHighlight: (highlight: Highlight) => void;
  onDeleteHighlight: (highlightId: number) => void;
  isHighlighting: boolean;
  onNote: (notePos: number, text: string) => void;
}

const GenericBlockRenderer: React.FC<GenericBlockRendererProps> = ({
  block,
  highlights,
  onHighlight,
  onDeleteHighlight,
  isHighlighting,
  onNote,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState<{
    x: string;
    y: number;
    show: boolean;
    highlightSpan: HTMLElement | null;
    showColors: boolean;
  }>({
    x: "",
    y: 0,
    show: false,
    highlightSpan: null,
    showColors: false,
  });
  const savedSelectionRef = useRef<Range | null>(null);
  const [mousePositionY, setMousePositionY] = useState(0);
  const [mousePositionX, setMousePositionX] = useState(0);
  const [curHighlightText, setCurHighlightText] = useState("");

  useEffect(() => {
    if (popup.show && savedSelectionRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelectionRef.current);
    }
  }, [popup.show]);

  useEffect(() => {
    if (!popup.show) {
      savedSelectionRef.current = null;
    }
  }, [popup.show]);

  useEffect(() => {
    if (contentRef.current) {
      const codeBlocks = contentRef.current.querySelectorAll("pre code");
      codeBlocks.forEach((codeBlock) => {
        if (codeBlock.classList.contains("language-plaintext")) {
          codeBlock.classList.remove("language-plaintext");
        }
      });
      hljs.highlightAll();

      // Apply existing highlights
      highlights?.forEach((highlight) => {
        if (!highlight.position?.start || !highlight.position?.end) return;

        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(
          contentRef.current!,
          NodeFilter.SHOW_TEXT,
        );

        let currentPosition = 0;
        let targetNode: Text | null = null;
        let localStart = highlight.position.start;
        let localEnd = highlight.position.end;

        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          const nodeLength = node.length;

          if (currentPosition + nodeLength > highlight.position.start) {
            targetNode = node;
            localStart = highlight.position.start - currentPosition;
            localEnd = Math.min(
              nodeLength,
              highlight.position.end - currentPosition,
            );
            break;
          }
          currentPosition += nodeLength;
        }

        if (targetNode) {
          const range = document.createRange();
          range.setStart(targetNode, localStart);
          range.setEnd(targetNode, localEnd);

          const span = document.createElement("span");
          span.style.backgroundColor = highlight.color;
          range.surroundContents(span);
        }
      });
    }
  }, [block, highlights, isHighlighting, popup]);

  const getTextOffset = (parent: Node, node: Node): number => {
    let offset = 0;
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      if (walker.currentNode === node) break;
      offset += walker.currentNode.textContent?.length || 0;
    }
    return offset;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    //const rect = e.currentTarget.getBoundingClientRect();
    // Calculate percentage from top of container
    //setMousePositionY(((e.clientY - rect.top) / rect.height) * 100);
    const rect = e.currentTarget.getBoundingClientRect();
    const rightOffset = ((rect.right - e.clientX) / rect.width) * 100;
    setMousePositionX(100 - rightOffset); // Position from left edge
    setMousePositionY(e.pageY);

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString();

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
        endContainer.parentElement?.closest('span[style*="background-color"]');
      if (highlightSpan) {
        const parent = highlightSpan.parentNode;
        if (parent) {
          const highlightId = highlights.find(
            (h) =>
              h.text === highlightSpan.textContent &&
              h.color === (highlightSpan as HTMLElement).style.backgroundColor,
          )?.id;
          if (highlightId && isHighlighting) {
            onDeleteHighlight(highlightId);
            const textNode = document.createTextNode(
              highlightSpan.textContent || "",
            );
            parent.replaceChild(textNode, highlightSpan);
            parent.normalize();
          }
        }
        // const rect = highlightSpan.getBoundingClientRect();
        // setPopup({
        //   x: blockOffset - range.startOffset,
        //   y: blockOffset - range.endOffset,
        //   show: true,
        //   highlightSpan: highlightSpan as HTMLElement,
        //   showColors: false,
        // });
        setPopup({
          //x: blockOffset - range.startOffset,
          x: `${mousePositionX - 3}%`,
          y: e.pageY - 90,
          show: true,
          highlightSpan: highlightSpan as HTMLElement,
          showColors: false,
        });
        return;
      }
      savedSelectionRef.current = range.cloneRange();

      if (isHighlighting) {
        setCurHighlightText(text);
        onHighlight({
          text,
          position: {
            start: blockOffset + range.startOffset,
            end: blockOffset + range.endOffset,
          },
          color: "yellow",
        });
        const span = document.createElement("span");
        span.style.backgroundColor = "yellow";
        range.surroundContents(span);
      }

      // const rect = range.getBoundingClientRect();
      setPopup({
        //x: blockOffset,
        x: `${mousePositionX - 3}%`,
        y: e.pageY - 90,
        show: true,
        highlightSpan: null,
        showColors: false,
      });
    }
  };

  const handlePopupDelete = () => {
    if (popup.highlightSpan) {
      const highlightId = highlights.find(
        (h) =>
          h.text === popup.highlightSpan?.textContent &&
          h.color ===
            (popup.highlightSpan as HTMLElement).style.backgroundColor,
      )?.id;

      if (highlightId) {
        onDeleteHighlight(highlightId);
        const parent = popup.highlightSpan.parentNode;
        if (parent) {
          const textNode = document.createTextNode(
            popup.highlightSpan.textContent || "",
          );
          parent.replaceChild(textNode, popup.highlightSpan);
          parent.normalize();
        }
      }
      setPopup((prev) => ({ ...prev, show: false }));
    }
  };

  const handlePopupHighlight = () => {
    const selection = window.getSelection();

    if (!selection || !contentRef.current) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString();
    const blockOffset = getTextOffset(contentRef.current, range.startContainer);

    onHighlight({
      text,
      position: {
        start: blockOffset + range.startOffset,
        end: blockOffset + range.endOffset,
      },
      color: "yellow",
    });

    const span = document.createElement("span");
    span.style.backgroundColor = "yellow";
    range.surroundContents(span);
    setPopup((prev) => ({ ...prev, show: false }));
  };

  const handleColorChoice = () => {
    setPopup((prev) => ({ ...prev, showColors: !prev.showColors })); // Toggle color buttons
  };

  const handleApplyColor = (color: string) => {
    if (popup.highlightSpan) {
      popup.highlightSpan.style.backgroundColor = color;
      setPopup((prev) => ({ ...prev, showColors: false }));
    }
  };

  const handleCreateNote = () => {
    onNote(mousePositionY, curHighlightText);
  };

  return (
    <>
      <div
        ref={contentRef}
        onMouseUp={(e) => handleMouseUp(e)}
        //onMouseDown={() => popup.show = false}
        className="mt-2 prose prose-lg prose-sky prose-table:block prose-table:overflow-x-scroll select-text"
        dangerouslySetInnerHTML={{ __html: block.content }}
      ></div>
      {popup?.show && (
        <div
          style={{
            position: "absolute",
            top: popup.y,
            left: popup.x,
            background: "white",
            border: "1px solid black",
            padding: "5px",
            borderRadius: "5px",
            display: "flex",
            gap: "5px",
          }}
        >
          {popup.highlightSpan ? (
            <>
              <button onClick={handlePopupDelete}>
                <X size={16} />
              </button>
              <button onClick={handleColorChoice}>
                <Palette size={16} />
              </button>
              {popup.showColors && (
                <div style={{ display: "flex", gap: "5px" }}>
                  <button
                    onClick={() => handleApplyColor("red")}
                    style={{
                      background: "red",
                      width: "20px",
                      height: "20px",
                      border: "none",
                      borderRadius: "50%",
                    }}
                  />
                  <button
                    onClick={() => handleApplyColor("yellow")}
                    style={{
                      background: "yellow",
                      width: "20px",
                      height: "20px",
                      border: "none",
                      borderRadius: "50%",
                    }}
                  />
                  <button
                    onClick={() => handleApplyColor("blue")}
                    style={{
                      background: "blue",
                      width: "20px",
                      height: "20px",
                      border: "none",
                      borderRadius: "50%",
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <button onClick={handlePopupHighlight}>
                <Highlighter size={16} />
              </button>
              <button onClick={handleColorChoice}>
                <Palette size={16} />
              </button>
              <button onClick={handleCreateNote}>
                <Pencil size={16} />
              </button>
              {popup.showColors && (
                <div style={{ display: "flex", gap: "5px" }}>
                  <button
                    onClick={() => handleApplyColor("red")}
                    style={{
                      background: "red",
                      width: "20px",
                      height: "20px",
                      border: "none",
                      borderRadius: "50%",
                    }}
                  />
                  <button
                    onClick={() => handleApplyColor("yellow")}
                    style={{
                      background: "yellow",
                      width: "20px",
                      height: "20px",
                      border: "none",
                      borderRadius: "50%",
                    }}
                  />
                  <button
                    onClick={() => handleApplyColor("blue")}
                    style={{
                      background: "blue",
                      width: "20px",
                      height: "20px",
                      border: "none",
                      borderRadius: "50%",
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default GenericBlockRenderer;
