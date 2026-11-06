"use client";

import { useCallback, useEffect, useState } from "react";

export const PANEL_MIN = 384;
export const PANEL_MAX = 720;
/** The narrowest the page may get beside the panel */
export const MIN_MAIN = 640;

export const maxPanelWidth = (viewport: number, reserved: number) =>
  Math.max(PANEL_MIN, Math.min(PANEL_MAX, viewport - reserved - MIN_MAIN));

export const clampPanelWidth = (w: number, max: number) =>
  Math.min(max, Math.max(PANEL_MIN, Math.round(w)));

export type PanelWidth = ReturnType<typeof usePanelWidth>;

/**
 * The review panel's width: a saved preference, clamped to what the window
 * allows (ODY-867). Read after mount so the server and first render agree.
 */
export function usePanelWidth(
  storageKey: string,
  reserved = 0,
  enabled = true,
) {
  const [preferred, setPreferred] = useState(PANEL_MIN);
  const [viewport, setViewport] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const stored = raw ? Number(raw) : NaN;
      if (Number.isFinite(stored)) {
        setPreferred(clampPanelWidth(stored, PANEL_MAX));
      }
    } catch {
      // Private mode: the default applies
    }
  }, [storageKey]);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    // Capped where the maximum stops changing, so a wide window never re-renders
    const measure = () =>
      setViewport(
        Math.min(
          document.documentElement.clientWidth,
          PANEL_MAX + MIN_MAIN + reserved,
        ),
      );
    const onResize = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    measure();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled, reserved]);

  const max = maxPanelWidth(viewport ?? Infinity, reserved);
  const width = clampPanelWidth(preferred, max);

  const setWidth = useCallback(
    (px: number, save = true) => {
      const next = clampPanelWidth(px, max);
      setPreferred(next);
      if (!save) return;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // Full quota or private mode
      }
    },
    [max, storageKey],
  );

  const reset = useCallback(() => setWidth(PANEL_MIN), [setWidth]);

  return { width, min: PANEL_MIN, max, dragging, setDragging, setWidth, reset };
}
