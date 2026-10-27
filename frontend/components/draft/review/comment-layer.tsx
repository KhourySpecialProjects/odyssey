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
import { IconCheck } from "@tabler/icons-react";
import type { ReviewAnchor, ReviewComment, ReviewCommentField } from "@/types";
import { cn } from "@/lib/utils";
import { createAnchor } from "@/lib/anchors/create";
import { toReviewAnchor } from "@/lib/validations/review";
import {
  anchorIn,
  readSelection,
  useSelectionChange,
  type PopoverAnchor,
} from "@/lib/selection";
import {
  DRAFT_MARK_ID,
  commentSnippet,
  isResolved,
  markIdFor,
  type TagBlock,
} from "@/lib/review-comments";
import type { CommentOutcome } from "@/hooks/use-review-comments";
import { CommentComposer } from "./comment-composer";
import { CommentCard } from "./comment-card";

// A block in the BlockNote editor, and the element holding its own text
const BLOCK = '[data-node-type="blockContainer"][data-id]';
const BLOCK_TEXT = ":scope > .bn-block-content";
const MARK = '[data-anchor-id^="comment-"]';
const SNIPPET = 40;
// A tag's height and the gap kept between stacked tags
const TAG_HEIGHT = 24;
const TAG_GAP = 4;
// Below this much room right of the text, tags show only their number (D8).
// A full tag is at most 140px plus its 12px gap.
const COMPACT_MARGIN = 160;
// Marks within this many px of each other are on one line
const LINE = 8;

type BlockBox = {
  blockId: string;
  top: number;
  height: number;
  left: number;
  width: number;
  snippet: string;
};

type TagBox = { commentId: number; top: number; markTop: number };

type Draft = {
  anchor: ReviewAnchor;
  title: string;
  position: PopoverAnchor;
  /** The block outlined as "Whole paragraph", for a block comment */
  block?: BlockBox;
};

type OpenCard = { commentId: number; position: PopoverAnchor };

const MESSAGES: Record<string, string> = {
  review_closed: "This review has been sent, so it can't take new comments.",
  not_in_review: "This droplet is no longer in review.",
  forbidden: "You can't comment on this droplet.",
  invalid_input:
    "This comment couldn't be saved. Try selecting the text again.",
};

const shorten = (text: string) =>
  text.length > SNIPPET ? `${text.slice(0, SNIPPET - 1).trimEnd()}…` : text;

// A block's first line of text, for a tag with no mark of its own
const blockLineIn = (content: Element, blockId: string) => {
  const block = content.querySelector(
    `${BLOCK}[data-id="${CSS.escape(blockId)}"] > .bn-block-content`,
  );
  return block?.querySelector(".bn-inline-content") ?? block;
};

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

/**
 * Where each comment's tag goes: level with its mark, or with its block when
 * it has no mark (a resolved comment). Tags are stacked so none overlap, in
 * reading order.
 */
function measureTags(
  root: Element,
  content: Element,
  comments: readonly ReviewComment[],
  numbers: ReadonlyMap<number, number>,
  outdated: ReadonlySet<number>,
): TagBox[] {
  const rootTop = root.getBoundingClientRect().top;
  const placed = comments.flatMap((comment) => {
    if (outdated.has(comment.id)) return [];
    const el =
      content.querySelector(
        `[data-anchor-id="${CSS.escape(markIdFor(comment))}"]`,
      ) ??
      (comment.anchor.blockId
        ? blockLineIn(content, comment.anchor.blockId)
        : null);
    if (!el) return [];
    const markTop = el.getBoundingClientRect().top - rootTop;
    return [
      {
        commentId: comment.id,
        top: markTop,
        markTop,
        // On one line, open comments come first, in number order
        order: numbers.get(comment.id) ?? Number.MAX_SAFE_INTEGER,
      },
    ];
  });
  const line = (top: number) => Math.floor(top / LINE);
  placed.sort(
    (a, b) =>
      line(a.markTop) - line(b.markTop) ||
      a.order - b.order ||
      a.commentId - b.commentId,
  );
  let next = -Infinity;
  for (const tag of placed) {
    tag.top = Math.max(tag.markTop, next);
    next = tag.top + TAG_HEIGHT + TAG_GAP;
  }
  return placed.map(({ commentId, top, markTop }) => ({
    commentId,
    top,
    markTop,
  }));
}

interface CommentLayerProps {
  enabled: boolean;
  field: ReviewCommentField;
  /** The reviewer's comments here, numbered; outdated ones get no tag */
  comments: readonly ReviewComment[];
  numbers: ReadonlyMap<number, number>;
  outdatedIds: ReadonlySet<number>;
  /** The block a whole-block comment is on, for its tag */
  blockFor: (blockId: string) => TagBlock | undefined;
  /** Comments change only while the review is open */
  canChange: boolean;
  onPost: (anchor: ReviewAnchor, body: string) => Promise<CommentOutcome>;
  onEdit: (id: number, body: string) => Promise<CommentOutcome>;
  onDelete: (id: number) => Promise<CommentOutcome>;
  onResolve: (id: number, resolved: boolean) => Promise<CommentOutcome>;
  /** The text being commented on, drawn while the composer is open */
  onDraftChange: (anchor: ReviewAnchor | null) => void;
  /** The mark lit by hovering it or its tag */
  litMarkId: string | null;
  onLitChange: (markId: string | null) => void;
  children: ReactNode;
}

/**
 * The reviewer's comment layer on the read-only BlockNote editor (ODY-806,
 * Tasks 5 and 6): a bar in each block's left margin comments on the whole
 * block, selecting text comments on those words, numbered tags in the right
 * margin open each comment's card, and hovering a tag or its mark lights the
 * other. Nothing here edits the editor's DOM; marks are drawn by the
 * editor's anchors plugin.
 */
export function CommentLayer({
  enabled,
  field,
  comments,
  numbers,
  outdatedIds,
  blockFor,
  canChange,
  onPost,
  onEdit,
  onDelete,
  onResolve,
  onDraftChange,
  litMarkId,
  onLitChange,
  children,
}: CommentLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [blocks, setBlocks] = useState<BlockBox[]>([]);
  const [tags, setTags] = useState<TagBox[]>([]);
  const [compact, setCompact] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [card, setCard] = useState<OpenCard | null>(null);
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const outdatedRef = useRef(outdatedIds);
  outdatedRef.current = outdatedIds;
  const numbersRef = useRef(numbers);
  numbersRef.current = numbers;

  // The editor renders late, reflows and redraws marks, so the bars and tags
  // follow it
  const measure = useCallback(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;
    setBlocks(measureBlocks(root, content));
    setTags(
      measureTags(
        root,
        content,
        commentsRef.current,
        numbersRef.current,
        outdatedRef.current,
      ),
    );
    const room = window.innerWidth - root.getBoundingClientRect().right;
    setCompact(room < COMPACT_MARGIN);
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!enabled || !content) {
      setBlocks([]);
      setTags([]);
      return;
    }
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const resize = new ResizeObserver(later);
    resize.observe(content);
    const mutations = new MutationObserver(later);
    mutations.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["data-anchor-id"],
    });
    window.addEventListener("resize", later);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", later);
    };
  }, [enabled, measure]);

  // New, resolved or deleted comments move tags without any DOM change
  useLayoutEffect(() => {
    if (enabled) measure();
  }, [enabled, comments, numbers, outdatedIds, measure]);

  const remember = () => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
  };
  const restoreFocus = () => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target?.isConnected) target.focus();
  };

  const openDraft = useCallback(
    (next: Draft) => {
      remember();
      setCard(null);
      setDraft(next);
      onDraftChange(next.anchor);
    },
    [onDraftChange],
  );

  const closeDraft = useCallback(() => {
    setDraft(null);
    onDraftChange(null);
    restoreFocus();
  }, [onDraftChange]);

  const openCard = (commentId: number, position: PopoverAnchor) => {
    remember();
    setDraft(null);
    onDraftChange(null);
    setCard({ commentId, position });
  };

  const closeCard = useCallback(() => {
    setCard(null);
    restoreFocus();
  }, []);

  // Turn off cleanly when the layer is hidden (Read or Edit mode)
  useEffect(() => {
    if (enabled) return;
    if (draft) closeDraft();
    if (card) closeCard();
  }, [enabled, draft, card, closeDraft, closeCard]);

  // Selecting words, however it was done, opens the composer for them
  useSelectionChange(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content || draft) return;
    const selection = readSelection(content);
    if (selection.kind !== "inside") return;

    // In a Classic lesson, whose blocks have no lasting ids, the anchor is a
    // quote within the whole lesson
    const anchor = createAnchor(selection.range, { field, root: content });
    if (!anchor) return;
    const reviewAnchor = toReviewAnchor(anchor);
    if (!reviewAnchor || !("quote" in reviewAnchor)) {
      toast.info("That selection is too long to comment on. Select less.", {
        id: "comment-selection",
      });
      return;
    }
    openDraft({
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
    openDraft({
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
    closeDraft();
    return null;
  };

  // A mark lights its tag on hover, and opens its card on a click
  // Marks nest where comments overlap, and which span is innermost is up to
  // the editor. So every mark around the point counts, and an open comment
  // on words wins over an open whole block, which wins over a resolved one.
  const markAt = (target: EventTarget) => {
    const content = contentRef.current;
    const found: { mark: Element; comment: ReviewComment }[] = [];
    let mark = (target as Element).closest?.(MARK) ?? null;
    while (mark && content?.contains(mark)) {
      const id = mark.getAttribute("data-anchor-id");
      const comment = comments.find((c) => markIdFor(c) === id);
      if (comment && id !== DRAFT_MARK_ID) found.push({ mark, comment });
      mark = mark.parentElement?.closest(MARK) ?? null;
    }
    const rank = ({ comment }: { comment: ReviewComment }) =>
      isResolved(comment) ? 2 : "quote" in comment.anchor ? 0 : 1;
    const best = found.sort((a, b) => rank(a) - rank(b))[0];
    return best
      ? { mark: best.mark, id: markIdFor(best.comment), comment: best.comment }
      : null;
  };
  const handleMouseOver = (e: React.MouseEvent) => {
    const id = markAt(e.target)?.id ?? null;
    if (id !== litMarkId) onLitChange(id);
  };
  const handleClick = (e: React.MouseEvent) => {
    if (!enabled || !window.getSelection()?.isCollapsed) return;
    const found = markAt(e.target);
    const root = rootRef.current;
    if (!found || !root) return;
    openCard(
      found.comment.id,
      anchorIn(root, found.mark.getBoundingClientRect()),
    );
  };

  const cardComment = card && comments.find((c) => c.id === card.commentId);

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
      <div
        ref={contentRef}
        onMouseOver={enabled ? handleMouseOver : undefined}
        onMouseLeave={enabled ? () => onLitChange(null) : undefined}
        onClick={handleClick}
      >
        {children}
      </div>
      {enabled &&
        tags.map((tag) => {
          const comment = comments.find((c) => c.id === tag.commentId);
          if (!comment) return null;
          const number = numbers.get(comment.id) ?? null;
          const block = comment.anchor.blockId
            ? blockFor(comment.anchor.blockId)
            : undefined;
          const markId = markIdFor(comment);
          const resolved = isResolved(comment);
          const lit = litMarkId === markId;
          return (
            <button
              key={comment.id}
              type="button"
              data-testid="comment-tag"
              aria-label={`${number ? `Comment ${number}` : "Resolved comment"}: ${commentSnippet(comment, block, { long: true })}`}
              onMouseEnter={() => onLitChange(markId)}
              onMouseLeave={() => onLitChange(null)}
              onFocus={() => onLitChange(markId)}
              onBlur={() => onLitChange(null)}
              onClick={(e) => {
                const root = rootRef.current;
                if (root) {
                  openCard(
                    comment.id,
                    anchorIn(root, e.currentTarget.getBoundingClientRect()),
                  );
                }
              }}
              className={cn(
                "group absolute left-full z-10 ml-3 flex h-6 max-w-[140px] items-center gap-1 rounded border px-1.5 text-xs whitespace-nowrap focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:outline-none",
                resolved
                  ? "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                  : canChange
                    ? "border-dashed border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    : "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
                lit && "ring-2 ring-amber-400",
              )}
              style={{ top: tag.top }}
            >
              <span className="font-semibold">
                {number ?? <IconCheck className="h-3 w-3" aria-hidden />}
              </span>
              <span
                className={cn(
                  "truncate",
                  compact &&
                    "hidden group-hover:inline group-focus-visible:inline",
                )}
              >
                {commentSnippet(comment, block)}
              </span>
            </button>
          );
        })}
      {draft && (
        <CommentComposer
          title={draft.title}
          anchor={draft.position}
          onCancel={closeDraft}
          onPost={post}
        />
      )}
      {card && cardComment && (
        <CommentCard
          key={cardComment.id}
          comment={cardComment}
          number={numbers.get(cardComment.id) ?? null}
          about={commentSnippet(
            cardComment,
            cardComment.anchor.blockId
              ? blockFor(cardComment.anchor.blockId)
              : undefined,
            { long: true },
          )}
          anchor={card.position}
          canChange={canChange}
          onEdit={(body) => onEdit(cardComment.id, body)}
          onDelete={() => onDelete(cardComment.id)}
          onResolve={(resolved) => onResolve(cardComment.id, resolved)}
          onClose={closeCard}
        />
      )}
    </div>
  );
}
