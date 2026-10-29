"use client";

import { createContext, type CSSProperties, type ReactNode } from "react";
import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// A tag's height and the gap kept between stacked tags
export const TAG_HEIGHT = 26;
export const TAG_GAP = 4;
// Tags sit TAG_OFFSET right of the text, up to TAG_MAX wide, in the room left in
// the content column. Under SHORT_ROOM they show only a number; under TIGHT_ROOM
// they move inside the text.
const TAG_OFFSET = 18;
export const TAG_MAX = 240;
const SHORT_ROOM = 110;
const TIGHT_ROOM = 44;
const EDGE = 16;

export type TagMode = "full" | "short" | "tight";

/**
 * The right edge tags may reach: the window's, or the content column's when
 * the Reviewer Transcript panel takes the right of `<main>` (ODY-805 D6).
 */
function availableRight(): number {
  const main = document.querySelector<HTMLElement>("main[data-review-panel]");
  if (!main) return window.innerWidth;
  const padding = parseFloat(getComputedStyle(main).paddingRight) || 0;
  return Math.min(
    window.innerWidth,
    main.getBoundingClientRect().right - padding,
  );
}

/** Where a layer's tags go: right of its text, or inside it on a phone */
export function tagSpace(rootRect: DOMRect, contentRect: DOMRect) {
  const limit = availableRight();
  const outside = limit - rootRect.right;
  const tagLeft = contentRect.right - rootRect.left + TAG_OFFSET;
  const room = Math.min(TAG_MAX, limit - EDGE - (rootRect.left + tagLeft));
  const tagMode: TagMode =
    outside < TIGHT_ROOM ? "tight" : room < SHORT_ROOM ? "short" : "full";
  return { tagLeft, room, tagMode };
}

/** Stacks tags down from where each wants to be, so none overlap */
export function stackTags<T extends { top: number; markTop: number }>(
  tags: T[],
  from = -Infinity,
): T[] {
  let next = from;
  for (const tag of tags) {
    tag.top = Math.max(tag.markTop, next);
    next = tag.top + TAG_HEIGHT + TAG_GAP;
  }
  return tags;
}

/**
 * The page y (as getBoundingClientRect gives it) a comment layer's tags
 * start below. An Overview section's own tags sit by its heading, so the tags
 * of the text under it stack below them.
 */
export const TagFloorContext = createContext<(() => number) | null>(null);

/** The outline round a whole block or section, as the prototype draws it */
export function CommentOutline({
  box,
  target,
}: {
  box: { top: number; left: number; width: number; height: number };
  /** The one a comment is being written for */
  target: boolean;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-[5] rounded-md bg-[var(--rc-wash)]"
      style={{
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        boxShadow: "0 0 0 6px var(--rc-wash)",
        outline: `${target ? 3 : 2}px solid var(--rc-accent)`,
        outlineOffset: 6,
      }}
    />
  );
}

interface CommentTagProps {
  /** Its number, or null once resolved */
  number: number | null;
  pending: boolean;
  resolved: boolean;
  /** Its mark is hovered, or its card is open */
  lit: boolean;
  expanded: boolean;
  mode: TagMode;
  top: number;
  left: number;
  room: number;
  /** What a screen reader hears */
  label: string;
  /** What it's about, as shown */
  children: ReactNode;
  onLight: (on: boolean) => void;
  onOpen: (rect: DOMRect) => void;
}

/**
 * A comment's numbered tag in the right margin (ODY-806, as the redesign
 * prototype has it): a white card with its number and a few words. Where the
 * margin is short only the number shows until it's hovered or focused.
 */
export function CommentTag({
  number,
  pending,
  resolved,
  lit,
  expanded,
  mode,
  top,
  left,
  room,
  label,
  children,
  onLight,
  onOpen,
}: CommentTagProps) {
  const tight = mode === "tight";
  const short = mode !== "full";
  const style: CSSProperties = {
    top,
    ...(tight ? { right: 4 } : { left }),
    maxWidth: short ? undefined : Math.max(0, room),
  };
  return (
    <button
      type="button"
      data-testid="comment-tag"
      aria-label={label}
      aria-expanded={expanded}
      onMouseEnter={() => onLight(true)}
      onMouseLeave={() => onLight(false)}
      onFocus={() => onLight(true)}
      onBlur={() => onLight(false)}
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      className={cn(
        "group/tag absolute z-10 inline-flex h-[26px] items-center gap-[7px] rounded-[7px] border bg-white py-0 pr-[9px] pl-[3px] text-xs font-medium whitespace-nowrap text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rc-accent)] dark:bg-[#131c2e] dark:text-slate-300",
        pending
          ? "border-dashed border-[var(--rc-accent)]"
          : "border-slate-200 dark:border-[#223047]",
        resolved && "text-slate-500 dark:text-slate-400",
        lit &&
          "-translate-x-0.5 border-solid border-[var(--rc-accent)] text-slate-900 shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--rc-accent-soft-border)] dark:text-slate-50 dark:shadow-[0_0_0_2px_#0b1220,0_0_0_4px_var(--rc-accent-soft-border)]",
        "hover:-translate-x-0.5 hover:border-[var(--rc-accent)] hover:text-slate-900 dark:hover:text-slate-50",
        short &&
          "px-0.5 hover:z-30 hover:max-w-[240px] hover:pr-[9px] hover:pl-[3px] hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)] focus-visible:z-30 focus-visible:max-w-[240px] focus-visible:pr-[9px] focus-visible:pl-[3px]",
        short && lit && "z-30 max-w-[240px] pr-[9px] pl-[3px]",
      )}
      style={style}
    >
      <span
        className={cn(
          "inline-grid h-5 min-w-5 shrink-0 place-items-center rounded-[5px] px-[5px] text-[11px] font-bold tabular-nums",
          resolved
            ? "bg-slate-200 text-slate-600 dark:bg-[#26324a] dark:text-slate-300"
            : pending
              ? "bg-[var(--rc-accent-soft)] text-[var(--rc-accent-text)]"
              : "bg-[var(--rc-accent)] text-white",
        )}
      >
        {number ?? <IconCheck className="h-3 w-3" aria-hidden />}
      </span>
      <span
        className={cn(
          "min-w-0 truncate leading-none",
          short &&
            !lit &&
            "hidden group-hover/tag:block group-focus-visible/tag:block",
        )}
      >
        {children}
      </span>
    </button>
  );
}

/** "Comment 2, pending: …", or "Resolved comment: …" */
export const tagLabel = (
  number: number | null,
  pending: boolean,
  about: string,
) =>
  `${number ? `Comment ${number}${pending ? ", pending" : ""}` : "Resolved comment"}: ${about}`;
