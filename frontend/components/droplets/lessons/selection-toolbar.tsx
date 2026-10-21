"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HighlightColor } from "@/types";
import { cn } from "@/lib/utils";
import { IconTrash, IconNotebook } from "@tabler/icons-react";
import { HIGHLIGHT_COLOR_OPTIONS as COLORS } from "./highlight-colors";

// Used until the toolbar has been measured (and where nothing can be measured)
const FALLBACK_HEIGHT = 36;
const FALLBACK_WIDTH = 220;
const GAP = 8;

/**
 * Where the toolbar goes. Everything is in pixels relative to the block it is
 * rendered in (its nearest positioned ancestor).
 */
export interface ToolbarPosition {
  /** Horizontal centre of the selection */
  x: number;
  /** Top and bottom edges of the selection */
  anchorTop: number;
  anchorBottom: number;
  /** The top of the free area: the toolbar must not go above this (the sticky header) */
  minTop: number;
  /** The block's width, for keeping the toolbar inside it */
  maxX: number;
}

interface SelectionToolbarProps {
  position: ToolbarPosition | null;
  selectedColor: HighlightColor;
  isOnHighlight: boolean;
  onApplyColor: (color: HighlightColor) => void;
  onDelete: () => void;
  onNote: () => void;
  onClose: (reason: "escape" | "outside") => void;
  /**
   * Whether an Esc should close this toolbar. False when focus is in some
   * other widget (a dialog, a menu), which should get the key instead.
   */
  ownsEscape: () => boolean;
}

/**
 * The floating highlight toolbar. It is rendered inside the block it belongs
 * to (absolutely positioned, not portalled), so Tab reaches it after the text
 * and it scrolls with the text.
 */
export function SelectionToolbar({
  position,
  selectedColor,
  isOnHighlight,
  onApplyColor,
  onDelete,
  onNote,
  onClose,
  ownsEscape,
}: SelectionToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const open = position !== null;
  const [size, setSize] = useState({
    height: FALLBACK_HEIGHT,
    width: FALLBACK_WIDTH,
  });
  // Roving tabindex: one Tab stop (the active button), arrows move it
  const [active, setActive] = useState(0);

  // The listeners read the latest callbacks without being re-registered on
  // every render
  const onCloseRef = useRef(onClose);
  const ownsEscapeRef = useRef(ownsEscape);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    ownsEscapeRef.current = ownsEscape;
  });

  // Measure the toolbar before it is painted, so it can be placed exactly
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const height = el.offsetHeight || FALLBACK_HEIGHT;
    const width = el.offsetWidth || FALLBACK_WIDTH;
    setSize((prev) =>
      prev.height === height && prev.width === width ? prev : { height, width },
    );
    // The Remove button changes the width; nothing else changes the size
  }, [open, isOnHighlight]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCloseRef.current("outside");
      }
    };
    // Capture on window so this runs before the page's own Esc handlers. It
    // claims the key (preventDefault, which dismissable layers such as Radix's
    // and the lesson page's notes bar respect) only when the reader is in this
    // block or on the page itself; with focus in another widget that widget
    // gets the Esc untouched.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (!ownsEscapeRef.current()) return;
      e.preventDefault();
      onCloseRef.current("escape");
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  if (!position) return null;

  const fitsAbove = position.anchorTop - size.height - GAP >= position.minTop;
  const top = fitsAbove
    ? position.anchorTop - size.height - GAP
    : position.anchorBottom + GAP;
  const half = size.width / 2;
  const left = Math.min(
    Math.max(position.x, half),
    Math.max(position.maxX - half, half),
  );

  const buttonCount = COLORS.length + 1 + (isOnHighlight ? 1 : 0);
  const activeIndex = Math.min(active, buttonCount - 1);

  // Left and Right move between the buttons (Home and End jump to the ends)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const buttons = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    const current = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    if (current === -1) return;
    e.preventDefault();
    const last = buttons.length - 1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowRight"
            ? (current + 1) % buttons.length
            : (current - 1 + buttons.length) % buttons.length;
    buttons[next].focus();
  };

  // Keep the text selection (and its focus) when a button is pressed with a
  // pointer. Keyboard activation arrives as a click, so Enter and Space work.
  const keepSelection = (e: React.PointerEvent) => e.preventDefault();

  const focusRing =
    "focus-visible:ring-2 focus-visible:ring-[#2D7597] focus-visible:ring-offset-1 focus-visible:outline-none";
  const tab = (index: number) => ({
    tabIndex: index === activeIndex ? 0 : -1,
    onFocus: () => setActive(index),
  });

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Highlight selection"
      onKeyDown={handleKeyDown}
      className="absolute z-40 flex items-center gap-1 rounded-lg border border-[#eaecf0] bg-white px-2 py-1.5 shadow-[0px_4px_6px_-2px_rgba(16,24,40,0.03),0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
      style={{ left, top, transform: "translateX(-50%)" }}
    >
      {COLORS.map(({ color, label }, index) => (
        <button
          key={color}
          type="button"
          title={`Highlight ${label}`}
          aria-label={`Highlight ${label}`}
          aria-pressed={selectedColor === color}
          onPointerDown={keepSelection}
          onClick={() => onApplyColor(color)}
          className={cn(
            "h-5 w-5 rounded-full transition-transform hover:scale-110",
            focusRing,
            selectedColor === color && "ring-2 ring-[#2D7597] ring-offset-1",
          )}
          style={{ backgroundColor: color }}
          {...tab(index)}
        />
      ))}
      <div className="mx-0.5 h-4 w-px bg-slate-200" />
      <button
        type="button"
        title="Add note"
        aria-label="Add note"
        onPointerDown={keepSelection}
        onClick={onNote}
        className={cn(
          "rounded p-0.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          focusRing,
        )}
        {...tab(COLORS.length)}
      >
        <IconNotebook className="h-4 w-4" />
      </button>
      {isOnHighlight && (
        <button
          type="button"
          title="Remove highlight"
          aria-label="Remove highlight"
          onPointerDown={keepSelection}
          onClick={onDelete}
          className={cn(
            "rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600",
            focusRing,
          )}
          {...tab(COLORS.length + 1)}
        >
          <IconTrash className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
