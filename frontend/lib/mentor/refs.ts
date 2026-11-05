// How Mentor cites the lesson (ODY-882): "[p3]", or "[p3, p5]" for several.
// No imports, so the sidebar can read refs while an answer streams.

/**
 * A citation in Mentor's answer, the refs in group 1. Global, so replace()
 * finds every one. exec(), test() and matchAll() start from its lastIndex,
 * which they share: use a copy for those, `new RegExp(REF_PATTERN)`.
 */
export const REF_PATTERN = /\[(p\d+(?:\s*,\s*p\d+)*)\]/g;

/** The refs an answer cites, in the order first cited, each once */
export function citedRefs(answer: string): string[] {
  const refs = new Set<string>();
  for (const match of answer.matchAll(new RegExp(REF_PATTERN))) {
    for (const ref of match[1].split(",")) refs.add(ref.trim());
  }
  return [...refs];
}
