"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { ReviewAnchor, ReviewComment, ReviewCommentField } from "@/types";
import { cn } from "@/lib/utils";
import { anchorIn, type PopoverAnchor } from "@/lib/selection";
import {
  commentSnippet,
  isResolved,
  markIdFor,
  type TagBlock,
} from "@/lib/review-comments";
import type { CommentOutcome } from "@/hooks/use-review-comments";
import {
  SECTION_BODY_CLASS,
  SECTION_HEADING_CLASS,
} from "@/components/draft/metadata/frozen-overview";
import { CommentComposer } from "./comment-composer";
import { CommentCard } from "./comment-card";
import { postFailure } from "./comment-layer";
import { useKeyboardLayer } from "./comment-keyboard";
import {
  CommentOutline,
  CommentTag,
  TAG_GAP,
  TAG_HEIGHT,
  TAG_MAX,
  TagFloorContext,
  stackTags,
  tagLabel,
  tagSpace,
  type TagMode,
} from "./comment-tag";

type Layout = {
  /** Each comment's tag, stacked down from the heading's line */
  tags: { commentId: number; top: number }[];
  tagLeft: number;
  room: number;
  tagMode: TagMode;
  /** No room left of the heading for the "Whole section" label */
  narrow: boolean;
  heading: { top: number; bottom: number };
  width: number;
  height: number;
};

type OpenCard = { commentId: number; position: PopoverAnchor };

interface SectionCommentsProps {
  field: ReviewCommentField;
  /** The section's heading */
  title: string;
  /** The reviewer's comments on the whole section */
  comments: readonly ReviewComment[];
  /** The Overview's numbers, so a new comment gets the next */
  numbers: ReadonlyMap<number, number>;
  canChange: boolean;
  onPost: (anchor: ReviewAnchor, body: string) => Promise<CommentOutcome>;
  onEdit: (id: number, body: string) => Promise<CommentOutcome>;
  onDelete: (id: number) => Promise<CommentOutcome>;
  onResolve: (id: number, resolved: boolean) => Promise<CommentOutcome>;
  litMarkId: string | null;
  onLitChange: (markId: string | null) => void;
  /**
   * The creator reading sent feedback (ODY-807): the heading takes no new
   * comment, and cards show `meta` and offer `onAddress` when given
   */
  readOnly?: boolean;
  meta?: ReactNode;
  onAddress?: (id: number, addressed: boolean) => Promise<CommentOutcome>;
  /** The section's content, which may have comment layers of its own */
  children: ReactNode;
}

/**
 * An Overview section in Comment mode (ODY-806): its heading takes comments
 * on the whole section. Hovering the heading outlines the section, a click
 * opens the composer under it, and the section's comments are numbered tags
 * on the heading's line, which the tags of the text below stack under.
 * "Comment with the keyboard" stops on the heading too.
 */
export function SectionComments({
  field,
  title,
  comments,
  numbers,
  canChange,
  onPost,
  onEdit,
  onDelete,
  onResolve,
  litMarkId,
  onLitChange,
  readOnly = false,
  meta,
  onAddress,
  children,
}: SectionCommentsProps) {
  const rootRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const writtenRef = useRef(false);
  const [layout, setLayout] = useState<Layout>({
    tags: [],
    tagLeft: 0,
    room: TAG_MAX,
    tagMode: "full",
    narrow: false,
    heading: { top: 0, bottom: 0 },
    width: 0,
    height: 0,
  });
  const [hovered, setHovered] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [card, setCard] = useState<OpenCard | null>(null);
  const block: TagBlock = { type: "section", text: title };

  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const numbersRef = useRef(numbers);
  numbersRef.current = numbers;

  const measure = useCallback(() => {
    const root = rootRef.current;
    const heading = headingRef.current;
    if (!root || !heading) return;
    const rootRect = root.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const top = headingRect.top - rootRect.top;
    const markTop = top + Math.min(headingRect.height, 32) / 2 - TAG_HEIGHT / 2;
    // Open comments first, in number order
    const order = (c: ReviewComment) =>
      numbersRef.current.get(c.id) ?? Number.MAX_SAFE_INTEGER;
    const tags = stackTags(
      [...commentsRef.current]
        .sort((a, b) => order(a) - order(b) || a.id - b.id)
        .map((c) => ({ commentId: c.id, top: markTop, markTop })),
    );
    setLayout({
      tags,
      ...tagSpace(rootRect, rootRect),
      narrow: rootRect.left < 150,
      heading: { top, bottom: headingRect.bottom - rootRect.top },
      width: rootRect.width,
      height: rootRect.height,
    });
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const resize = new ResizeObserver(later);
    resize.observe(root);
    window.addEventListener("resize", later);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("resize", later);
    };
  }, [measure]);

  useLayoutEffect(() => {
    measure();
  }, [comments, numbers, measure]);

  // The text below starts its tags under this section's own
  const last = layout.tags[layout.tags.length - 1];
  const floorBottom = last ? last.top + TAG_HEIGHT + TAG_GAP : null;
  const floor = useMemo(
    () =>
      floorBottom === null
        ? null
        : () =>
            (rootRef.current?.getBoundingClientRect().top ?? 0) + floorBottom,
    [floorBottom],
  );

  const remember = () => {
    const active = document.activeElement as HTMLElement | null;
    if (!active?.closest("[data-comment-composer]")) {
      returnFocusRef.current = active;
    }
  };
  const restoreFocus = () => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target?.isConnected) target.focus();
  };

  /** A half-written comment isn't thrown away by a click elsewhere */
  const holdDraft = () => {
    if (!drafting || !writtenRef.current) return false;
    document
      .querySelector<HTMLTextAreaElement>("[data-comment-composer] textarea")
      ?.focus();
    toast.info("Post or cancel this comment first.", { id: "comment-hold" });
    return true;
  };

  const openDraft = () => {
    if (holdDraft()) return;
    remember();
    setCard(null);
    writtenRef.current = false;
    setDrafting(true);
  };

  const closeDraft = useCallback(({ restore = true } = {}) => {
    setDrafting(false);
    writtenRef.current = false;
    if (restore) restoreFocus();
    else returnFocusRef.current = null;
  }, []);

  // A press anywhere else closes an empty composer
  useEffect(() => {
    if (!drafting) return;
    const handle = (e: PointerEvent) => {
      const target = e.target as Element;
      if (target.closest?.("[data-comment-composer]")) return;
      if (headingRef.current?.contains(target)) return;
      if (!writtenRef.current) closeDraft({ restore: false });
    };
    document.addEventListener("pointerdown", handle, true);
    return () => document.removeEventListener("pointerdown", handle, true);
  }, [drafting, closeDraft]);

  const post = async (body: string): Promise<string | null> => {
    const outcome = await onPost({ v: 1, field }, body);
    if (!outcome.ok) return postFailure(outcome.error);
    toast.success("Comment saved");
    closeDraft();
    return null;
  };

  const cardRef = useRef(card);
  cardRef.current = card;
  // Only that comment's card, as in the comment layer
  const closeCard = useCallback((commentId: number) => {
    if (cardRef.current?.commentId !== commentId) return;
    setCard(null);
    restoreFocus();
  }, []);

  useKeyboardLayer(
    {
      root: () => rootRef.current,
      unitCount: () => 1,
      stopCount: () => 0,
      isBlock: () => false,
      wordJump: (_unit, stop) => stop,
      show: (position) => {
        setKeyboard(!!position);
        if (!position) return "";
        headingRef.current?.scrollIntoView?.({ block: "nearest" });
        return `Section: ${title}. Press Enter to comment on the whole section.`;
      },
      comment: openDraft,
    },
    !readOnly,
  );

  const litComment = comments.find((c) => markIdFor(c) === litMarkId);
  const outlined =
    drafting || keyboard || (hovered && !readOnly) || !!litComment;
  const cardComment = card && comments.find((c) => c.id === card.commentId);
  const name = `Comment on the ${title} section`;

  return (
    <section
      ref={rootRef}
      className="relative w-full"
      data-testid={`overview-section-${field}`}
    >
      {outlined && (
        <CommentOutline
          box={{ top: 0, left: 0, width: layout.width, height: layout.height }}
          target={drafting}
        />
      )}
      {(hovered || keyboard) && !readOnly && !drafting && !layout.narrow && (
        <span
          aria-hidden
          className="pointer-events-none absolute z-10 pt-[7px] text-xs leading-tight font-semibold whitespace-nowrap text-[var(--rc-accent-text)]"
          style={{ top: layout.heading.top, right: "calc(100% + 20px)" }}
        >
          Whole section
        </span>
      )}
      <h2
        ref={headingRef}
        title={readOnly ? undefined : name}
        onClick={readOnly ? undefined : openDraft}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className={cn(
          SECTION_HEADING_CLASS,
          "relative z-10",
          !readOnly && "cursor-pointer",
          layout.tagMode === "tight" && comments.length > 0 && "pr-10",
        )}
      >
        {title}
      </h2>
      <TagFloorContext.Provider value={floor}>
        <div className={SECTION_BODY_CLASS}>{children}</div>
      </TagFloorContext.Provider>
      {layout.tags.map((tag) => {
        const comment = comments.find((c) => c.id === tag.commentId);
        if (!comment) return null;
        const number = numbers.get(comment.id) ?? null;
        const markId = markIdFor(comment);
        const resolved = isResolved(comment);
        const pending = canChange && !resolved;
        return (
          <CommentTag
            key={comment.id}
            number={number}
            pending={pending}
            resolved={resolved}
            lit={litMarkId === markId || card?.commentId === comment.id}
            expanded={card?.commentId === comment.id}
            mode={layout.tagMode}
            top={tag.top}
            left={layout.tagLeft}
            room={layout.room}
            label={tagLabel(
              number,
              pending,
              commentSnippet(comment, block, { long: true }),
            )}
            onLight={(on) => onLitChange(on ? markId : null)}
            onOpen={(rect) => {
              const root = rootRef.current;
              if (!root || holdDraft()) return;
              remember();
              closeDraft({ restore: false });
              setCard({
                commentId: comment.id,
                position: anchorIn(root, rect),
              });
            }}
          >
            {commentSnippet(comment, block)}
          </CommentTag>
        );
      })}
      {drafting && (
        <CommentComposer
          number={numbers.size + 1}
          title={name}
          label={name}
          anchor={{
            top: layout.heading.top,
            bottom: layout.heading.bottom,
            centerX: 0,
          }}
          onCancel={() => closeDraft()}
          onPost={post}
          onWrittenChange={(written) => (writtenRef.current = written)}
        />
      )}
      {card && cardComment && (
        <CommentCard
          key={cardComment.id}
          comment={cardComment}
          number={numbers.get(cardComment.id) ?? null}
          about={commentSnippet(cardComment, block, { long: true })}
          anchor={card.position}
          canChange={canChange}
          onEdit={(body) => onEdit(cardComment.id, body)}
          onDelete={() => onDelete(cardComment.id)}
          onResolve={(resolved) => onResolve(cardComment.id, resolved)}
          onClose={() => closeCard(cardComment.id)}
          meta={meta}
          onAddress={
            onAddress && ((addressed) => onAddress(cardComment.id, addressed))
          }
        />
      )}
    </section>
  );
}
