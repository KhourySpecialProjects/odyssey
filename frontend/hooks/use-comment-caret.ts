"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

/** Where the caret goes, in px from its layer's top left */
export type CaretBox = { x: number; top: number; height: number };

// The spring's time constant, and how long the caret is still before it blinks
const EASE_MS = 26;
const BLINK_AFTER_MS = 650;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * The reviewer's caret in Comment mode (ODY-806), as the redesign prototype
 * moves it (ui-redesign/comments.js: tick, showCaret): a 2px bar that eases
 * toward its stop along a line (a spring stepped each frame), hops onto a new
 * line, fades in and out, and blinks once still. With reduced motion it
 * jumps and doesn't blink. It's moved by style, not state, so following the
 * pointer doesn't re-render.
 */
export function useCommentCaret(caretRef: RefObject<HTMLElement | null>) {
  const state = useRef({
    x: 0,
    y: 0,
    h: 0,
    tx: 0,
    ty: 0,
    th: 0,
    frame: 0,
    last: 0,
    on: false,
    blink: undefined as ReturnType<typeof setTimeout> | undefined,
  });

  const paint = useCallback(() => {
    const caret = caretRef.current;
    const s = state.current;
    if (!caret) return;
    caret.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
    caret.style.height = `${s.h.toFixed(2)}px`;
  }, [caretRef]);

  const tick = useCallback(
    (now: number) => {
      const s = state.current;
      s.frame = 0;
      const dt = s.last ? Math.min(48, now - s.last) : 16;
      s.last = now;
      const k = 1 - Math.exp(-dt / EASE_MS);
      s.x += (s.tx - s.x) * k;
      s.y += (s.ty - s.y) * k;
      s.h += (s.th - s.h) * k;
      const done =
        Math.abs(s.tx - s.x) < 0.5 &&
        Math.abs(s.ty - s.y) < 0.5 &&
        Math.abs(s.th - s.h) < 0.5;
      if (done) {
        s.x = s.tx;
        s.y = s.ty;
        s.h = s.th;
        s.last = 0;
      }
      paint();
      if (!done) s.frame = requestAnimationFrame(tick);
    },
    [paint],
  );

  /** Moves the caret to a box, or hides it with null */
  const show = useCallback(
    (box: CaretBox | null) => {
      const caret = caretRef.current;
      const s = state.current;
      if (!caret) return;
      clearTimeout(s.blink);
      caret.classList.remove("is-idle");
      if (!box) {
        caret.classList.remove("is-on");
        s.on = false;
        return;
      }
      s.tx = box.x - 1;
      s.ty = box.top;
      s.th = box.height;
      const hop = s.on && Math.abs(s.ty - s.y) > box.height * 0.6;
      const reduce = reducedMotion();
      if (!s.on || hop || reduce) {
        s.x = s.tx;
        s.y = s.ty;
        s.h = s.th;
        paint();
      }
      if (hop && !reduce) {
        caret.classList.remove("is-hop");
        void caret.offsetWidth;
        caret.classList.add("is-hop");
      }
      s.on = true;
      caret.classList.add("is-on");
      if (!s.frame && !reduce) s.frame = requestAnimationFrame(tick);
      if (!reduce) {
        s.blink = setTimeout(
          () => caret.classList.add("is-idle"),
          BLINK_AFTER_MS,
        );
      }
    },
    [caretRef, paint, tick],
  );

  /** Squashes the caret a little while the pointer is down */
  const press = useCallback(
    (down: boolean) => caretRef.current?.classList.toggle("is-press", down),
    [caretRef],
  );

  useEffect(() => {
    const s = state.current;
    return () => {
      cancelAnimationFrame(s.frame);
      clearTimeout(s.blink);
    };
  }, []);

  return { show, press };
}
