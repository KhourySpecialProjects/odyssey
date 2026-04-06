"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HighlightColor } from "@/types";
import { IconTrash, IconNotebook } from "@tabler/icons-react";

const COLORS: { color: HighlightColor; label: string }[] = [
  { color: "#f9a8d4", label: "Pink" },
  { color: "#fbd38d", label: "Orange" },
  { color: "#fff300", label: "Yellow" },
  { color: "#86efac", label: "Green" },
  { color: "#93c5fd", label: "Blue" },
];

interface SelectionToolbarProps {
  position: { x: number; y: number } | null;
  selectedColor: HighlightColor;
  isOnHighlight: boolean;
  onApplyColor: (color: HighlightColor) => void;
  onDelete: () => void;
  onNote: () => void;
  onClose: () => void;
}

export function SelectionToolbar({
  position,
  selectedColor,
  isOnHighlight,
  onApplyColor,
  onDelete,
  onNote,
  onClose,
}: SelectionToolbarProps) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!position) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [position, onClose]);

  if (!mounted || !position) return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 flex items-center gap-1 rounded-lg border border-[#eaecf0] bg-white px-2 py-1.5 shadow-[0px_4px_6px_-2px_rgba(16,24,40,0.03),0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
      style={{
        left: position.x,
        top: position.y,
        transform: "translateX(-50%)",
      }}
    >
      {COLORS.map(({ color, label }) => (
        <button
          key={color}
          title={`Highlight ${label}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onApplyColor(color);
          }}
          className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
            selectedColor === color ? "ring-2 ring-[#2D7597] ring-offset-1" : ""
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
      <div className="mx-0.5 h-4 w-px bg-slate-200" />
      <button
        title="Add note"
        onMouseDown={(e) => {
          e.preventDefault();
          onNote();
        }}
        className="rounded p-0.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <IconNotebook className="h-4 w-4" />
      </button>
      {isOnHighlight && (
        <button
          title="Remove highlight"
          onMouseDown={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600"
        >
          <IconTrash className="h-4 w-4" />
        </button>
      )}
    </div>,
    document.body,
  );
}
