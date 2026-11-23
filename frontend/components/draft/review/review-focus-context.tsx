"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { OUTDATED_TEXT } from "./comment-list";
import type { Band } from "@/lib/review-panel/colors";
import type { AiFinding } from "@/types";

export type OpenDetail = {
  band: Band;
  findings: { finding: AiFinding; number: number }[];
};

/** What the panel points at in the lesson; `place` is "Lesson 2" or "Overview" */
export type FocusTarget = {
  kind: "finding" | "comment" | "section";
  markId: string;
  lessonId: number | null;
  field: string;
  place: string;
  quote: string;
};

export type Outcome = "shown" | "outdated" | "missing";

const NOT_FOUND_TEXT = "Couldn't find it on the page";
const EXPIRE_MS = 10_000;

/** A request to show a target; `navigate` is Show in lesson, `done` once reported */
export type Focused = {
  target: FocusTarget;
  nonce: number;
  navigate: boolean;
  done: boolean;
};

type ReviewFocus = {
  openDetail: OpenDetail | null;
  setOpenDetail: Dispatch<SetStateAction<OpenDetail | null>>;
  focused: Focused | null;
  show: (target: FocusTarget, url: string) => void;
  select: (target: FocusTarget) => void;
  report: (nonce: number, outcome: Outcome) => void;
};

const ReviewFocusContext = createContext<ReviewFocus | null>(null);

/**
 * The criterion detail open in the panel (ODY-849): the lesson draws its
 * findings. `active` is false while the panel is a rail, so no marks show.
 */
export function ReviewFocusProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [detail, setOpenDetail] = useState<OpenDetail | null>(null);
  const [focused, setFocused] = useState<Focused | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const nonce = useRef(0);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const lastPushed = useRef<string | null>(null);
  useEffect(() => {
    lastPushed.current = null;
  }, [pathname]);
  const expiry = useRef<ReturnType<typeof setTimeout>>(undefined);
  const frame = useRef(0);
  useEffect(
    () => () => {
      clearTimeout(expiry.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const request = useCallback((target: FocusTarget, navigate: boolean) => {
    nonce.current += 1;
    const id = nonce.current;
    setFocused({ target, nonce: id, navigate, done: false });
    // A request no page answers ends, so a later visit doesn't replay it
    clearTimeout(expiry.current);
    expiry.current = setTimeout(
      () => setFocused((c) => (c && c.nonce === id ? { ...c, done: true } : c)),
      EXPIRE_MS,
    );
  }, []);
  const show = useCallback(
    (target: FocusTarget, url: string) => {
      request(target, true);
      if (pathRef.current !== url && lastPushed.current !== url) {
        lastPushed.current = url;
        router.push(url);
      }
    },
    [request, router],
  );
  const select = useCallback(
    (target: FocusTarget) => request(target, false),
    [request],
  );
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const report = useCallback((id: number, outcome: Outcome) => {
    const current = focusedRef.current;
    if (!current || current.nonce !== id) return;
    const { target } = current;
    const noun = target.kind === "finding" ? "issue" : "comment";
    const text =
      outcome === "outdated"
        ? OUTDATED_TEXT
        : outcome === "missing"
          ? NOT_FOUND_TEXT
          : `Showing ${noun} in ${target.place}: “${target.quote}”`;
    // Clear first so a repeat of the same text is read again
    setAnnouncement("");
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setAnnouncement(text));
    setFocused({ ...current, done: true });
  }, []);
  const value = useMemo(
    () => ({
      openDetail: active ? detail : null,
      setOpenDetail,
      focused,
      show,
      select,
      report,
    }),
    [active, detail, focused, show, select, report],
  );
  return (
    <ReviewFocusContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </ReviewFocusContext.Provider>
  );
}

/** The panel's open detail, or null outside a provider */
export function useReviewFocus(): ReviewFocus | null {
  return useContext(ReviewFocusContext);
}
