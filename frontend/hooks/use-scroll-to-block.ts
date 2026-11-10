"use client";

import { useEffect } from "react";

const POLL_MS = 100;
const GIVE_UP_MS = 5000;
const FLASH_MS = 600;

/**
 * Scrolls to and flashes the BlockNote block named by `?block=<id>` (ODY-879).
 * Waits for the editor to mount; a v1 lesson has no such block, so it gives
 * up quietly and the lesson stays at the top.
 */
export function useScrollToBlock() {
  useEffect(() => {
    const blockId = new URLSearchParams(window.location.search).get("block");
    if (!blockId) return;
    const selector = `[data-node-type="blockContainer"][data-id="${CSS.escape(blockId)}"]`;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    let el: HTMLElement | null = null;
    const started = Date.now();

    const attempt = () => {
      el = document.querySelector<HTMLElement>(selector);
      if (!el) return Date.now() - started >= GIVE_UP_MS;
      const calm = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")
        .matches;
      el.scrollIntoView({
        block: "center",
        behavior: calm ? "auto" : "smooth",
      });
      if (!calm) {
        el.classList.add("review-mark--flash");
        const target = el;
        flashTimer = setTimeout(
          () => target.classList.remove("review-mark--flash"),
          FLASH_MS,
        );
      }
      return true;
    };

    if (attempt()) return () => clearTimeout(flashTimer);
    const poll = setInterval(() => {
      if (attempt()) clearInterval(poll);
    }, POLL_MS);
    return () => {
      clearInterval(poll);
      clearTimeout(flashTimer);
      el?.classList.remove("review-mark--flash");
    };
  }, []);
}
