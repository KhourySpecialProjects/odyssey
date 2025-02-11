"use client";

//Refactored the rendering of generic blocks into this separate component
//to make it easier to handle syntax highlighting of code blocks.

import React, { useEffect, useRef } from "react";
import hljs from "highlight.js";
import { Highlight } from "@/types";

interface GenericBlockRendererProps {
  block: any;
  highlights: Highlight[];
  onHighlight: (highlight: Highlight) => void;
}

const GenericBlockRenderer: React.FC<GenericBlockRendererProps> = ({
  block,
  highlights,
  onHighlight,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
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
      highlights?.forEach(highlight => {
        const range = document.createRange();
        const startNode = contentRef.current?.firstChild;
        const endNode = contentRef.current?.firstChild;
        
        if (startNode && endNode && highlight.position?.start !== undefined) {
          range.setStart(startNode, highlight.position.start);
          range.setEnd(endNode, highlight.position.end);
          
          const span = document.createElement('span');
          span.style.backgroundColor = highlight.color;
          range.surroundContents(span);
        }
      });
    }
  }, [block, highlights]);

  const getTextOffset = (parent: Node, node: Node): number => {
    let offset = 0;
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
    
    while (walker.nextNode()) {
      if (walker.currentNode === node) break;
      offset += walker.currentNode.textContent?.length || 0;
    }
    return offset;
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString();
    
    if (text.length > 0 && contentRef.current) {
      const blockOffset = getTextOffset(contentRef.current, range.startContainer);
    
      onHighlight({
        text,
        position: {
          start: blockOffset + range.startOffset,
          end: blockOffset + range.endOffset
        },
        color: 'yellow'
      });
      const span = document.createElement('span');
      span.style.backgroundColor = 'yellow';
      range.surroundContents(span);
    }
  };

  return (
    <div
      ref={contentRef}
      onMouseUp={handleMouseUp}
      className="mt-2 prose prose-lg prose-sky prose-table:block prose-table:overflow-x-scroll"
      dangerouslySetInnerHTML={{ __html: block.content }}
    ></div>
  );
};

export default GenericBlockRenderer;
