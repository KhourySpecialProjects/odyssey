"use client";

//Refactored the rendering of generic blocks into this separate component
//to make it easier to handle syntax highlighting of code blocks.

import React, { useEffect, useRef } from "react";
import hljs from "highlight.js";

interface GenericBlockRendererProps {
  block: any;
}

const GenericBlockRenderer: React.FC<GenericBlockRendererProps> = ({
  block,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (contentRef.current) {
      const codeBlocks = contentRef.current.querySelectorAll("pre code");

      // remove any plaintext classes from code blocks and then let highlight js
      // detect the language and highlight the code.
      codeBlocks.forEach((codeBlock) => {
        if (codeBlock.classList.contains("language-plaintext")) {
          codeBlock.classList.remove("language-plaintext");
        }
      });

      hljs.highlightAll();
    }
  }, [block]);

  return (
    <div
      ref={contentRef}
      className="mt-2 prose prose-lg prose-sky prose-table:block prose-table:overflow-x-scroll"
      dangerouslySetInnerHTML={{ __html: block.content }}
    ></div>
  );
};

export default GenericBlockRenderer;
