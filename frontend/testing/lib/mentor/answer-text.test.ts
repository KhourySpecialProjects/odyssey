import { answerNoteHtml, displayAnswer } from "@/lib/mentor/answer-text";

describe("displayAnswer", () => {
  it.each<[string, string, boolean, string, string[]?]>([
    [
      "a whole ref",
      "Joins combine tables [p3].",
      false,
      "Joins combine tables.",
    ],
    ["refs side by side", "Both [p3][p5] apply.", false, "Both apply."],
    ["a list of refs", "See [p3, p5] here", false, "See here"],
    [
      "a ref split across chunks, once joined",
      "Joins " + "[p" + "3] work",
      true,
      "Joins work",
    ],
    [
      "a trailing partial ref while streaming",
      "Joins work [p3, p",
      true,
      "Joins work",
    ],
    ["a lone bracket while streaming", "Joins work [", true, "Joins work"],
    ["a trailing partial once finished", "Index arr[p", false, "Index arr[p"],
    [
      "other brackets",
      "Use arr[0] and [note] here",
      true,
      "Use arr[0] and [note] here",
    ],
    ["a finished bracket at the end", "Use [note]", false, "Use [note]"],
    [
      "a linked phrase, as its words",
      "A [base case][p2] stops it.",
      false,
      "A base case stops it.",
    ],
    [
      "a linked phrase whose ref is linkable",
      "A [base case][p2] stops it.",
      false,
      "A [base case](#mentor-source-p2) stops it.",
      ["p2"],
    ],
    [
      "links to an unknown ref or to several refs, as their words",
      "[One][p9] and [two][p2, p3].",
      false,
      "One and two.",
      ["p2"],
    ],
    ["a link's words still arriving", "A [base ca", true, "A base ca"],
    ...[
      "A [base case]",
      "A [base case][",
      "A [base case][p",
      "A [base case][p2, p",
    ].map((raw): [string, string, boolean, string] => [
      `a link's ref still arriving: ${raw}`,
      raw,
      true,
      "A base case",
    ]),
  ])("%s", (_name, raw, streaming, expected, linkRefs = []) => {
    expect(displayAnswer(raw, { streaming, linkRefs })).toBe(expected);
  });
});

describe("answerNoteHtml", () => {
  it.each([
    [
      "the question in bold, then paragraphs without refs",
      "What is a join?",
      "A join combines rows [p1].\n\nIt needs a key [p2, p3].",
      "<p><strong>What is a join?</strong></p><p>A join combines rows.</p><p>It needs a key.</p>",
    ],
    [
      "escaped question and answer",
      `Is a < b & "c"?`,
      "Use <script>x</script> and 'quotes'",
      "<p><strong>Is a &lt; b &amp; &quot;c&quot;?</strong></p><p>Use &lt;script&gt;x&lt;/script&gt; and &#39;quotes&#39;</p>",
    ],
    [
      "linked phrases as plain words",
      "Summarize this lesson",
      "A [base case][p2] stops it [p3].",
      "<p><strong>Summarize this lesson</strong></p><p>A base case stops it.</p>",
    ],
  ])("%s", (_name, question, answer, html) => {
    expect(answerNoteHtml(question, answer)).toBe(html);
  });
});
