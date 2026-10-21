import type { HighlightColor } from "@/types";

/**
 * The five highlight colours, in toolbar order. The one list shared by the
 * toolbar and the server-side validation in `lib/requests/highlights.ts` (a
 * "use server" file can't export a constant, so it lives here).
 */
export const HIGHLIGHT_COLOR_OPTIONS: readonly {
  color: HighlightColor;
  label: string;
}[] = [
  { color: "#f9a8d4", label: "Pink" },
  { color: "#fbd38d", label: "Orange" },
  { color: "#fff300", label: "Yellow" },
  { color: "#86efac", label: "Green" },
  { color: "#93c5fd", label: "Blue" },
];

export const HIGHLIGHT_COLORS: readonly HighlightColor[] =
  HIGHLIGHT_COLOR_OPTIONS.map((option) => option.color);
