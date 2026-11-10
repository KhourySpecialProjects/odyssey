"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { HighlightColor } from "@/types";
import { IconTrash, IconNotebook } from "@tabler/icons-react";
import { HIGHLIGHT_COLORS } from "@/lib/highlight-colors";
import { placePopover, useDismiss, type PopoverAnchor } from "@/lib/selection";

interface SelectionToolbarProps {
  anchor: PopoverAnchor;
  selectedColor: HighlightColor;
  isOnHighlight: boolean;
  onApplyColor: (color: HighlightColor) => void;
  onDelete: () => void;
  onNote: () => void;
  /**
   * Set while the reader is moving a highlight whose text was deleted. The
   * toolbar then only offers to move it onto the selected text.
   */
  onMoveHere?: () => void;
  onClose: () => void;
}

// Mouse down on a button would otherwise clear the reader's text selection
const keepSelection = (e: React.MouseEvent) => e.preventDefault();

/**
 * Highlight actions for the selected text. It's rendered right after the
 * block's text, so Tab reaches it next and it scrolls with the text.
 */
export function SelectionToolbar({
  anchor,
  selectedColor,
  isOnHighlight,
  onApplyColor,
  onDelete,
  onNote,
  onMoveHere,
  onClose,
}: SelectionToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [placement, setPlacement] = useState({ left: 0, top: 0 });
  // Only one button is in the tab order; the arrow keys move between them
  const [focusIndex, setFocusIndex] = useState(0);

  const buttonCount = onMoveHere
    ? 1
    : HIGHLIGHT_COLORS.length + (isOnHighlight ? 2 : 1);
  const activeIndex = Math.min(focusIndex, buttonCount - 1);

  // Above the selection, or below it when it would go under the site header,
  // and kept inside the lesson column
  useLayoutEffect(() => {
    const next = ref.current && placePopover(ref.current, anchor);
    if (next) setPlacement(next);
  }, [anchor]);

  useDismiss(ref, onClose);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const last = buttonCount - 1;
    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = activeIndex === last ? 0 : activeIndex + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = activeIndex === 0 ? last : activeIndex - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    setFocusIndex(next);
    buttonRefs.current[next]?.focus();
  };

  const rovingProps = (i: number) => ({
    ref: (el: HTMLButtonElement | null) => {
      buttonRefs.current[i] = el;
    },
    type: "button" as const,
    tabIndex: i === activeIndex ? 0 : -1,
    onMouseDown: keepSelection,
    onFocus: () => setFocusIndex(i),
  });

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={onMoveHere ? "Move highlight" : "Highlight text"}
      onKeyDown={handleKeyDown}
      className="absolute z-50 flex items-center gap-1 rounded-lg border border-[#eaecf0] bg-white px-2 py-1.5 shadow-[0px_4px_6px_-2px_rgba(16,24,40,0.03),0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
      // No margin from a block that spaces out its children (a callout's do)
      style={{ ...placement, margin: 0 }}
    >
      {onMoveHere ? (
        <button
          {...rovingProps(0)}
          onClick={onMoveHere}
          className="rounded px-1.5 py-0.5 text-sm font-medium text-[#2D7597] hover:bg-slate-100"
        >
          Move highlight here
        </button>
      ) : (
        <>
          {HIGHLIGHT_COLORS.map(({ color, label }, i) => (
            <button
              key={color}
              {...rovingProps(i)}
              title={`Highlight ${label}`}
              aria-label={`Highlight ${label}`}
              aria-pressed={selectedColor === color}
              onClick={() => onApplyColor(color)}
              className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
                selectedColor === color
                  ? "ring-2 ring-[#2D7597] ring-offset-1"
                  : ""
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <div className="mx-0.5 h-4 w-px bg-slate-200" />
          <button
            {...rovingProps(HIGHLIGHT_COLORS.length)}
            title="Add note"
            aria-label="Add note"
            onClick={onNote}
            className="rounded p-0.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <IconNotebook className="h-4 w-4" aria-hidden />
          </button>
          {isOnHighlight && (
            <button
              {...rovingProps(HIGHLIGHT_COLORS.length + 1)}
              title="Remove highlight"
              aria-label="Remove highlight"
              onClick={onDelete}
              className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600"
            >
              <IconTrash className="h-4 w-4" aria-hidden />
            </button>
          )}
        </>
      )}
    </div>
  );
}
