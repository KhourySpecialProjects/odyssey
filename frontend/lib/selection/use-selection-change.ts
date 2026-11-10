"use client";

import { useEffect, useRef } from "react";

// How long the selection has to stay still before a popover opens
export const SELECTION_DELAY_MS = 150;

/**
 * Calls `onChange` once the page's selection has stayed still for
 * SELECTION_DELAY_MS, however it was made: mouse, Shift + arrow keys, or a
 * long-press on a phone. The latest `onChange` is used, so it needn't be
 * memoised.
 */
export function useSelectionChange(onChange: () => void, enabled = true) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleSelectionChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), SELECTION_DELAY_MS);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [enabled]);
}
