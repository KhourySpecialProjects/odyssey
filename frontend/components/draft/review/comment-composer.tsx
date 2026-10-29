"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { POPOVER_GAP, type PopoverAnchor } from "@/lib/selection";

interface CommentComposerProps {
  /** The number the comment will get; none for an inline one */
  number?: number;
  /** "Comment on “…”", "Comment at “…‸…”" or "Comment on this paragraph" */
  title?: ReactNode;
  /** The title as text, for the name of the dialog (or group, when inline) */
  label: string;
  /** Where the commented text is, relative to the composer's parent; not for inline */
  anchor?: PopoverAnchor;
  /** The text to start with */
  initialBody?: string;
  /** In the flow of its parent: no anchor, notch or dialog */
  inline?: boolean;
  /** Where its notch points, in px from the parent's left; none for a block */
  pointAt?: number | null;
  onCancel: () => void;
  /** Saves the comment; resolves to an error message, or null once saved */
  onPost: (body: string) => Promise<string | null>;
  /** Tells the layer whether something's been written, so a click keeps it */
  onWrittenChange?: (written: boolean) => void;
}

const BODY_MAX = 5000;
const WIDTH = 360;
const NOTCH = 12;

const isMac = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * The comment box (ODY-806), as the redesign prototype has it: under the
 * commented text with a notch pointing at it, the number it will get, and a
 * hint that it stays private until changes are requested. Focus moves into
 * it; Esc cancels, Ctrl/Cmd+Enter posts. A failed save keeps the text and
 * says why.
 */
export function CommentComposer({
  number,
  title,
  label,
  anchor,
  initialBody = "",
  inline = false,
  pointAt = null,
  onCancel,
  onPost,
  onWrittenChange,
}: CommentComposerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placement, setPlacement] = useState({
    left: 0,
    top: (anchor?.bottom ?? 0) + POPOVER_GAP + 4,
    notch: null as number | null,
  });

  // Under the commented text, kept inside the parent's width
  useLayoutEffect(() => {
    const composer = ref.current;
    const parent = composer?.parentElement;
    if (inline || !anchor || !composer || !parent) return;
    const width = composer.offsetWidth;
    const at = pointAt ?? null;
    const left = Math.max(
      0,
      Math.min(
        at === null ? anchor.centerX - width / 2 : at - 28,
        parent.clientWidth - width,
      ),
    );
    setPlacement({
      left,
      top: anchor.bottom + POPOVER_GAP + 4,
      notch:
        at === null
          ? null
          : Math.max(12, Math.min(at - left - NOTCH / 2, width - 24)),
    });
  }, [anchor, pointAt, inline]);

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
    const composer = ref.current;
    if (
      composer &&
      (inline || composer.getBoundingClientRect().bottom > innerHeight)
    ) {
      composer.scrollIntoView({ block: "nearest" });
    }
  }, [inline]);

  const canPost = body.trim().length > 0 && !saving;

  const post = async () => {
    if (!canPost) return;
    setSaving(true);
    setError(null);
    const failure = await onPost(body.trim());
    // A saved comment closes the composer, which unmounts this
    if (failure) {
      setError(failure);
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void post();
    }
  };

  return (
    <div
      ref={ref}
      role={inline ? "group" : "dialog"}
      aria-label={label}
      data-comment-composer
      onKeyDown={handleKeyDown}
      className={cn(
        "grid max-w-full gap-2 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.12)] dark:border-[#33425c] dark:bg-[#131c2e] dark:text-slate-100 dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
        inline ? "mt-2 w-full" : "rc-pop-in absolute z-40",
      )}
      style={
        inline
          ? undefined
          : {
              width: WIDTH,
              left: placement.left,
              top: placement.top,
              transformOrigin: `${(placement.notch ?? 18) + NOTCH / 2}px 0`,
            }
      }
    >
      {placement.notch !== null && (
        <span
          aria-hidden
          className="absolute -top-[7px] h-3 w-3 rotate-45 rounded-tl-[2px] border-t border-l border-slate-300 bg-white dark:border-[#33425c] dark:bg-[#131c2e]"
          style={{ left: placement.notch }}
        />
      )}
      {number !== undefined && (
        <p className="flex min-w-0 items-center gap-2 font-semibold text-slate-900 dark:text-slate-50">
          <span
            aria-hidden
            className="inline-grid h-5 min-w-[22px] shrink-0 place-items-center rounded-[5px] border-[1.5px] border-dashed border-[var(--rc-accent)] bg-white px-1.5 text-[11px] font-bold text-[var(--rc-accent-text)] tabular-nums dark:bg-[#0b1220]"
          >
            {number}
          </span>
          <span className="min-w-0 truncate">{title}</span>
        </p>
      )}
      <textarea
        ref={textareaRef}
        aria-label="Comment"
        aria-describedby={hintId}
        value={body}
        maxLength={BODY_MAX}
        onChange={(e) => {
          setBody(e.target.value);
          onWrittenChange?.(e.target.value.trim().length > 0);
        }}
        rows={3}
        placeholder="What should change here?"
        className="min-h-[76px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[var(--rc-accent)] focus:ring-2 focus:ring-[var(--rc-accent)]/30 focus:outline-none dark:border-[#33425c] dark:bg-[#0b1220] dark:text-slate-100 dark:placeholder:text-slate-400"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          id={hintId}
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          {isMac() ? "⌘" : "Ctrl"}+Enter to post · only you see it until you
          request changes
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:outline-none dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canPost}
            onClick={() => void post()}
            className="h-8 rounded-md bg-[var(--rc-accent)] px-3 text-sm font-semibold text-white hover:bg-[#255e78] focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 dark:focus-visible:ring-offset-[#131c2e]"
          >
            {saving ? "Posting..." : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
