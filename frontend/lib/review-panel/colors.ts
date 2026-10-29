/** Band colours for the Reviewer Transcript panel (ODY-805 D5); WCAG-checked on white */
export const BAND_COLORS = {
  good: {
    outline: "#16A34A",
    text: "#15803D",
    tint: "#DCFCE7",
    line: "#22C55E",
  },
  ok: { outline: "#D97706", text: "#B45309", tint: "#FEF3C7", line: "#F59E0B" },
  needs_work: {
    outline: "#DC2626",
    text: "#B91C1C",
    tint: "#FEE2E2",
    line: "#EF4444",
  },
  unscored: {
    outline: "#858F9F",
    text: "#475467",
    tint: "#F2F4F7",
    line: "#858F9F",
  },
} as const;

export type Band = keyof typeof BAND_COLORS;

export const BAND_LABEL: Record<Band, string> = {
  good: "Good",
  ok: "OK",
  needs_work: "Needs work",
  unscored: "Not scored",
};
