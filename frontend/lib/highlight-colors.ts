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

/** The yellow that highlights have always saved. Only its drawn shade is softer. */
const STORED_YELLOW = "#fff300";
const DISPLAY_YELLOW = "#fef08a";

/**
 * The colour to draw for a saved highlight colour. Saved highlights keep their
 * literal hex, so the old bright yellow is mapped here and every other colour
 * is returned unchanged.
 */
export function displayColor(color: string): string {
  return color === STORED_YELLOW ? DISPLAY_YELLOW : color;
}
