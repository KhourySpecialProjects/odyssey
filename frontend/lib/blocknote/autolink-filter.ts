// Shared helpers for deciding whether a BlockNote link mark is a real link
// or an autolink false-positive (e.g. "app.py" auto-wrapped because ".py"
// looks like a TLD). Used by both the BlockNote editor (to strip spurious
// marks at edit time) and the Strapi renderer (to avoid rendering them as
// clickable links in preview/published content).

// A link whose visible text starts with a recognized scheme or "www." is
// considered a genuine URL.
const REAL_URL_PREFIX = /^(?:[a-z][a-z0-9+.-]*:\/\/|mailto:|tel:|www\.)/i;

// Strips a leading scheme from an href so we can compare it to the visible
// link text (autolinks set href = "<scheme>://" + text).
const HREF_SCHEME_PREFIX = /^(?:[a-z][a-z0-9+.-]*:\/\/|mailto:|tel:)/i;

// Schemes we're willing to emit into `href` attributes. Anything else (in
// particular `javascript:`, `data:`) is an XSS vector and must be rejected
// before it becomes a mark or a rendered anchor.
const SAFE_URI = /^(?:https?:\/\/|mailto:|tel:|\/|#|\?)/i;

export function linkTextLooksLikeRealUrl(text: string): boolean {
  return REAL_URL_PREFIX.test(text);
}

export function isAutolinkFalsePositive(
  text: string,
  href: string | null | undefined,
): boolean {
  if (!href) return false;
  const hrefWithoutScheme = href.replace(HREF_SCHEME_PREFIX, "");
  if (hrefWithoutScheme !== text) return false;
  return !linkTextLooksLikeRealUrl(text);
}

// Use at any site that turns a user-supplied string into an anchor href.
export function isSafeLinkHref(href: string | null | undefined): boolean {
  if (!href) return false;
  return SAFE_URI.test(href);
}
