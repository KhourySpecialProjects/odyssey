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
import type { ReviewAnchor, ReviewComment } from "@/types";
import { cn } from "@/lib/utils";
import { anchorIn, type PopoverAnchor } from "@/lib/selection";
import {
  commentSnippet,
  isResolved,
  markIdFor,
  type TagBlock,
} from "@/lib/review-comments";
import type { CommentOutcome } from "@/hooks/use-review-comments";
import { CommentCard } from "./comment-card";
import { SpotQuote } from "./comment-about";
import {
  commentMarkAt,
  measureBlocks,
  measureTags,
  type BlockBox,
  type TagBox,
} from "./comment-layer";
import {
  CommentOutline,
  CommentTag,
  TAG_MAX,
  tagLabel,
  tagSpace,
  type TagMode,
} from "./comment-tag";

type Layout = {
  blocks: BlockBox[];
  tags: TagBox[];
  tagLeft: number;
  room: number;
  tagMode: TagMode;
};

type OpenCard = {
  commentId: number;
  position: PopoverAnchor;
  /** Opened from its tag, so it takes focus; from the text, the caret stays */
  focus: boolean;
};

interface FeedbackLayerProps {
  enabled: boolean;
  /** The sent comments here, numbered; outdated ones get no tag */
  comments: readonly ReviewComment[];
  numbers: ReadonlyMap<number, number>;
  outdatedIds: ReadonlySet<number>;
  /** The block a whole-block comment is on, for its tag */
  blockFor: (blockId: string) => TagBlock | undefined;
  /** How many blocks a comment across blocks spans, for its tag */
  blocksFor?: (anchor: ReviewAnchor) => number;
  /** "Round 1 · sent 28 Oct", for each card */
  meta: ReactNode;
  /** Absent once the feedback can't change (the draft is back in review) */
  onAddress?: (id: number, addressed: boolean) => Promise<CommentOutcome>;
  /** The mark lit by hovering it or its tag */
  litMarkId: string | null;
  onLitChange: (markId: string | null) => void;
  children: ReactNode;
}

/**
 * The feedback a reviewer sent, beside the editor its creator works in
 * (ODY-807). The editor draws the marks; this adds their numbered tags in the
 * right margin, as the reviewer's comment layer does, and a comment's card,
 * from its tag or from a click on its mark. The click still puts the caret
 * where it was clicked: nothing here stops an edit, and the card opened from
 * the text doesn't take focus.
 */
export function FeedbackLayer({
  enabled,
  comments,
  numbers,
  outdatedIds,
  blockFor,
  blocksFor,
  meta,
  onAddress,
  litMarkId,
  onLitChange,
  children,
}: FeedbackLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [layout, setLayout] = useState<Layout>({
    blocks: [],
    tags: [],
    tagLeft: 0,
    room: TAG_MAX,
    tagMode: "full",
  });
  const [card, setCard] = useState<OpenCard | null>(null);

  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const outdatedRef = useRef(outdatedIds);
  outdatedRef.current = outdatedIds;
  const numbersRef = useRef(numbers);
  numbersRef.current = numbers;
  const blockForRef = useRef(blockFor);
  blockForRef.current = blockFor;

  // The tags follow the editor as it renders, reflows and is edited
  const measure = useCallback(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;
    const rootRect = root.getBoundingClientRect();
    setLayout({
      blocks: measureBlocks(root, content, blockForRef.current),
      tags: measureTags(
        root,
        content,
        commentsRef.current,
        numbersRef.current,
        outdatedRef.current,
        -Infinity,
      ),
      ...tagSpace(rootRect, content.getBoundingClientRect()),
    });
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!enabled || !content) {
      setLayout((current) => ({ ...current, blocks: [], tags: [] }));
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

  useLayoutEffect(() => {
    if (enabled) measure();
  }, [enabled, comments, numbers, outdatedIds, measure]);

  const cardRef = useRef(card);
  cardRef.current = card;
  const closeCard = useCallback((commentId?: number) => {
    const open = cardRef.current;
    if (!open || (commentId !== undefined && open.commentId !== commentId)) {
      return;
    }
    setCard(null);
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (open.focus && target?.isConnected) target.focus();
  }, []);

  useEffect(() => {
    if (!enabled) setCard(null);
  }, [enabled]);

  // A card whose comment has gone (its text was edited away) closes
  useEffect(() => {
    if (card && !comments.some((c) => c.id === card.commentId)) setCard(null);
  }, [card, comments]);

  const onClick = (e: React.MouseEvent) => {
    const root = rootRef.current;
    const selection = window.getSelection();
    if (!root || (selection && !selection.isCollapsed)) return;
    const found = commentMarkAt(contentRef.current, e.target, comments);
    if (!found) return;
    returnFocusRef.current = null;
    setCard({
      commentId: found.comment.id,
      position: anchorIn(root, found.mark.getBoundingClientRect()),
      focus: false,
    });
  };

  const onMouseOver = (e: React.MouseEvent) => {
    const id = commentMarkAt(contentRef.current, e.target, comments)?.id;
    if ((id ?? null) !== litMarkId) onLitChange(id ?? null);
  };

  const litComment = comments.find((c) => markIdFor(c) === litMarkId);
  const litBlocks =
    litComment && !("quote" in litComment.anchor)
      ? layout.blocks.filter((b) => b.blockId === litComment.anchor.blockId)
      : [];
  const cardComment = card && comments.find((c) => c.id === card.commentId);
  const about = (comment: ReviewComment, length: number, long: boolean) => {
    const { anchor } = comment;
    if ("quote" in anchor && anchor.point) {
      return <SpotQuote anchor={anchor} length={length} />;
    }
    return commentSnippet(
      comment,
      anchor.blockId ? blockFor(anchor.blockId) : undefined,
      { long, blocks: blocksFor?.(anchor) },
    );
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative",
        enabled && layout.tagMode === "tight" && "pr-10",
      )}
    >
      {enabled &&
        litBlocks.map((box) => (
          <CommentOutline
            key={`outline-${box.blockId}`}
            box={box}
            target={false}
          />
        ))}
      <div
        ref={contentRef}
        onClick={enabled ? onClick : undefined}
        onMouseOver={enabled ? onMouseOver : undefined}
        onMouseLeave={enabled ? () => onLitChange(null) : undefined}
      >
        {children}
      </div>
      {enabled &&
        layout.tags.map((tag) => {
          const comment = comments.find((c) => c.id === tag.commentId);
          if (!comment) return null;
          const number = numbers.get(comment.id) ?? null;
          const markId = markIdFor(comment);
          return (
            <CommentTag
              key={comment.id}
              number={number}
              pending={false}
              resolved={isResolved(comment)}
              lit={litMarkId === markId || card?.commentId === comment.id}
              expanded={card?.commentId === comment.id}
              mode={layout.tagMode}
              top={tag.top}
              left={layout.tagLeft}
              room={layout.room}
              label={tagLabel(
                number,
                false,
                commentSnippet(
                  comment,
                  comment.anchor.blockId
                    ? blockFor(comment.anchor.blockId)
                    : undefined,
                  { long: true, blocks: blocksFor?.(comment.anchor) },
                ),
              )}
              onLight={(on) => onLitChange(on ? markId : null)}
              onOpen={(rect) => {
                const root = rootRef.current;
                if (!root) return;
                returnFocusRef.current =
                  document.activeElement as HTMLElement | null;
                setCard({
                  commentId: comment.id,
                  position: anchorIn(root, rect),
                  focus: true,
                });
              }}
            >
              {about(comment, 10, false)}
            </CommentTag>
          );
        })}
      {card && cardComment && (
        <CommentCard
          key={cardComment.id}
          comment={cardComment}
          number={numbers.get(cardComment.id) ?? null}
          about={about(cardComment, 30, true)}
          anchor={card.position}
          canChange={false}
          focusOnOpen={card.focus}
          meta={meta}
          onEdit={refused}
          onDelete={refused}
          onResolve={refused}
          onAddress={
            onAddress &&
            (async (addressed) => {
              const outcome = await onAddress(cardComment.id, addressed);
              if (!outcome.ok && outcome.error === "review_closed") {
                toast.info("This feedback can't change now.", {
                  id: "feedback-closed",
                });
              }
              return outcome;
            })
          }
          onClose={() => closeCard(cardComment.id)}
        />
      )}
    </div>
  );
}

// A creator never edits, deletes or resolves a reviewer's comment
const refused = async (): Promise<CommentOutcome> => ({
  ok: false,
  error: "forbidden",
});
