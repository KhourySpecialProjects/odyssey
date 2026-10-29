"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
  IconMessage,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSharedReviewComments } from "./review-comments-context";

const isDrawer = () => !window.matchMedia("(min-width: 1280px)").matches;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1F5E7A]";

/**
 * The panel fixed to the right edge: open, or a 48 px rail; a drawer below 1280
 * (ODY-805 D6). The children stay mounted in the rail, hidden, so polling goes on.
 */
export function ReviewPanelDock({
  mode,
  onOpen,
  onCollapse,
  children,
}: {
  mode: "open" | "rail";
  onOpen: () => void;
  onCollapse: () => void;
  children: ReactNode;
}) {
  const total = useSharedReviewComments()?.comments.length ?? 0;
  const [top, setTop] = useState(69);
  const openButton = useRef<HTMLButtonElement>(null);
  const collapseButton = useRef<HTMLButtonElement>(null);
  // Set when a control here changed the mode, so focus follows to its counterpart
  const focusAfter = useRef<"open" | "rail" | null>(null);
  const rail = mode === "rail";
  // Below 1280 the open panel is a modal drawer; above, a plain landmark
  const modal = !useMediaQuery("(min-width: 1280px)") && !rail;
  const aside = useRef<HTMLElement>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const measure = () => {
      const header = document.querySelector<HTMLElement>(".sticky.top-0.z-50");
      if (header) setTop(header.getBoundingClientRect().height);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    // The drawer takes focus when it opens, however it was opened
    const drawerOpened = mounted.current && !rail && isDrawer();
    if (focusAfter.current === mode || drawerOpened) {
      (rail ? openButton : collapseButton).current?.focus();
    }
    focusAfter.current = null;
    mounted.current = true;
  }, [mode, rail]);

  const collapse = () => {
    focusAfter.current = "rail";
    onCollapse();
  };
  const open = () => {
    focusAfter.current = "open";
    onOpen();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (!modal) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      collapse();
      return;
    }
    if (e.key !== "Tab") return;
    // Keep Tab inside the drawer: wrap from the last control to the first
    const items = [
      ...(aside.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    ];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const outside = !aside.current?.contains(active);
    if (e.shiftKey && (active === first || outside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || outside)) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {!rail && (
        <div
          aria-hidden
          data-testid="review-panel-backdrop"
          className="fixed inset-0 z-30 bg-black/30 xl:hidden"
          onClick={collapse}
        />
      )}
      <aside
        ref={aside}
        aria-label={
          rail ? "Reviewer Transcript (collapsed)" : "Reviewer Transcript"
        }
        {...(modal ? { role: "dialog", "aria-modal": true } : {})}
        onKeyDown={onKeyDown}
        className={cn(
          "fixed right-0 border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
          rail
            ? "z-30 flex w-12 flex-col items-center gap-3 py-3"
            : "z-40 w-[384px] max-w-full shadow-xl xl:z-30 xl:shadow-none",
        )}
        style={{ top, bottom: 0 }}
      >
        {rail ? (
          <>
            <button
              ref={openButton}
              type="button"
              aria-label="Open Reviewer Transcript"
              onClick={open}
              className={cn(
                "rounded-lg p-2 text-slate-700 hover:bg-slate-100",
                FOCUS,
              )}
            >
              <IconLayoutSidebarRightExpand className="h-5 w-5" aria-hidden />
            </button>
            <span
              aria-hidden
              className="flex flex-col items-center text-xs font-semibold text-[#1F5E7A]"
            >
              <IconMessage className="h-4 w-4" />
              {total}
            </span>
            <span className="sr-only">
              {total} {total === 1 ? "comment" : "comments"}
            </span>
          </>
        ) : (
          <button
            ref={collapseButton}
            type="button"
            aria-label="Collapse Reviewer Transcript"
            onClick={collapse}
            className={cn(
              "absolute top-3 right-3 z-10 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100",
              FOCUS,
            )}
          >
            <IconLayoutSidebarRightCollapse className="h-5 w-5" aria-hidden />
          </button>
        )}
        <div hidden={rail} className="h-full">
          {children}
        </div>
      </aside>
    </>
  );
}
