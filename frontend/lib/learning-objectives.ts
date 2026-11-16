// A leading list marker: "-", "*", "•", "–", or "1." / "1)" numbering, followed
// by whitespace (or nothing, for a marker-only line).
const LIST_MARKER = /^(?:[-*•–]|\d+[.)])(?:\s+|$)/;

/**
 * Splits pasted text into one learning objective per non-empty line, in order.
 * Strips list markers, trims, and drops blanks and exact duplicates.
 */
export function splitPastedObjectives(text: string): string[] {
  const seen = new Set<string>();
  const objectives: string[] = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    const objective = line.trim().replace(LIST_MARKER, "").trim();
    if (objective === "" || seen.has(objective)) continue;
    seen.add(objective);
    objectives.push(objective);
  }
  return objectives;
}
