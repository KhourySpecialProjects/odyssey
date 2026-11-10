"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getLoadedHighlighter,
  loadHighlighter,
  type HighlighterModule,
} from "./load-highlighter";
import { drawHighlights, regionProps } from "@/lib/highlight-regions";
import { useRegionHighlights } from "./highlight-layer";
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

interface GenericBlockRendererProps {
  block: Block;
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
 * A block of HTML: text, lists, code, LaTeX, images and tables. Its
 * highlights come from the HighlightLayer around it, which handles selecting
 * and the toolbar; they're drawn over both its table and its text.
 */
const GenericBlockRenderer: React.FC<GenericBlockRendererProps> = ({
  block,
}) => {
  const regionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [enlargedImage, setEnlargedImage] = useState<EnlargedImage | null>(
    null,
  );

  // Includes the blocks grouped into this one, whose highlights it shows
  const ids = [block.id, ...(block.sourceBlockIds ?? [])];
  // The block is redrawn only when highlightKey changes, so a new highlights
  // array (or a hover, or a colour pick) leaves the reader's selection alone
  const { highlights: blockHighlights, key: highlightKey } =
    useRegionHighlights(ids);
  const blockHighlightsRef = useRef(blockHighlights);
  useEffect(() => {
    blockHighlightsRef.current = blockHighlights;
  });

  // Check if content contains a table
  const tableMatch = block.content.match(
    /<!--TABLE_START-->([\s\S]*?)<!--TABLE_END-->/,
  );
  const tableJson = tableMatch?.[1];
  // Parsed once per table, so the table keeps its cells' HTML (and the
  // highlights drawn in it) across renders
  const tableData = useMemo(() => {
    try {
      return tableJson ? JSON.parse(tableJson) : null;
    } catch (e) {
      console.error("Failed to parse table data:", e);
      return null;
    }
  }, [tableJson]);
  const nonTableContent = tableMatch
    ? block.content.replace(/<!--TABLE_START-->[\s\S]*?<!--TABLE_END-->/, "")
    : block.content;

  useEffect(() => {
    const container = contentRef.current;
    if (!container) {
      // A table alone: React renders its cells, and highlights go over them
      if (regionRef.current) {
        drawHighlights(regionRef.current, blockHighlightsRef.current);
      }
      return;
    }

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

      // Drawn from the saved list only, so nothing else needs to add spans.
      // The region holds the table too, whose old highlights are cleared.
      if (regionRef.current) {
        drawHighlights(regionRef.current, blockHighlightsRef.current);
      }

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
  }, [nonTableContent, tableJson, highlightKey]);

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG") return;

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

  // Positioned: the highlight toolbar is shown at the end of it
  return (
    <div className="relative">
      <div ref={regionRef} {...regionProps(ids)}>
        {tableData && <TableRenderer tableData={tableData} />}

        {nonTableContent && (
          <div
            ref={contentRef}
            onClick={handleContentClick}
            className="prose prose-lg prose-sky prose-table:block prose-code:text-inherit prose-table:overflow-x-scroll prose-p:my-1 prose-li:my-1 prose-headings:text-inherit prose-strong:text-inherit max-w-none select-text dark:text-slate-300"
          ></div>
        )}
      </div>

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
