import DOMPurify from "isomorphic-dompurify";

/**
 * Emblem contract (the SVG an emblem generator must produce):
 * - a roughly 2.2:1 wide `viewBox`, e.g. `viewBox="0 0 220 100"` (square works, shown centred);
 * - presentation attributes only (`fill`, `stroke`, ...), no `style` attribute or `filter`;
 * - no `<style>`, filters, `<use>`, `<image>`, `<a>` or links of any kind;
 * - at most 50 KB.
 *
 * Emblems are untrusted model output. They are sanitized here and rendered only
 * as `<img src="data:image/svg+xml;...">`, which runs no scripts. An `<img>` also
 * never loads outside references (for example `fill="url(https://...)"`), so
 * those are harmless even where the sanitizer leaves them in.
 */
export const EMBLEM_MAX_BYTES = 50 * 1024;

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Sanitize an emblem SVG. Returns the clean `<svg>…</svg>` string, or null
 * when the input is too big or is not a real SVG once sanitized.
 */
export function sanitizeEmblem(svg?: string): string | null {
  if (!svg?.trim() || svg.length > EMBLEM_MAX_BYTES) return null;
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true },
    FORBID_TAGS: ["image", "use", "a", "style", "foreignObject"],
    FORBID_ATTR: ["style", "href", "xlink:href", "filter"],
  }).trim();
  if (!/^<svg[\s>]/i.test(clean) || !/<\/svg>$/i.test(clean)) return null;
  const rootTag = clean.slice(0, clean.indexOf(">") + 1);
  return /\sxmlns\s*=/i.test(rootTag)
    ? clean
    : clean.replace(/^<svg/i, `<svg xmlns="${SVG_NS}"`);
}

/** Sanitize an emblem and encode it as an SVG data URL, or null when unusable. */
export function emblemToDataUrl(svg?: string): string | null {
  const clean = sanitizeEmblem(svg);
  if (!clean) return null;
  try {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clean)}`;
  } catch {
    // A lone surrogate makes encodeURIComponent throw.
    return null;
  }
}
