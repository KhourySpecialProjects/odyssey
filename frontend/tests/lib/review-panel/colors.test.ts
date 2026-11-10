import { readFileSync } from "fs";
import { BAND_COLORS } from "@/lib/review-panel/colors";

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
};
const contrastOnWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

describe("BAND_COLORS contrast on white", () => {
  it.each(Object.entries(BAND_COLORS))("%s", (_band, { outline, text }) => {
    expect(contrastOnWhite(outline)).toBeGreaterThanOrEqual(3);
    expect(contrastOnWhite(text)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["good", "ok", "needs_work"] as const)(
    "%s: the lesson badge colour is the text colour, and white on it passes",
    (band) => {
      const css = readFileSync("app/globals.css", "utf8");
      const badge = new RegExp(
        `\\.review-finding--${band} \\{[^}]*--rf-badge: (#[0-9a-f]{6})`,
      ).exec(css)?.[1];
      expect(badge).toBe(BAND_COLORS[band].text.toLowerCase());
      expect(contrastOnWhite(badge!)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("uses the planned values", () => {
    expect(BAND_COLORS.good).toMatchObject({
      outline: "#16A34A",
      text: "#15803D",
    });
    expect(BAND_COLORS.unscored).toMatchObject({
      outline: "#858F9F",
      text: "#475467",
    });
  });

  it.each(Object.entries(BAND_COLORS))("%s text on its tint", (_b, c) => {
    const ratio = (luminance(c.tint) + 0.05) / (luminance(c.text) + 0.05);
    expect(Math.max(ratio, 1 / ratio)).toBeGreaterThanOrEqual(4.5);
  });
});
