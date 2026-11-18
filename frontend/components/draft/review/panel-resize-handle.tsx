"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/utils";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1F5E7A]";

const STEP = 16;

const setBodyDragging = (on: boolean) => {
  document.body.classList.toggle("select-none", on);
  document.body.style.cursor = on ? "col-resize" : "";
};

/**
 * A window splitter on the panel's left edge: drag, arrow keys, Home/End, and
 * double-click to reset (ODY-867).
 */
export function PanelResizeHandle({
  width,
  min,
  max,
  controls,
  label,
  onResize,
  onReset,
  onDragChange,
  dragging = false,
}: {
  width: number;
  min: number;
  max: number;
  controls: string;
  label: string;
  onResize: (px: number, save?: boolean) => void;
  onReset: () => void;
  onDragChange: (dragging: boolean) => void;
  dragging?: boolean;
}) {
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
    x: number;
  }>();
  const frame = useRef(0);
  const dragChange = useRef(onDragChange);
  dragChange.current = onDragChange;

  const finish = () => {
    if (frame.current) window.cancelAnimationFrame(frame.current);
    frame.current = 0;
    drag.current = undefined;
    dragChange.current(false);
    setBodyDragging(false);
  };

  // The width saved is the pointer's last position; a click without a move saves nothing
  const end = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const x = e.type === "pointerup" ? e.clientX : d.x;
    if (x !== d.startX) onResize(d.startWidth + d.startX - x);
    finish();
  };

  // Don't leave the body locked or the drag state set if the handle unmounts mid-drag
  useEffect(
    () => () => {
      if (drag.current) finish();
    },
    [],
  );

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const step = (e.shiftKey ? 4 : 1) * STEP;
    const next =
      e.key === "ArrowLeft"
        ? width + step
        : e.key === "ArrowRight"
          ? width - step
          : e.key === "Home"
            ? min
            : e.key === "End"
              ? max
              : null;
    if (next === null) return;
    e.preventDefault();
    onResize(next);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || drag.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startWidth: width,
      x: e.clientX,
    };
    dragChange.current(true);
    setBodyDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.x = e.clientX;
    if (frame.current) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      if (drag.current !== d) return;
      onResize(d.startWidth + d.startX - d.x, false);
    });
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label}`}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`${width} pixels wide`}
      aria-controls={controls}
      data-dragging={dragging}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onDoubleClick={onReset}
      className={cn(
        "group/handle absolute inset-y-0 left-0 z-10 w-2 -translate-x-1/2 cursor-col-resize touch-none",
        FOCUS,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "mx-auto h-full w-0.5 bg-transparent group-hover/handle:bg-[#2D7597] group-focus-visible/handle:bg-[#2D7597]",
          dragging && "bg-[#2D7597]",
        )}
      />
    </div>
  );
}
