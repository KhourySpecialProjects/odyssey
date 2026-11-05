"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ReviewComment } from "@/types";
import { anchorIn, type PopoverAnchor } from "@/lib/selection";
import { commentSnippet } from "@/lib/review-comments";
import type { CommentOutcome } from "@/hooks/use-review-comments";
import { unseenReplies } from "@/lib/review-threads";
import { CommentCard } from "./comment-card";
import { useThreadSeen } from "./review-comments-context";
import { SpotQuote } from "./comment-about";
import type { ReplyEdits } from "./comment-thread";

/** What an outdated comment's card does, as the side's layer would (ODY-881) */
export interface OutdatedCard {
  canChange: boolean;
  onEdit: (id: number, body: string) => Promise<CommentOutcome>;
  onDelete: (id: number) => Promise<CommentOutcome>;
  onResolve: (id: number, resolved: boolean) => Promise<CommentOutcome>;
  onAddress?: (id: number, addressed: boolean) => Promise<CommentOutcome>;
  onReply?: (id: number, body: string) => Promise<CommentOutcome>;
  replyEdits?: ReplyEdits;
  /** A reviewer replies only on a comment that was sent before (G18) */
  replyOnCarried?: boolean;
  meta: (comment: ReviewComment) => ReactNode;
  forCreator?: boolean;
}

/** Comments whose text was edited away (ODY-806, D11), listed under the strip; each opens its card. */
export function OutdatedComments({
  comments,
  numbers,
  card,
}: {
  comments: readonly ReviewComment[];
} & (
  | { numbers: ReadonlyMap<number, number>; card: OutdatedCard }
  | { numbers?: ReadonlyMap<number, number>; card?: undefined }
)) {
  const { seen } = useThreadSeen();
  const rootRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());
  const [open, setOpen] = useState<{
    id: number;
    position: PopoverAnchor;
  } | null>(null);

  const escRef = useRef(false);
  const wasOpenRef = useRef(false);
  const openId = open?.id;

  // A card whose comment has gone closes, and stays closed if it returns
  useEffect(() => {
    if (openId !== undefined && !comments.some((c) => c.id === openId)) {
      setOpen(null);
    }
  }, [openId, comments]);

  // Noted before the card's own Esc handler runs, to tell Esc from a click
  useEffect(() => {
    if (openId === undefined) return;
    const note = (e: KeyboardEvent) => {
      escRef.current = e.key === "Escape";
    };
    document.addEventListener("keydown", note, true);
    return () => document.removeEventListener("keydown", note, true);
  }, [openId]);

  if (comments.length === 0) return null;
  const openComment = open && comments.find((c) => c.id === open.id);
  const onAddressCard = card?.onAddress;
  const onReplyCard = card?.onReply;

  // Esc returns focus to the item; a click elsewhere only if focus was lost
  const close = () => {
    const id = open?.id;
    const viaEsc = escRef.current;
    escRef.current = false;
    setOpen(null);
    setTimeout(() => {
      const item = id === undefined ? undefined : itemRefs.current.get(id);
      if (!item?.isConnected) return;
      const active = document.activeElement;
      if (viaEsc || !active || active === document.body) {
        item.focus({ preventScroll: true });
      }
    });
  };

  return (
    <section
      ref={rootRef}
      aria-label="Outdated comments"
      className="relative mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <p className="font-medium text-slate-700 dark:text-slate-200">
        Outdated ({comments.length}): the text{" "}
        {comments.length === 1 ? "it pointed at has" : "they pointed at has"}{" "}
        changed
      </p>
      <ul className="mt-1 space-y-1">
        {comments.map((comment) => {
          const number = numbers?.get(comment.id);
          const replies = comment.replies?.length ?? 0;
          const unseen = unseenReplies(comment, seen).length > 0;
          const content = (
            <>
              <span className="sr-only">
                {number === undefined
                  ? "Resolved comment, outdated: "
                  : `Comment ${number}, outdated: `}
              </span>
              {number !== undefined && (
                <span className="font-semibold" aria-hidden>
                  {number}.{" "}
                </span>
              )}
              {"quote" in comment.anchor && (
                <q className="text-slate-500 italic line-through dark:text-slate-400">
                  {comment.anchor.quote}
                </q>
              )}{" "}
              {comment.body}
              {replies > 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  {" "}
                  · {replies} {replies === 1 ? "reply" : "replies"}
                </span>
              )}
              {unseen && (
                <>
                  <span className="sr-only">, new replies</span>
                  <span
                    aria-hidden
                    data-testid="new-replies-dot"
                    className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle"
                  />
                </>
              )}
            </>
          );
          return (
            <li key={comment.id} className="text-slate-600 dark:text-slate-300">
              {card ? (
                <button
                  type="button"
                  ref={(el) => {
                    if (el) itemRefs.current.set(comment.id, el);
                    else itemRefs.current.delete(comment.id);
                  }}
                  aria-haspopup="dialog"
                  aria-expanded={open?.id === comment.id}
                  onPointerDown={() => {
                    wasOpenRef.current = open?.id === comment.id;
                  }}
                  onClick={(e) => {
                    const root = rootRef.current;
                    if (wasOpenRef.current) {
                      wasOpenRef.current = false;
                      return;
                    }
                    if (!root) return;
                    setOpen({
                      id: comment.id,
                      position: anchorIn(
                        root,
                        e.currentTarget.getBoundingClientRect(),
                      ),
                    });
                  }}
                  className="w-full rounded text-left hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:outline-none dark:hover:bg-slate-700"
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
      {card && open && openComment && (
        <CommentCard
          key={openComment.id}
          comment={openComment}
          number={numbers?.get(openComment.id) ?? null}
          about={
            "quote" in openComment.anchor && openComment.anchor.point ? (
              <SpotQuote anchor={openComment.anchor} length={30} />
            ) : "quote" in openComment.anchor ? (
              openComment.anchor.quote
            ) : (
              commentSnippet(openComment, undefined, { long: true })
            )
          }
          anchor={open.position}
          canChange={card.canChange}
          meta={card.meta(openComment)}
          forCreator={card.forCreator}
          onEdit={(body) => card.onEdit(openComment.id, body)}
          onDelete={() => card.onDelete(openComment.id)}
          onResolve={(resolved) => card.onResolve(openComment.id, resolved)}
          onAddress={
            onAddressCard &&
            ((addressed) => onAddressCard(openComment.id, addressed))
          }
          onReply={
            onReplyCard && (!card.replyOnCarried || openComment.carriedFrom)
              ? (body) => onReplyCard(openComment.id, body)
              : undefined
          }
          replyEdits={card.replyEdits}
          onClose={close}
        />
      )}
    </section>
  );
}
