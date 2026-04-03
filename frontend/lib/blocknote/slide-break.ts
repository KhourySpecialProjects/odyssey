/**
 * Shared constants for the slide break feature (used by both V1 and V2 editors).
 */

export const SLIDE_BREAK_MARKER = "<!--SLIDE_BREAK-->";

export const SLIDE_BREAK_TYPE = "slide-break" as const;

export const dashedLineStyle = {
  height: "2px",
  background:
    "repeating-linear-gradient(to right, #7dd3fc 0, #7dd3fc 6px, transparent 6px, transparent 12px)",
  maskImage:
    "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
} as const;
