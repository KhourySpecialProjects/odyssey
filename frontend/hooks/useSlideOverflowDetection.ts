"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";
import { SLIDE_BREAK_TYPE } from "@/lib/blocknote/slide-break";
import type { CustomBlockNoteBlock } from "@/types";
import DOMPurify from "isomorphic-dompurify";

/**
 * Groups BlockNote blocks into slide chunks (split by slide-break blocks).
 * Returns the IDs of slide-break blocks where the preceding chunk overflows.
 */
export function useSlideOverflowDetection(
  blocks: CustomBlockNoteBlock[] | undefined,
): Set<string> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [overflowingBreaks, setOverflowingBreaks] = useState<Set<string>>(
    new Set(),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create the hidden measurement div on mount
  useEffect(() => {
    const div = document.createElement("div");
    div.style.cssText = [
      "position: fixed",
      "top: -9999px",
      "left: -9999px",
      "width: 896px",
      "opacity: 0",
      "pointer-events: none",
      "overflow: hidden",
    ].join(";");
    div.className =
      "prose prose-xl prose-sky prose-headings:font-bold prose-p:leading-relaxed max-w-none";
    document.body.appendChild(div);
    containerRef.current = div;

    return () => {
      document.body.removeChild(div);
      containerRef.current = null;
    };
  }, []);

  const measure = useCallback(() => {
    if (!containerRef.current || !blocks || blocks.length === 0) {
      setOverflowingBreaks(new Set());
      return;
    }

    const viewportHeight = window.innerHeight;
    const defaultBudget = viewportHeight * 0.85;
    const imageBudget = viewportHeight * 0.6;

    // Split blocks into chunks by slide-break
    const chunks: { blocks: CustomBlockNoteBlock[]; breakId: string | null }[] =
      [];
    let currentChunk: CustomBlockNoteBlock[] = [];

    for (const block of blocks) {
      if (block.type === SLIDE_BREAK_TYPE) {
        chunks.push({ blocks: currentChunk, breakId: block.id });
        currentChunk = [];
      } else {
        currentChunk.push(block);
      }
    }

    const overflows = new Set<string>();
    const container = containerRef.current;

    for (const chunk of chunks) {
      if (!chunk.breakId || chunk.blocks.length === 0) continue;

      const v1Blocks = convertBlockNoteToV1Blocks(
        chunk.blocks as CustomBlockNoteBlock[],
      );

      const hasImageLayout = v1Blocks.some(
        (b) => b.__component === "droplets.generic" && "slideLayout" in b,
      );
      const budget = hasImageLayout ? imageBudget : defaultBudget;

      const html = v1Blocks
        .map((b) => {
          if (b.__component === "droplets.generic") return b.content;
          if (b.__component === "droplets.callout")
            return "<div style='height:80px'></div>";
          if (b.__component === "droplets.code-block")
            return `<pre style="max-height:55vh;overflow:hidden">${b.code}</pre>`;
          if (b.__component === "droplets.video")
            return "<div style='aspect-ratio:16/9;height:360px'></div>";
          return "<div style='height:60px'></div>";
        })
        .join("");

      container.innerHTML = DOMPurify.sanitize(html, {
        ADD_TAGS: ["math", "semantics", "mrow", "mi", "mo", "mn"],
        ADD_ATTR: ["class", "style"],
      });

      if (container.scrollHeight > budget) {
        overflows.add(chunk.breakId);
      }
    }

    container.innerHTML = "";
    setOverflowingBreaks(overflows);
  }, [blocks]);

  // Debounced measurement on content change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(measure, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [measure]);

  // Re-measure on window resize
  useEffect(() => {
    const handleResize = () => measure();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [measure]);

  return overflowingBreaks;
}
