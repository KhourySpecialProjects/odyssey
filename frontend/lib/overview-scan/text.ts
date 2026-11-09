// Text helpers shared by the scan's rules (the prototype's, unchanged).

export const words = (text: string): string[] =>
  String(text || "").match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [];

/**
 * Splits after ".", "!" or "?" and a space; pieces with no words are dropped.
 * An abbreviation's dot ("e.g.", "etc.", "Dr.") doesn't end a sentence (ODY-903).
 */
export const sentences = (text: string): string[] =>
  String(text || "")
    .split(/(?<=[.!?])(?<!\b(?:e\.g|i\.e|etc|vs|cf|Dr|Mr|Mrs|Ms|Prof)\.)\s+/i)
    .filter((s) => words(s).length > 0);

export const norm = (text: string): string =>
  String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
