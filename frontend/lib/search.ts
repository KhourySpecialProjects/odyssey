/**
 * Client-side search used by the app's search boxes (Explore, Activity, My
 * Content, the voyage editor's pickers).
 *
 * A query matches an item when every word of it appears in one of the item's
 * fields (case- and accent-insensitive). If nothing in the list matches that
 * way, the search tries again allowing small spelling mistakes, so "pyhton"
 * still finds Python. Close matches are only a fallback: a query with exact
 * matches never pulls in near misses (e.g. "code" doesn't also show "node").
 */

export type SearchField = string | null | undefined;

export type SearchResult<T> = {
  items: T[];
  /** True when nothing matched exactly and these are close matches */
  approximate: boolean;
};

export function searchItems<T>(
  items: T[],
  query: string,
  fields: (item: T) => SearchField[],
): SearchResult<T> {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  // Always a new array, like Array.filter (some callers sort it in place)
  if (words.length === 0) return { items: [...items], approximate: false };

  const prepared = items.map((item) => {
    const texts = fields(item)
      .filter((f): f is string => Boolean(f))
      .map(normalize);
    return { item, texts };
  });

  const exact = prepared.filter(({ texts }) =>
    words.every((word) => texts.some((text) => text.includes(word))),
  );
  if (exact.length > 0) {
    return { items: exact.map(({ item }) => item), approximate: false };
  }

  const close = prepared.filter(({ texts }) => {
    const tokens = texts.flatMap((text) => text.split(TOKEN_SEPARATOR));
    return words.every(
      (word) =>
        texts.some((text) => text.includes(word)) ||
        tokens.some((token) => isCloseTo(word, token)),
    );
  });
  return {
    items: close.map(({ item }) => item),
    approximate: close.length > 0,
  };
}

const TOKEN_SEPARATOR = /[^\p{L}\p{N}]+/u;

/** Lower case without accents, so "Résumé" and "resume" compare equal. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Typos allowed for a query word: none for short words (too many unrelated
 * near-matches), one from 4 letters, two from 9 (like common search engine
 * defaults; two at 8 let "intervew" match "internet").
 */
function allowedTypos(word: string): number {
  if (word.length >= 9) return 2;
  if (word.length >= 4) return 1;
  return 0;
}

/**
 * Whether `word` is a misspelling of `token`, or of the start of it (so a
 * half-typed or shortened word with a typo, like "pyhto" or "compter", still
 * finds "python" / "computers").
 */
function isCloseTo(word: string, token: string): boolean {
  const max = allowedTypos(word);
  if (max === 0 || !token) return false;
  if (Math.abs(word.length - token.length) <= max) {
    if (editDistance(word, token, max) <= max) return true;
  }
  // Compare with the token's start, a little longer than the word too, so a
  // missing letter still lines up
  for (let extra = 0; extra <= max; extra++) {
    const length = word.length + extra;
    if (token.length <= length) break;
    if (editDistance(word, token.slice(0, length), max) <= max) return true;
  }
  return false;
}

/**
 * Edits (insert, delete, substitute, or swap two neighbouring letters) to turn
 * `a` into `b`. Stops early and returns max + 1 once it's clearly over `max`.
 */
function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, current[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1);
      }
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = current;
  }
  return prev[b.length];
}
