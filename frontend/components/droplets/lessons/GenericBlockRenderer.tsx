"use client";

//Refactored the rendering of generic blocks into this separate component
//to make it easier to handle syntax highlighting of code blocks.

import React, { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import { Highlight } from "@/types";
import {
  Highlighter,
  X,
  CircleHelp,
  Pen,
  NotebookPen,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface GenericBlockRendererProps {
  block: any;
  highlights: Highlight[];
  onHighlight: (highlight: Highlight) => void;
  onDeleteHighlight: (highlightId: number) => void;
  onNote: (notePos: number, text: string) => void;
  genericBlocks: number[];
}

const GenericBlockRenderer: React.FC<GenericBlockRendererProps> = ({
  block,
  highlights,
  onHighlight,
  onDeleteHighlight,
  onNote,
  genericBlocks,
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
  const [selectedColor, setSelectedColor] = useState("yellow");

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
  }, [
    block,
    highlights,
    isHighlighting,
    contentRef,
    popupRef,
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
    setMousePositionY(e.pageY + 75);
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    let range = selection.getRangeAt(0);
    savedSelectionRef.current = range.cloneRange();

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

  const renderHighlightedText = (text: string) => {
    let highlightedText = text;

    highlights.forEach((highlight) => {
      highlightedText = highlightedText.replace(
        highlight.text,
        `<span style="background-color: ${highlight.color}">${highlight.text}</span>`,
      );
    });

    return { __html: highlightedText };
  };

  const handlePopupHighlight = () => {
    if (!contentRef.current || !popupRef.current.savedRange) {
      return;
    }

    const range = popupRef.current.savedRange;
    const text = range.toString();
    const blockOffset = getTextOffset(contentRef.current, range.startContainer);

    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    if (text) {
      onHighlight({
        text,
        position: {
          start: blockOffset + startOffset,
          end: blockOffset + endOffset,
        },
        color: selectedColor,
      });
      popupRef.current.highlightSpan = null;
    }

    const span = document.createElement("span");
    span.style.backgroundColor = selectedColor;
    range.surroundContents(span);
  };

  const handleApplyColor = (color: string) => {
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
    handlePopupHighlight();
    onNote(mousePositionY, popupRef.current.savedRange?.toString() || "");
  };

  return (
    <>
      {block.id === genericBlocks[0] && (
        <div className="fixed top-8 right-1/4 z-10 transform -translate-x-1/2 bg-blue-100 p-2 rounded shadow-lg">
          <div className="relative group">
            <CircleHelp className="cursor-pointer" />
            <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-max gap-2 bg-white p-4 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center pointer-events-none">
              <p>Highlighting Instructions:</p>
              <ul className="list-disc pl-4">
                <li>Hover over the pen icon to see actions.</li>
                <li>Use the toggle to switch highlighting mode.</li>
                <li>In highlighting mode, selected text is highlighted.</li>
                <li>Press the highlighter icon to highlight text.</li>
                <li>Press the X icon to delete a highlight.</li>
                <li>Press the note icon to add a note to text.</li>
                <li>Click a colored circle to change highlight color.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      {block.id === genericBlocks[0] && (
        <div className="fixed top-8 z-0 right-1/4 transform -translate-x-1/2 bg-blue-100 p-2 rounded shadow-lg  group">
          <div className="relative">
            <Pen className="cursor-pointer" />

            <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-max gap-2 bg-white p-4 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
              <div title="Highlighting Mode">
                <Switch
                  id="public"
                  checked={isHighlighting}
                  onCheckedChange={setIsHighlighting}
                  className={`bg-black`}
                />
                <Label htmlFor="public" />
              </div>

              <button
                title="Add Highlight"
                onClick={handlePopupHighlight}
                className="relative group"
              >
                <Highlighter size={30} />
              </button>

              <button
                title="Delete Highlight"
                onClick={handlePopupDelete}
                className="relative group"
              >
                <X size={30} />
              </button>

              <button
                title="Take Note"
                onClick={handleCreateNote}
                className="relative group"
              >
                <NotebookPen size={30} />
              </button>

              <button
                title="Highlight Pink"
                onClick={() => handleApplyColor("#f9a8d4")}
                className={`w-6 h-6 rounded-full ${selectedColor === "#f9a8d4" ? "border-2 border-black" : "border border-gray-300"} bg-pink-300`}
              />
              <button
                title="Highlight Orange"
                onClick={() => handleApplyColor("#fbd38d")}
                className={`w-6 h-6 rounded-full ${selectedColor === "#fbd38d" ? "border-2 border-black" : "border border-gray-300"} bg-orange-300`}
              />
              <button
                title="Highlight Yellow"
                onClick={() => handleApplyColor("yellow")}
                className={`w-6 h-6 rounded-full ${selectedColor === "yellow" ? "border-2 border-black" : "border border-gray-300"} bg-yellow-300`}
              />
              <button
                title="Highlight Green"
                onClick={() => handleApplyColor("#86efac")}
                className={`w-6 h-6 rounded-full ${selectedColor === "#86efac" ? "border-2 border-black" : "border border-gray-300"} bg-green-300`}
              />
              <button
                title="Highlight Blue"
                onClick={() => handleApplyColor("#93c5fd")}
                className={`w-6 h-6 rounded-full ${selectedColor === "#93c5fd" ? "border-2 border-black" : "border border-gray-300"} bg-blue-300`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        onMouseUp={(e) => handleMouseUp()}
        onMouseDown={(e) => handleMouseDown(e)}
        className="mt-2 prose prose-lg prose-sky prose-table:block prose-table:overflow-x-scroll select-text"
        dangerouslySetInnerHTML={renderHighlightedText(block.content)}
      ></div>
    </>
  );
};

export default GenericBlockRenderer;
