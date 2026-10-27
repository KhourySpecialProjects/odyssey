"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { POPOVER_GAP, type PopoverAnchor } from "@/lib/selection";

interface CommentComposerProps {
  /** "Comment on this paragraph", or "Comment on “…”" */
  title: string;
  /** Where the commented text is, relative to the composer's parent */
  anchor: PopoverAnchor;
  onCancel: () => void;
  /** Saves the comment; resolves to an error message, or null once saved */
  onPost: (body: string) => Promise<string | null>;
}

const BODY_MAX = 5000;

/**
 * The comment box (ODY-806): a small dialog under the commented text. Focus
 * moves into it; Esc cancels, Ctrl/Cmd+Enter posts. A failed save keeps the
 * text and says why.
 */
export function CommentComposer({
  title,
  anchor,
  onCancel,
  onPost,
}: CommentComposerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placement, setPlacement] = useState({
    left: 0,
    top: anchor.bottom + POPOVER_GAP,
  });

  // Under the commented text, kept inside the parent's width
  useLayoutEffect(() => {
    const composer = ref.current;
    const parent = composer?.parentElement;
    if (!composer || !parent) return;
    const width = composer.offsetWidth;
    setPlacement({
      left: Math.max(
        0,
        Math.min(anchor.centerX - width / 2, parent.clientWidth - width),
      ),
      top: anchor.bottom + POPOVER_GAP,
    });
  }, [anchor]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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
      role="dialog"
      aria-label={title}
      onKeyDown={handleKeyDown}
      className="absolute z-40 w-80 max-w-full rounded-lg border border-[#eaecf0] bg-white p-3 shadow-[0px_4px_6px_-2px_rgba(16,24,40,0.03),0px_12px_16px_-4px_rgba(16,24,40,0.08)] dark:border-slate-700 dark:bg-slate-900"
      style={placement}
    >
      <p className="mb-2 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
        {title}
      </p>
      <textarea
        ref={textareaRef}
        aria-label="Your comment"
        value={body}
        maxLength={BODY_MAX}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write a comment for the author"
        className="w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!canPost}
          onClick={() => void post()}
          className="bg-amber-600 text-white hover:bg-amber-700"
        >
          {saving ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
