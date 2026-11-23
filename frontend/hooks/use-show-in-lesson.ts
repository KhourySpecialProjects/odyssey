"use client";

import { useEffect, useRef } from "react";
import { useReviewFocus } from "@/components/draft/review/review-focus-context";

const FLASH_MS = 600;
const GIVE_UP_MS = 2000;
const NO_VIEW_MS = 8000;
const POLL_MS = 50;
// The editor, Classic text or Overview field that holds the marks
const VIEW =
  '.ProseMirror, [data-testid="classic-review-view"], [data-testid^="overview-review-"]';

const reducedMotion = () =>
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const markSpans = (markId: string) =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      `[data-anchor-id="${CSS.escape(markId)}"]:not(.anchor-badge)`,
    ),
  );

const scrollTo = (el: Element) =>
  el.scrollIntoView({
    block: "center",
    behavior: reducedMotion() ? "auto" : "smooth",
  });

/**
 * Answers the panel's Show in lesson on the page that owns the target
 * (ODY-849): to Comment mode, scroll, flash, report. A select only scrolls.
 */
export function useShowInLesson({
  lessonId,
  enabled,
  ready,
  mode,
  onComment,
  isOutdated,
}: {
  lessonId: number | null;
  /** The page shows reviews at all; if not, a request ends at once */
  enabled: boolean;
  /** The page is in Comment mode with its comments loaded */
  ready: boolean;
  mode: string;
  onComment: () => void;
  isOutdated: (markId: string) => boolean;
}) {
  const focus = useReviewFocus();
  const focused = focus?.focused;
  const report = focus?.report;
  const latest = useRef({ onComment, isOutdated });
  latest.current = { onComment, isOutdated };
  const switched = useRef(0);
  const selected = useRef(0);
  const flash = useRef<{
    timer?: ReturnType<typeof setTimeout>;
    spans: HTMLElement[];
  }>({ spans: [] });

  useEffect(() => {
    if (!focused || focused.done || focused.target.lessonId !== lessonId) {
      return;
    }
    const { target, nonce, navigate } = focused;

    if (!enabled) {
      if (navigate) report?.(nonce, "missing");
      return;
    }
    if (!navigate) {
      if (ready && mode === "comment" && selected.current !== nonce) {
        selected.current = nonce;
        const [first] = markSpans(target.markId);
        if (first) scrollTo(first);
      }
      return;
    }
    if (mode !== "comment") {
      if (switched.current !== nonce) {
        switched.current = nonce;
        latest.current.onComment();
      }
      return;
    }
    if (!ready) return;

    if (target.kind === "section") {
      const section = document.querySelector(
        `[data-review-section="${CSS.escape(target.field)}"]`,
      );
      if (section) scrollTo(section);
      report?.(nonce, section ? "shown" : "missing");
      return;
    }

    const started = Date.now();
    let viewSince: number | null = null;
    const attempt = () => {
      if (latest.current.isOutdated(target.markId)) {
        report?.(nonce, "outdated");
        return true;
      }
      const spans = markSpans(target.markId);
      if (spans.length > 0) {
        scrollTo(spans[0]);
        if (!reducedMotion()) {
          // A repeat restarts the flash: clear the old one, reflow, add again
          const f = flash.current;
          clearTimeout(f.timer);
          f.spans.forEach((s) => s.classList.remove("review-mark--flash"));
          void spans[0].offsetWidth;
          spans.forEach((s) => s.classList.add("review-mark--flash"));
          f.spans = spans;
          f.timer = setTimeout(
            () =>
              spans.forEach((s) => s.classList.remove("review-mark--flash")),
            FLASH_MS,
          );
        }
        report?.(nonce, "shown");
        return true;
      }
      const now = Date.now();
      if (viewSince === null && document.querySelector(VIEW)) viewSince = now;
      const over =
        viewSince === null
          ? now - started >= NO_VIEW_MS
          : now - viewSince >= GIVE_UP_MS;
      if (over) report?.(nonce, "missing");
      return over;
    };
    const poll = attempt()
      ? undefined
      : setInterval(() => {
          if (attempt()) clearInterval(poll);
        }, POLL_MS);
    // Reporting reruns this effect, so the flash timer lives in a ref
    return () => clearInterval(poll);
  }, [focused, enabled, ready, mode, lessonId, report]);
}
