// Text helpers shared by the scan's rules (the prototype's, unchanged).

export const words = (text: string): string[] =>
  String(text || "").match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [];

/** Splits after ".", "!" or "?" and a space; pieces with no words are dropped. */
export const sentences = (text: string): string[] =>
  String(text || "")
    .split(/(?<=[.!?])\s+/)
    .filter((s) => words(s).length > 0);

export const norm = (text: string): string =>
  String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
