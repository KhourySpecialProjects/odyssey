import { HighlightColor } from "@/types";

/** The colours a reader can highlight with, in toolbar order. */
export const HIGHLIGHT_COLORS: { color: HighlightColor; label: string }[] = [
  { color: "#f9a8d4", label: "Pink" },
  { color: "#fbd38d", label: "Orange" },
  { color: "#fff300", label: "Yellow" },
  { color: "#86efac", label: "Green" },
  { color: "#93c5fd", label: "Blue" },
];

export function isHighlightColor(value: unknown): value is HighlightColor {
  return HIGHLIGHT_COLORS.some(({ color }) => color === value);
}
