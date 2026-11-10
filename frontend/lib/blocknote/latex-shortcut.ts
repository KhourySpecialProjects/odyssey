/**
 * Typing a whole block as `$$expression$$` turns it into a LaTeX block.
 * Single `$...$` pairs are NOT a trigger so prices like "$5 and $10" stay text.
 * The slash menu's "LaTeX" item is the primary way to insert LaTeX.
 */
export function parseLatexShortcut(plainText: string): string | null {
  const match = plainText.trim().match(/^\$\$([^$]+)\$\$$/);
  const content = match?.[1].trim();
  return content ? content : null;
}
