"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { IconMessage } from "@tabler/icons-react";
import type { ReviewAnchor, ReviewComment, ReviewCommentField } from "@/types";
import { cn } from "@/lib/utils";
import { createAnchor, pointAnchor } from "@/lib/anchors/create";
import { blockContentOf } from "@/lib/anchors/dom";
import { toReviewAnchor } from "@/lib/validations/review";
import {
  anchorIn,
  readSelection,
  useSelectionChange,
  type PopoverAnchor,
} from "@/lib/selection";
import {
  DRAFT_MARK_ID,
  blockLabel,
  carriedMeta,
  carriedNotes,
  commentSnippet,
  isResolved,
  markIdFor,
  type TagBlock,
} from "@/lib/review-comments";
import {
  caretUnits,
  stopAt,
  stopBox,
  stopText,
  stopsOf,
  unitOf,
  wordJump,
  type CaretStop,
  type CaretUnit,
} from "@/lib/review-caret";
import { useCommentCaret } from "@/hooks/use-comment-caret";
import type { CommentOutcome } from "@/hooks/use-review-comments";
import { CommentComposer } from "./comment-composer";
import { CommentCard } from "./comment-card";
import { SpotQuote } from "./comment-about";
import { useKeyboardLayer } from "./comment-keyboard";
import {
  CommentOutline,
  CommentTag,
  TAG_MAX,
  TagFloorContext,
  stackTags,
  tagLabel,
  tagSpace,
  type TagMode,
} from "./comment-tag";

// A block in the BlockNote editor; blockContentOf finds its own content
const BLOCK = '[data-node-type="blockContainer"][data-id]';
const MARK = '[data-anchor-id^="comment-"]';
const SNIPPET = 60;
// The tags' height, for centring one on its line
const TAG_HEIGHT = 26;
// The block bars sit this far left of a block's text
const BAR_OFFSET = 26;
// Marks within this many px of each other are on one line
const LINE = 8;
// A pointer that moves less than this after a click hasn't moved on
const HUSH_PX = 8;

export type BlockBox = {
  blockId: string;
  type?: string;
  top: number;
  height: number;
  left: number;
  width: number;
  snippet: string;
};

export type TagBox = { commentId: number; top: number; markTop: number };

type Layout = {
  blocks: BlockBox[];
  tags: TagBox[];
  /** Where tags go, in px from the layer's left */
  tagLeft: number;
  room: number;
  tagMode: TagMode;
  /** No room left of the text for the "Whole paragraph" label */
  narrow: boolean;
};

type Draft = {
  anchor: ReviewAnchor;
  title: ReactNode;
  label: string;
  position: PopoverAnchor;
  pointAt: number | null;
  /** The blocks outlined, for a comment on whole blocks */
  blocks?: BlockBox[];
};

type OpenCard = { commentId: number; position: PopoverAnchor };

// The block the pointer takes whole (its bar, or Alt); the caret itself is
// moved without state
type Hover = { kind: "block"; blockId: string } | null;

type KeyboardPosition = { unit: number; stop: number; through: number };

const MESSAGES: Record<string, string> = {
  review_closed: "This review has been sent, so it can't take new comments.",
  not_in_review: "This droplet is no longer in review.",
  forbidden: "You can't comment on this droplet.",
  invalid_input:
    "This comment couldn't be saved. Try selecting the text again.",
};

/** What the composer says when a comment didn't save */
export const postFailure = (error: string) =>
  MESSAGES[error] ?? "Couldn't save your comment. Try again.";

const WHOLE: Record<string, string> = {
  Paragraph: "paragraph",
  Heading: "heading",
  "List item": "list item",
  Table: "table",
  Callout: "callout",
  Image: "image",
  Equation: "equation",
  Code: "code block",
  "Check-in": "check-in",
};
const wholeName = (type: string | undefined) =>
  WHOLE[blockLabel(type)] ?? "block";

const shorten = (text: string, length = SNIPPET) => {
  const flat = text.replace(/\s*\n\s*/g, " ");
  return flat.length > length
    ? `${flat.slice(0, length - 1).trimEnd()}…`
    : flat;
};

// A block's first line of text, for a tag with no mark of its own
const blockIn = (content: Element, blockId: string) => {
  const block = content.querySelector(
    `${BLOCK}[data-id="${CSS.escape(blockId)}"]`,
  );
  return block && blockContentOf(block);
};
const blockLineIn = (content: Element, blockId: string) => {
  const block = blockIn(content, blockId);
  return block?.querySelector(".bn-inline-content") ?? block;
};

/** Each block, measured relative to `root` */
export function measureBlocks(
  root: Element,
  content: Element,
  blockFor: (blockId: string) => TagBlock | undefined,
): BlockBox[] {
  const rootRect = root.getBoundingClientRect();
  return Array.from(content.querySelectorAll<HTMLElement>(BLOCK)).flatMap(
    (block) => {
      const text = blockContentOf(block);
      if (!text) return [];
      const blockId = block.getAttribute("data-id")!;
      const rect = text.getBoundingClientRect();
      const type = blockFor(blockId)?.type;
      const words = text.textContent?.trim();
      return [
        {
          blockId,
          type,
          top: rect.top - rootRect.top,
          height: rect.height,
          left: rect.left - rootRect.left,
          width: rect.width,
          snippet: words ? shorten(words, 40) : blockLabel(type),
        },
      ];
    },
  );
}

/**
 * Where each comment's tag goes: centred on its mark's line, or on its
 * block's first line when it has no mark (a whole block). Tags are stacked so
 * none overlap, in reading order, from `floor` down.
 */
export function measureTags(
  root: Element,
  content: Element,
  comments: readonly ReviewComment[],
  numbers: ReadonlyMap<number, number>,
  outdated: ReadonlySet<number>,
  floor: number,
): TagBox[] {
  const rootTop = root.getBoundingClientRect().top;
  const placed = comments.flatMap((comment) => {
    if (outdated.has(comment.id)) return [];
    const el =
      content.querySelector(
        `[data-anchor-id="${CSS.escape(markIdFor(comment))}"]:not(.anchor-caret)`,
      ) ??
      (comment.anchor.blockId
        ? blockLineIn(content, comment.anchor.blockId)
        : null);
    if (!el) return [];
    const rect = el.getBoundingClientRect();
    const lineHeight = Math.min(rect.height, 32);
    const markTop = rect.top - rootTop + lineHeight / 2 - TAG_HEIGHT / 2;
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
  return stackTags(placed, floor).map(({ commentId, top, markTop }) => ({
    commentId,
    top,
    markTop,
  }));
}

/**
 * The comment whose mark is at `target` in `content`. Marks nest where
 * comments overlap, and which span is innermost is up to the editor. So every
 * mark around the point counts, and an open comment on words wins over an
 * open whole block, which wins over a resolved one.
 */
export function commentMarkAt(
  content: Element | null,
  target: EventTarget,
  comments: readonly ReviewComment[],
) {
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
  /** How many blocks a comment across blocks spans, for its tag */
  blocksFor?: (anchor: ReviewAnchor) => number;
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
 * The reviewer's comment layer (ODY-806), as the redesign prototype has it
 * (ui-redesign/comments.js). In Comment mode the pointer stays an arrow and a
 * drawn caret follows it between letters: a click comments at that spot,
 * a drag on the words dragged across (in BlockNote, across blocks too), and
 * Alt-click or the bar left of a block on the whole block. Numbered tags in
 * the right margin open each comment's card, and hovering a tag or its mark
 * lights the other. "Comment with the keyboard" reaches the same places.
 * Nothing here edits the editor's DOM; marks are drawn by the editor's
 * anchors plugin, or by ReviewTextView.
 */
export function CommentLayer({
  enabled,
  field,
  comments,
  numbers,
  outdatedIds,
  blockFor,
  blocksFor,
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
  const caretRef = useRef<HTMLSpanElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [layout, setLayout] = useState<Layout>({
    blocks: [],
    tags: [],
    tagLeft: 0,
    room: TAG_MAX,
    tagMode: "full",
    narrow: false,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [card, setCard] = useState<OpenCard | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [selectionButton, setSelectionButton] = useState<{
    anchor: ReviewAnchor;
    rect: DOMRect;
    position: PopoverAnchor;
  } | null>(null);
  const [keyboard, setKeyboard] = useState<KeyboardPosition | null>(null);
  const { show: showCaret, press } = useCommentCaret(caretRef);

  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const outdatedRef = useRef(outdatedIds);
  outdatedRef.current = outdatedIds;
  const numbersRef = useRef(numbers);
  numbersRef.current = numbers;
  const blockForRef = useRef(blockFor);
  blockForRef.current = blockFor;
  const tagFloor = useContext(TagFloorContext);
  const tagFloorRef = useRef(tagFloor);
  tagFloorRef.current = tagFloor;
  // The caret's units, read again whenever the content changes
  const unitsRef = useRef<CaretUnit[] | null>(null);
  const units = useCallback(() => {
    const content = contentRef.current;
    if (!content) return [];
    unitsRef.current ??= caretUnits(content);
    return unitsRef.current;
  }, []);
  const pointer = useRef({
    pressing: false,
    dragged: false,
    frame: 0,
    hush: null as { x: number; y: number } | null,
    stop: null as CaretStop | null,
    written: false,
  });
  const keyboardRef = useRef(keyboard);
  keyboardRef.current = keyboard;

  // The editor renders late, reflows and redraws marks, so the bars and tags
  // follow it
  const measure = useCallback(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;
    unitsRef.current = null;
    const rootRect = root.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const blocks = measureBlocks(root, content, blockForRef.current);
    const left = blocks.length
      ? Math.min(...blocks.map((b) => b.left))
      : contentRect.left - rootRect.left;
    const floor = tagFloorRef.current
      ? tagFloorRef.current() - rootRect.top
      : -Infinity;
    setLayout({
      blocks,
      tags: measureTags(
        root,
        content,
        commentsRef.current,
        numbersRef.current,
        outdatedRef.current,
        floor,
      ),
      ...tagSpace(rootRect, contentRect),
      narrow: rootRect.left + left < 150,
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
      unitsRef.current = null;
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

  // New, resolved or deleted comments move tags without any DOM change, and
  // so do the tags of the section this text is in
  useLayoutEffect(() => {
    if (enabled) measure();
  }, [enabled, comments, numbers, outdatedIds, tagFloor, measure]);

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

  const openDraft = useCallback(
    (next: Draft) => {
      remember();
      setCard(null);
      setSelectionButton(null);
      pointer.current.written = false;
      setDraft(next);
      // Whole blocks are outlined here rather than marked in the text
      onDraftChange(next.blocks ? null : next.anchor);
    },
    [onDraftChange],
  );

  const closeDraft = useCallback(
    ({ restore = true }: { restore?: boolean } = {}) => {
      setDraft(null);
      pointer.current.written = false;
      onDraftChange(null);
      if (restore) restoreFocus();
      else returnFocusRef.current = null;
    },
    [onDraftChange],
  );

  const openCard = (commentId: number, position: PopoverAnchor) => {
    remember();
    setDraft(null);
    onDraftChange(null);
    setCard({ commentId, position });
  };

  const cardRef = useRef(card);
  cardRef.current = card;
  // Only that comment's card: a Resolve or Delete that returns late mustn't
  // close a card opened since
  const closeCard = useCallback((commentId?: number) => {
    const open = cardRef.current;
    if (!open || (commentId !== undefined && open.commentId !== commentId)) {
      return;
    }
    setCard(null);
    restoreFocus();
  }, []);

  // Turn off cleanly when the layer is hidden (Read or Edit mode)
  useEffect(() => {
    if (enabled) return;
    if (draft) closeDraft();
    if (card) closeCard();
    setHover(null);
    setSelectionButton(null);
    showCaret(null);
  }, [enabled, draft, card, closeDraft, closeCard, showCaret]);

  /** A half-written comment isn't thrown away by a click elsewhere */
  const holdDraft = () => {
    if (!draft || !pointer.current.written) return false;
    document
      .querySelector<HTMLTextAreaElement>("[data-comment-composer] textarea")
      ?.focus();
    toast.info("Post or cancel this comment first.", { id: "comment-hold" });
    return true;
  };

  const rectIn = (rect: { top: number; bottom: number; left: number }) => {
    const rootRect = rootRef.current!.getBoundingClientRect();
    return {
      top: rect.top - rootRect.top,
      bottom: rect.bottom - rootRect.top,
      left: rect.left - rootRect.left,
    };
  };

  // ---- Making a comment ---------------------------------------------------

  const openWords = (
    anchor: Extract<ReviewAnchor, { quote: string }>,
    range: Range,
  ) => {
    const root = rootRef.current;
    if (!root) return;
    const rects = Array.from(range.getClientRects()).filter((r) => r.width);
    // Under the line the selection ends on, its notch at that line's start
    const last = rects[rects.length - 1] ?? range.getBoundingClientRect();
    const at = rectIn(last);
    const title = `Comment on “${shorten(anchor.quote)}”`;
    openDraft({
      anchor,
      title,
      label: title,
      position: { ...at, centerX: at.left + last.width / 2 },
      pointAt: at.left + Math.min(last.width / 2, 24),
    });
  };

  const openSpot = (stop: CaretStop) => {
    const all = units();
    const unit = all[stop.unit];
    if (!unit) return;
    const made = pointAnchor(
      unit.map.text,
      stop.i,
      stop.side,
      { field, ...(unit.blockId && { blockId: unit.blockId }) },
      unit.map.breaks,
    );
    const anchor = made && toReviewAnchor(made);
    if (!anchor || !("quote" in anchor)) {
      if (unit.blockId) openBlocks([unit.blockId]);
      return;
    }
    const box = stopBox(all, stop);
    if (!box) return;
    const at = rectIn({
      top: box.top,
      bottom: box.top + box.height,
      left: box.x,
    });
    openDraft({
      anchor,
      title: (
        <>
          Comment at <SpotQuote anchor={anchor} length={24} draft />
        </>
      ),
      label: `Comment at ${commentSnippet({ anchor } as ReviewComment, undefined, { long: true })}`,
      position: { ...at, centerX: at.left },
      pointAt: at.left,
    });
  };

  const openBlocks = (blockIds: string[]) => {
    const boxes = blockIds
      .map((id) => layout.blocks.find((b) => b.blockId === id))
      .filter((b): b is BlockBox => !!b);
    const content = contentRef.current;
    if (boxes.length === 0 || !content) return;
    let anchor: ReviewAnchor | null;
    if (boxes.length === 1) {
      anchor = toReviewAnchor(
        createAnchor({ blockId: boxes[0].blockId }, { field })!,
      );
    } else {
      // Several whole blocks: their text from the first's start to the last's end
      const first = blockIn(content, boxes[0].blockId);
      const last = blockIn(content, boxes[boxes.length - 1].blockId);
      if (!first || !last) return;
      const range = new Range();
      range.setStart(first, 0);
      range.setEnd(last, last.childNodes.length);
      const made = createAnchor(range, { field, root: content });
      anchor = made && toReviewAnchor(made);
    }
    if (!anchor) return;
    const top = boxes[0];
    const bottom = boxes[boxes.length - 1];
    const name =
      boxes.length === 1
        ? `this ${wholeName(top.type)}`
        : `these ${boxes.length} blocks`;
    const title = `Comment on ${name}`;
    openDraft({
      anchor,
      title,
      label: title,
      position: {
        top: top.top,
        bottom: bottom.top + bottom.height,
        centerX: top.left + top.width / 2,
      },
      pointAt: null,
      blocks: boxes,
    });
  };

  /** A selection inside the content: a drag opens the composer at once */
  const checkSelection = (dragged: boolean) => {
    const content = contentRef.current;
    if (!content || draft) return;
    const selection = readSelection(content);
    if (selection.kind !== "inside") {
      setSelectionButton(null);
      return;
    }
    const made = createAnchor(selection.range, { field, root: content });
    if (!made) return;
    const anchor = toReviewAnchor(made);
    // In a block with no saved text (an image, code), a drag takes the block
    if (anchor && !("quote" in anchor)) {
      setSelectionButton(null);
      if (dragged && anchor.blockId) {
        window.getSelection()?.removeAllRanges();
        openBlocks([anchor.blockId]);
      }
      return;
    }
    if (!anchor) {
      toast.info("That selection is too long to comment on. Select less.", {
        id: "comment-selection",
      });
      return;
    }
    if (dragged) {
      const range = selection.range.cloneRange();
      window.getSelection()?.removeAllRanges();
      openWords(anchor, range);
      return;
    }
    const rect = selection.range.getBoundingClientRect();
    setSelectionButton({
      anchor,
      rect,
      position: anchorIn(rootRef.current!, rect),
    });
  };

  // A selection made without the pointer (Shift+arrows, a long-press) shows
  // a Comment button; a drag is handled when the pointer comes up
  useSelectionChange(() => {
    if (pointer.current.pressing) return;
    checkSelection(false);
  }, enabled && !draft);

  useEffect(() => {
    if (!enabled) return;
    const release = () => {
      press(false);
      if (!pointer.current.pressing) return;
      pointer.current.pressing = false;
      // After the click this pointer-up makes, which a drag ignores
      setTimeout(() => {
        const content = contentRef.current;
        if (!content) return;
        const selection = readSelection(content);
        if (selection.kind === "inside") {
          pointer.current.dragged = true;
          checkSelection(true);
        }
      }, 0);
    };
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    return () => {
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
    };
  });

  // A press outside the layer closes an empty composer
  useEffect(() => {
    if (!draft) return;
    const handle = (e: PointerEvent) => {
      const target = e.target as Element;
      if (target.closest?.("[data-comment-composer]")) return;
      if (rootRef.current?.contains(target)) return;
      if (!pointer.current.written) closeDraft({ restore: false });
    };
    document.addEventListener("pointerdown", handle, true);
    return () => document.removeEventListener("pointerdown", handle, true);
  }, [draft, closeDraft]);

  const post = async (body: string): Promise<string | null> => {
    if (!draft) return null;
    const outcome = await onPost(draft.anchor, body);
    if (!outcome.ok) {
      return postFailure(outcome.error);
    }
    toast.success("Comment saved");
    closeDraft();
    return null;
  };

  // ---- Marks ----------------------------------------------------------------

  const markAt = (target: EventTarget) =>
    commentMarkAt(contentRef.current, target, comments);

  // ---- The pointer ----------------------------------------------------------

  const caretBoxFor = (stop: CaretStop | null) => {
    const root = rootRef.current;
    if (!stop || !root) return null;
    const box = stopBox(units(), stop);
    if (!box) return null;
    const rootRect = root.getBoundingClientRect();
    return {
      x: box.x - rootRect.left,
      top: box.top - rootRect.top,
      height: box.height,
    };
  };

  const keyboardStop = () => {
    const k = keyboardRef.current;
    if (!k || k.stop < 0) return null;
    return stopsOf(units(), k.unit)[k.stop] ?? null;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!enabled) return;
    const event = {
      target: e.target as Element,
      x: e.clientX,
      y: e.clientY,
      alt: e.altKey,
      held: !!e.buttons,
    };
    cancelAnimationFrame(pointer.current.frame);
    pointer.current.frame = requestAnimationFrame(() => {
      const p = pointer.current;
      if (p.hush) {
        if (Math.hypot(event.x - p.hush.x, event.y - p.hush.y) < HUSH_PX) {
          return;
        }
        p.hush = null;
      }
      const leave = () => {
        p.stop = null;
        setHover(null);
        showCaret(caretBoxFor(keyboardStop()));
      };
      // While a drag selects words, the selection is the mark
      if (event.held) return leave();
      // Over a comment's words, a click opens that comment
      if (markAt(event.target)) return leave();
      const all = units();
      const unit = unitOf(all, event.target);
      if (unit === -1) {
        // In the gap between two blocks the caret stays where it was
        const content = contentRef.current;
        if (content?.contains(event.target) && p.stop) return;
        return leave();
      }
      const blockId = all[unit].blockId;
      const stop = event.alt ? null : stopAt(all, event.x, event.y);
      if (!stop) {
        p.stop = null;
        setHover((current) =>
          !blockId
            ? null
            : current?.blockId === blockId
              ? current
              : { kind: "block", blockId },
        );
        showCaret(caretBoxFor(keyboardStop()));
        return;
      }
      p.stop = stop;
      setHover(null);
      showCaret(caretBoxFor(stop));
    });
  };

  const onPointerLeave = () => {
    cancelAnimationFrame(pointer.current.frame);
    pointer.current.stop = null;
    setHover(null);
    showCaret(caretBoxFor(keyboardStop()));
    onLitChange(null);
  };

  const onPointerDown = () => {
    if (!enabled) return;
    pointer.current.pressing = true;
    pointer.current.dragged = false;
    setSelectionButton(null);
    press(true);
    // A press in the lesson starts a new comment, unless one's half written
    if (draft && !pointer.current.written) closeDraft({ restore: false });
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (!enabled) return;
    const target = e.target as Element;
    // In Comment mode a click comments: links and buttons in the text don't act
    if (target.closest?.("a, button, input, label, summary")) {
      e.preventDefault();
    }
    const p = pointer.current;
    if (p.dragged) {
      p.dragged = false;
      return;
    }
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;

    // A half-written comment stays, whatever was clicked
    if (holdDraft()) {
      e.stopPropagation();
      return;
    }
    const found = markAt(target);
    const root = rootRef.current;
    if (found && root) {
      e.stopPropagation();
      openCard(
        found.comment.id,
        anchorIn(root, found.mark.getBoundingClientRect()),
      );
      return;
    }
    const all = units();
    const unit = unitOf(all, target);
    // A click in the gap between blocks drops the comment where the caret waits
    const stop =
      unit === -1
        ? p.stop
        : e.altKey
          ? null
          : stopAt(all, e.clientX, e.clientY) ?? null;
    if (stop) {
      openSpot(stop);
    } else if (unit !== -1 && all[unit].blockId) {
      openBlocks([all[unit].blockId!]);
    } else {
      return;
    }
    p.hush = { x: e.clientX, y: e.clientY };
    p.stop = null;
    setHover(null);
    showCaret(null);
  };

  const handleMouseOver = (e: React.MouseEvent) => {
    const id = markAt(e.target)?.id ?? null;
    if (id !== litMarkId) onLitChange(id);
  };

  // ---- The keyboard -------------------------------------------------------

  const keyboardUnits = () => units();
  useKeyboardLayer(
    {
      root: () => rootRef.current,
      unitCount: () => keyboardUnits().length,
      stopCount: (unit) => stopsOf(keyboardUnits(), unit).length,
      isBlock: (unit) => !!keyboardUnits()[unit]?.blockId,
      wordJump: (unit, stop, direction) =>
        wordJump(
          keyboardUnits(),
          stopsOf(keyboardUnits(), unit),
          stop,
          direction,
        ),
      show: (position) => {
        setKeyboard(position);
        const all = keyboardUnits();
        if (!position) {
          showCaret(caretBoxFor(pointer.current.stop));
          return "";
        }
        const unit = all[position.unit];
        const stops = stopsOf(all, position.unit);
        const stop = position.stop >= 0 ? stops[position.stop] : null;
        unit?.element.scrollIntoView?.({ block: "nearest" });
        showCaret(caretBoxFor(stop));
        if (stop) return `${stopText(all, stop)}. Press Enter to comment here.`;
        const count = Math.abs(position.through - position.unit) + 1;
        if (count > 1) {
          return `${count} blocks. Press Enter to comment on them.`;
        }
        const text = unit
          ? shorten(unit.map.text.slice(unit.from, unit.to), 80)
          : "";
        const box = unit?.blockId
          ? layout.blocks.find((b) => b.blockId === unit.blockId)
          : undefined;
        const kind = box ? blockLabel(box.type) : "Text";
        return `${kind} ${position.unit + 1} of ${all.length}${text ? `: ${text}` : ""}. Press Enter to comment${stops.length ? ", or Right to put the caret in it" : ""}.`;
      },
      comment: (position) => {
        const all = keyboardUnits();
        const stop =
          position.stop >= 0
            ? stopsOf(all, position.unit)[position.stop]
            : null;
        if (stop) return openSpot(stop);
        const [a, z] = [position.unit, position.through].sort((x, y) => x - y);
        const ids = all
          .slice(a, z + 1)
          .map((u) => u.blockId)
          .filter((id): id is string => !!id);
        if (ids.length > 0) return openBlocks(ids);
        // A paragraph of a read-only text: comment on all its words
        const unit = all[position.unit];
        const content = contentRef.current;
        if (!unit || !content) return;
        const range = new Range();
        range.selectNodeContents(unit.element);
        const made = createAnchor(range, { field, root: content });
        const anchor = made && toReviewAnchor(made);
        if (anchor && "quote" in anchor) openWords(anchor, range);
      },
    },
    enabled,
  );

  // ---- Drawing --------------------------------------------------------------

  const cardComment = card && comments.find((c) => c.id === card.commentId);
  const litComment = comments.find((c) => markIdFor(c) === litMarkId);
  const keyboardBlocks = (() => {
    if (!keyboard || keyboard.stop >= 0) return [];
    const all = units();
    const [a, z] = [keyboard.unit, keyboard.through].sort((x, y) => x - y);
    return all
      .slice(a, z + 1)
      .map((u) => layout.blocks.find((b) => b.blockId === u.blockId))
      .filter((b): b is BlockBox => !!b);
  })();
  // Blocks outlined, a run of them as one: the draft's, the keyboard's, the
  // hovered bar's or Alt, or a whole-block comment whose tag is lit
  const around = (boxes: BlockBox[]) => {
    if (boxes.length === 0) return null;
    const top = Math.min(...boxes.map((b) => b.top));
    const left = Math.min(...boxes.map((b) => b.left));
    const bottom = Math.max(...boxes.map((b) => b.top + b.height));
    const right = Math.max(...boxes.map((b) => b.left + b.width));
    return {
      key: boxes.map((b) => b.blockId).join(" "),
      top,
      left,
      width: right - left,
      height: bottom - top,
    };
  };
  const blocksWith = (id: string | undefined) =>
    layout.blocks.filter((b) => b.blockId === id);
  const outlined = [
    { box: around(draft?.blocks ?? []), target: true },
    { box: around(keyboardBlocks), target: false },
    {
      box: around(hover?.kind === "block" ? blocksWith(hover.blockId) : []),
      target: false,
    },
    {
      box: around(
        litComment && !("quote" in litComment.anchor)
          ? blocksWith(litComment.anchor.blockId)
          : [],
      ),
      target: false,
    },
  ].filter(
    (o, i, all): o is { box: NonNullable<typeof o.box>; target: boolean } =>
      !!o.box && all.findIndex((x) => x.box?.key === o.box!.key) === i,
  );
  const labelBlock =
    hover?.kind === "block" && !draft
      ? layout.blocks.find((b) => b.blockId === hover.blockId)
      : keyboardBlocks.length === 1
        ? keyboardBlocks[0]
        : undefined;
  const litBar = (blockId: string) =>
    hover?.kind === "block" && hover.blockId === blockId
      ? true
      : !!draft?.blocks?.some((b) => b.blockId === blockId) ||
        keyboardBlocks.some((b) => b.blockId === blockId);
  const tight = layout.tagMode === "tight";

  return (
    <div ref={rootRef} className={cn("relative", enabled && tight && "pr-10")}>
      {enabled &&
        outlined.map(({ box, target }) => (
          <CommentOutline
            key={`outline-${box.key}`}
            box={box}
            target={target}
          />
        ))}
      {enabled && labelBlock && !layout.narrow && (
        <span
          aria-hidden
          className="pointer-events-none absolute z-10 pt-[3px] text-xs leading-tight font-semibold whitespace-nowrap text-[var(--rc-accent-text)]"
          style={{
            top: labelBlock.top,
            right: `calc(100% - ${labelBlock.left - BAR_OFFSET - 8}px)`,
          }}
        >
          Whole {wholeName(labelBlock.type)}
        </span>
      )}
      {enabled &&
        layout.blocks.map((block) => (
          <button
            key={block.blockId}
            type="button"
            tabIndex={-1}
            aria-hidden
            title={`Comment on this ${wholeName(block.type)}`}
            data-testid="block-bar"
            data-block-id={block.blockId}
            onClick={() => {
              if (holdDraft()) return;
              openBlocks([block.blockId]);
            }}
            onPointerEnter={() =>
              setHover({ kind: "block", blockId: block.blockId })
            }
            onPointerLeave={() => setHover(null)}
            className="group/bar absolute z-10 w-4 cursor-pointer"
            style={{
              top: block.top,
              height: block.height,
              left: block.left - BAR_OFFSET,
            }}
          >
            <span
              className={cn(
                "absolute top-0.5 bottom-0.5 left-[7px] w-0.5 rounded-sm bg-slate-200 transition-[background-color,transform] duration-150 dark:bg-[#223047]",
                litBar(block.blockId) &&
                  "scale-x-[2] bg-[var(--rc-accent)] dark:bg-[var(--rc-accent)]",
                "group-hover/bar:scale-x-[2] group-hover/bar:bg-[var(--rc-accent)]",
              )}
            />
          </button>
        ))}
      <div
        ref={contentRef}
        className={cn(enabled && "rc-commenting")}
        onPointerMove={enabled ? onPointerMove : undefined}
        onPointerLeave={enabled ? onPointerLeave : undefined}
        onPointerDown={enabled ? onPointerDown : undefined}
        onMouseOver={enabled ? handleMouseOver : undefined}
        onClickCapture={enabled ? onClickCapture : undefined}
      >
        {children}
      </div>
      {enabled && <span ref={caretRef} aria-hidden className="rc-caret" />}
      {enabled &&
        layout.tags.map((tag) => {
          const comment = comments.find((c) => c.id === tag.commentId);
          if (!comment) return null;
          const number = numbers.get(comment.id) ?? null;
          const block = comment.anchor.blockId
            ? blockFor(comment.anchor.blockId)
            : undefined;
          const blocks = blocksFor?.(comment.anchor);
          const markId = markIdFor(comment);
          const resolved = isResolved(comment);
          const pending = canChange && !resolved;
          const lit = litMarkId === markId || card?.commentId === comment.id;
          const { anchor } = comment;
          return (
            <CommentTag
              key={comment.id}
              number={number}
              pending={pending}
              resolved={resolved}
              addressed={!!comment.addressedAt}
              lit={lit}
              expanded={card?.commentId === comment.id}
              mode={layout.tagMode}
              top={tag.top}
              left={layout.tagLeft}
              room={layout.room}
              label={tagLabel(
                number,
                pending,
                commentSnippet(comment, block, { long: true, blocks }),
                carriedNotes(comment),
              )}
              onLight={(on) => onLitChange(on ? markId : null)}
              onOpen={(rect) => {
                const root = rootRef.current;
                if (root && !holdDraft()) {
                  openCard(comment.id, anchorIn(root, rect));
                }
              }}
            >
              {"quote" in anchor && anchor.point ? (
                <SpotQuote anchor={anchor} length={10} />
              ) : (
                commentSnippet(comment, block, { blocks })
              )}
            </CommentTag>
          );
        })}
      {enabled && selectionButton && !draft && (
        <button
          type="button"
          aria-label="Comment on the selected text"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            const selection = window.getSelection();
            const range =
              selection && selection.rangeCount > 0
                ? selection.getRangeAt(0).cloneRange()
                : null;
            selection?.removeAllRanges();
            if (range && "quote" in selectionButton.anchor) {
              openWords(selectionButton.anchor, range);
            }
          }}
          className="absolute z-30 inline-flex h-[34px] items-center gap-1.5 rounded-full bg-slate-900 px-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] hover:bg-[var(--rc-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rc-accent)] dark:bg-slate-100 dark:text-slate-900"
          style={{
            left: Math.max(0, selectionButton.position.centerX - 55),
            top:
              selectionButton.position.top - 44 < 0
                ? selectionButton.position.bottom + 8
                : selectionButton.position.top - 44,
          }}
        >
          <IconMessage className="h-3.5 w-3.5" aria-hidden />
          Comment
        </button>
      )}
      {draft && (
        <CommentComposer
          key={JSON.stringify(draft.anchor)}
          number={numbers.size + 1}
          title={draft.title}
          label={draft.label}
          anchor={draft.position}
          pointAt={draft.pointAt}
          onCancel={() => closeDraft()}
          onPost={post}
          onWrittenChange={(written) => (pointer.current.written = written)}
        />
      )}
      {card && cardComment && (
        <CommentCard
          key={cardComment.id}
          comment={cardComment}
          number={numbers.get(cardComment.id) ?? null}
          about={(() => {
            const { anchor } = cardComment;
            if ("quote" in anchor && anchor.point) {
              return <SpotQuote anchor={anchor} length={30} />;
            }
            return commentSnippet(
              cardComment,
              cardComment.anchor.blockId
                ? blockFor(cardComment.anchor.blockId)
                : undefined,
              { long: true, blocks: blocksFor?.(cardComment.anchor) },
            );
          })()}
          anchor={card.position}
          canChange={canChange}
          meta={carriedMeta(cardComment, canChange)}
          onEdit={(body) => onEdit(cardComment.id, body)}
          onDelete={() => onDelete(cardComment.id)}
          onResolve={(resolved) => onResolve(cardComment.id, resolved)}
          onClose={() => closeCard(cardComment.id)}
        />
      )}
    </div>
  );
}
