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

/**
 * The sentence in `text` that has `word` in it, as a whole word, clipped to
 * about 300 characters around it; the whole text, clipped, when no sentence
 * has it. Context for the spelling double-check (ODY-904).
 */
export function sentenceAround(text: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const whole = new RegExp(`(^|[^A-Za-z0-9])${escaped}(?![A-Za-z0-9])`);
  const sentence =
    sentences(text).find((s) => whole.test(s)) ?? String(text || "");
  if (sentence.length <= 300) return sentence;
  const at = Math.max(0, sentence.search(whole));
  const start = Math.max(0, Math.min(at - 150, sentence.length - 300));
  return sentence.slice(start, start + 300);
}
