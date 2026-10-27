"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { ReviewAnchor, ReviewCommentField } from "@/types";
import { createAnchor } from "@/lib/anchors/create";
import { toReviewAnchor } from "@/lib/validations/review";
import {
  anchorIn,
  readSelection,
  useSelectionChange,
  type PopoverAnchor,
} from "@/lib/selection";
import type { CommentOutcome } from "@/hooks/use-review-comments";
import { CommentComposer } from "./comment-composer";

// A block in the BlockNote editor, and the element holding its own text
const BLOCK = '[data-node-type="blockContainer"][data-id]';
const BLOCK_TEXT = ":scope > .bn-block-content";
const SNIPPET = 40;

type BlockBox = {
  blockId: string;
  top: number;
  height: number;
  left: number;
  width: number;
  snippet: string;
};

type Draft = {
  anchor: ReviewAnchor;
  title: string;
  position: PopoverAnchor;
  /** The block outlined as "Whole paragraph", for a block comment */
  block?: BlockBox;
};

const MESSAGES: Record<string, string> = {
  review_closed: "This review has been sent, so it can't take new comments.",
  not_in_review: "This droplet is no longer in review.",
  forbidden: "You can't comment on this droplet.",
  invalid_input:
    "This comment couldn't be saved. Try selecting the text again.",
};

const shorten = (text: string) =>
  text.length > SNIPPET ? `${text.slice(0, SNIPPET - 1).trimEnd()}…` : text;

/** Each block with text, measured relative to `root` */
function measureBlocks(root: Element, content: Element): BlockBox[] {
  const rootRect = root.getBoundingClientRect();
  return Array.from(content.querySelectorAll<HTMLElement>(BLOCK)).flatMap(
    (block) => {
      const text = block.querySelector(BLOCK_TEXT);
      const words = text?.textContent?.trim();
      if (!text || !words) return [];
      const rect = text.getBoundingClientRect();
      return [
        {
          blockId: block.getAttribute("data-id")!,
          top: rect.top - rootRect.top,
          height: rect.height,
          left: rect.left - rootRect.left,
          width: rect.width,
          snippet: shorten(words),
        },
      ];
    },
  );
}

interface CommentLayerProps {
  enabled: boolean;
  field: ReviewCommentField;
  onPost: (anchor: ReviewAnchor, body: string) => Promise<CommentOutcome>;
  /** The text being commented on, drawn while the composer is open */
  onDraftChange: (anchor: ReviewAnchor | null) => void;
  children: ReactNode;
}

/**
 * Making a comment (ODY-806, Task 5) on the read-only BlockNote editor: a
 * bar in the left margin of each block comments on the whole block, and
 * selecting text comments on those words. Nothing here edits the editor's
 * DOM; the marks are drawn by the editor's anchors plugin.
 */
export function CommentLayer({
  enabled,
  field,
  onPost,
  onDraftChange,
  children,
}: CommentLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [blocks, setBlocks] = useState<BlockBox[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);

  // The editor renders late and reflows, so the bars follow it
  useLayoutEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!enabled || !root || !content) {
      setBlocks([]);
      return;
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setBlocks(measureBlocks(root, content)),
      );
    };
    setBlocks(measureBlocks(root, content));
    const resize = new ResizeObserver(measure);
    resize.observe(content);
    const mutations = new MutationObserver(measure);
    mutations.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [enabled]);

  const open = useCallback(
    (next: Draft) => {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setDraft(next);
      onDraftChange(next.anchor);
    },
    [onDraftChange],
  );

  const close = useCallback(() => {
    setDraft(null);
    onDraftChange(null);
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target?.isConnected) target.focus();
  }, [onDraftChange]);

  // Turn off cleanly when the layer is hidden (Read or Edit mode)
  useEffect(() => {
    if (!enabled && draft) close();
  }, [enabled, draft, close]);

  // Selecting words, however it was done, opens the composer for them
  useSelectionChange(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content || draft) return;
    const selection = readSelection(content);
    if (selection.kind !== "inside") return;

    const anchor = createAnchor(selection.range, { field });
    if (!anchor) return;
    const reviewAnchor = toReviewAnchor(anchor);
    if (!reviewAnchor || !("quote" in reviewAnchor)) {
      toast.info("That selection is too long to comment on. Select less.", {
        id: "comment-selection",
      });
      return;
    }
    open({
      anchor: reviewAnchor,
      title: `Comment on “${shorten(reviewAnchor.quote)}”`,
      position: anchorIn(root, selection.range.getBoundingClientRect()),
    });
  }, enabled && !draft);

  const openBlock = (block: BlockBox) => {
    const anchor = toReviewAnchor(
      createAnchor({ blockId: block.blockId }, { field })!,
    );
    if (!anchor) return;
    open({
      anchor,
      title: "Comment on this paragraph",
      position: {
        top: block.top,
        bottom: block.top + block.height,
        centerX: block.left + block.width / 2,
      },
      block,
    });
  };

  const post = async (body: string): Promise<string | null> => {
    if (!draft) return null;
    const outcome = await onPost(draft.anchor, body);
    if (!outcome.ok) {
      return (
        MESSAGES[outcome.error] ?? "Couldn't save your comment. Try again."
      );
    }
    window.getSelection()?.removeAllRanges();
    toast.success("Comment saved");
    close();
    return null;
  };

  return (
    <div ref={rootRef} className="relative">
      {enabled &&
        blocks.map((block) => (
          <button
            key={block.blockId}
            type="button"
            aria-label={`Comment on this paragraph: ${block.snippet}`}
            title="Comment on this paragraph"
            onClick={() => openBlock(block)}
            className="absolute -left-5 w-1.5 rounded-full bg-slate-200 transition-colors hover:bg-amber-400 focus-visible:bg-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none dark:bg-slate-700 dark:hover:bg-amber-500"
            style={{ top: block.top, height: block.height }}
          />
        ))}
      {draft?.block && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-md border-2 border-amber-400 bg-amber-100/40 dark:bg-amber-500/10"
          style={{
            top: draft.block.top - 4,
            left: draft.block.left - 6,
            width: draft.block.width + 12,
            height: draft.block.height + 8,
          }}
        >
          <span className="absolute -top-3 left-2 rounded bg-amber-400 px-1.5 text-xs font-medium text-amber-950">
            Whole paragraph
          </span>
        </div>
      )}
      <div ref={contentRef}>{children}</div>
      {draft && (
        <CommentComposer
          title={draft.title}
          anchor={draft.position}
          onCancel={close}
          onPost={post}
        />
      )}
    </div>
  );
}
