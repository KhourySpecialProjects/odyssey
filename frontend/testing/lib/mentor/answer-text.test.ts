import { answerNoteHtml, displayAnswer } from "@/lib/mentor/answer-text";

describe("displayAnswer", () => {
  it.each([
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
    ["other brackets", "Use arr[0] and [note]", true, "Use arr[0] and [note]"],
  ])("%s", (_name, raw, streaming, expected) => {
    expect(displayAnswer(raw, { streaming })).toBe(expected);
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
  ])("%s", (_name, question, answer, html) => {
    expect(answerNoteHtml(question, answer)).toBe(html);
  });
});
