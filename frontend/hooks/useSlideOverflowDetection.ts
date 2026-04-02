"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";
import { SLIDE_BREAK_TYPE } from "@/lib/blocknote/slide-break";
import { COLUMN_BREAK_TYPE } from "@/lib/blocknote/column-break";
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

    // Split blocks into chunks by slide-break
    const chunks: {
      blocks: CustomBlockNoteBlock[];
      breakId: string | null;
      isTwoColumns: boolean;
    }[] = [];
    let currentChunk: CustomBlockNoteBlock[] = [];
    // nextSlideLayout applies to the chunk AFTER the slide-break
    let pendingTwoColumns = false;

    let lastBreakId: string | null = null;

    for (const block of blocks) {
      if (block.type === SLIDE_BREAK_TYPE) {
        chunks.push({
          blocks: currentChunk,
          breakId: block.id,
          isTwoColumns: pendingTwoColumns,
        });
        pendingTwoColumns =
          (block.props as Record<string, unknown>)?.nextSlideLayout ===
          "two-columns";
        lastBreakId = block.id;
        currentChunk = [];
      } else {
        currentChunk.push(block);
      }
    }

    // Push the final chunk (content after the last slide-break)
    if (currentChunk.length > 0 && lastBreakId) {
      chunks.push({
        blocks: currentChunk,
        breakId: lastBreakId,
        isTwoColumns: pendingTwoColumns,
      });
    }

    const overflows = new Set<string>();
    const container = containerRef.current;
    const sanitizeOpts = {
      ADD_TAGS: ["math", "semantics", "mrow", "mi", "mo", "mn"],
      ADD_ATTR: ["class", "style"],
    };

    function blocksToHtml(
      v1Blocks: ReturnType<typeof convertBlockNoteToV1Blocks>,
    ): string {
      return v1Blocks
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
    }

    function measureHtml(html: string, budget: number): boolean {
      container.innerHTML = DOMPurify.sanitize(html, sanitizeOpts);
      const overflowed = container.scrollHeight > budget;
      container.innerHTML = "";
      return overflowed;
    }

    for (const chunk of chunks) {
      if (!chunk.breakId || chunk.blocks.length === 0) continue;

      const v1Blocks = convertBlockNoteToV1Blocks(
        chunk.blocks as CustomBlockNoteBlock[],
      );

      if (chunk.isTwoColumns) {
        // Two-column: measure at half width since each column gets basis-1/2
        container.style.width = "428px";

        const colBreakIdx = chunk.blocks.findIndex(
          (b) => b.type === COLUMN_BREAK_TYPE,
        );

        if (colBreakIdx >= 0) {
          // Has a column-break: measure each column separately
          const colBreakId = chunk.blocks[colBreakIdx].id;
          const leftBlocks = chunk.blocks.slice(0, colBreakIdx);
          const rightBlocks = chunk.blocks.slice(colBreakIdx + 1);

          const leftV1 = convertBlockNoteToV1Blocks(
            leftBlocks as CustomBlockNoteBlock[],
          );
          const rightV1 = convertBlockNoteToV1Blocks(
            rightBlocks as CustomBlockNoteBlock[],
          );

          const leftOverflow = measureHtml(blocksToHtml(leftV1), defaultBudget);
          const rightOverflow = measureHtml(
            blocksToHtml(rightV1),
            defaultBudget,
          );

          if (leftOverflow || rightOverflow) {
            overflows.add(colBreakId);
            overflows.add(chunk.breakId);
          }
        } else {
          // No column-break: content auto-splits at midpoint, measure full block at half width
          const html = blocksToHtml(v1Blocks);
          if (measureHtml(html, defaultBudget)) {
            overflows.add(chunk.breakId);
          }
        }

        container.style.width = "896px";
      } else {
        // Standard single-column slide
        const html = blocksToHtml(v1Blocks);
        if (measureHtml(html, defaultBudget)) {
          overflows.add(chunk.breakId);
        }
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
