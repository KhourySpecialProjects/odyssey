/**
 * Finds `$...$` and `$$...$$` math in lesson paragraph HTML.
 *
 * Inline math follows Pandoc's tex_math_dollars rule so prices stay text:
 * the opening `$` must be followed by a non-space, the closing `$` must be
 * preceded by a non-space and must not be followed by a digit, and `\$` is a
 * literal dollar sign. Inline math never spans a tag (`<`) or a newline.
 */
const MATH_PATTERN = new RegExp(
  [
    // \$ -> literal dollar
    String.raw`\\\$`,
    // $$display$$
    String.raw`\$\$(.*?)\$\$`,
    // $inline$
    String.raw`(?<![\\$])\$(?![\s$])((?:\\.|[^$\\\n<])+?)(?<![\s\\])\$(?!\d)`,
  ].join("|"),
  "g",
);

export function replaceDollarMath(
  html: string,
  render: {
    display: (latex: string) => string;
    inline: (latex: string) => string;
  },
): string {
  return html.replace(
    MATH_PATTERN,
    (match, display: string | undefined, inline: string | undefined) => {
      if (match === "\\$") return "$";
      if (display !== undefined) return render.display(display);
      if (inline !== undefined)
        return render.inline(inline.replace(/\\\$/g, "$"));
      return match;
    },
  );
}
