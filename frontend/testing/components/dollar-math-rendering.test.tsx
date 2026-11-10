import { render, waitFor } from "@testing-library/react";
import GenericBlockRenderer from "@/components/droplets/lessons/generic-block-renderer";
import { PresentationBlockRenderer } from "@/components/presentation/presentation-block-renderer";
import { replaceDollarMath } from "@/lib/latex-dollars";

jest.mock("@/components/droplets/lessons/highlight-layer", () => ({
  useRegionHighlights: () => ({ highlights: [], key: "" }),
}));
jest.mock("@/components/droplets/lessons/load-highlighter", () => ({
  getLoadedHighlighter: () => null,
  loadHighlighter: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@/lib/highlight-regions", () => ({
  drawHighlights: jest.fn(),
  regionProps: () => ({}),
}));
jest.mock("@/components/draft/lesson/sandpack-viewer", () => ({}));
jest.mock("@/components/notebook/notebook-code-viewer", () => ({
  NotebookCodeViewer: () => null,
}));
jest.mock("@/components/draft/lesson/code-block-viewer", () => ({
  CodeBlockViewer: () => null,
}));

// [html, rendered katex text of each formula, text left outside formulas]
const cases: [string, string[], string][] = [
  ["<p>it costs $5 and $10</p>", [], "it costs $5 and $10"],
  ["<p>$5</p>", [], "$5"],
  ["<p>between $5-$10</p>", [], "between $5-$10"],
  ["<p>$ 5 $</p>", [], "$ 5 $"],
  ["<p>pay \\$5 and \\$10</p>", [], "pay $5 and $10"],
  ["<p>a &amp; b costs $5 and $x$ ok</p>", ["x"], "a & b costs $5 and  ok"],
  ["<p>$x$</p>", ["x"], ""],
  ["<p>$x^2 + y$ and more</p>", ["x2+y"], " and more"],
  ["<p>$<strong>5</strong> and $10</p>", [], "$5 and $10"],
];

const latexOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".katex")).map(
    (el) => el.querySelector(".katex-html")?.textContent,
  );
const textOutsideMath = (container: HTMLElement) => {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".katex").forEach((el) => el.remove());
  return clone.textContent;
};

describe("replaceDollarMath", () => {
  const tag = {
    display: (l: string) => `[D:${l}]`,
    inline: (l: string) => `[I:${l}]`,
  };
  it.each([
    ["it costs $5 and $10", "it costs $5 and $10"],
    ["$5", "$5"],
    ["between $5-$10", "between $5-$10"],
    ["$ 5 $", "$ 5 $"],
    ["$x$", "[I:x]"],
    ["$x^2 + y$ and more", "[I:x^2 + y] and more"],
    ["\\$5 and \\$10", "$5 and $10"],
    ["$$x+1$$", "[D:x+1]"],
    ["$$x$$ then $y$", "[D:x] then [I:y]"],
  ])("%s", (input, expected) => {
    expect(replaceDollarMath(input, tag)).toBe(expected);
  });
});

describe.each([
  [
    "GenericBlockRenderer",
    (content: string) =>
      render(<GenericBlockRenderer block={{ id: 1, content }} />),
  ],
  [
    "PresentationBlockRenderer",
    (content: string) =>
      render(
        <PresentationBlockRenderer
          block={{ id: 1, __component: "droplets.generic", content } as never}
        />,
      ),
  ],
])("%s dollar signs", (_name, renderBlock) => {
  it.each(cases)("%s", async (html, latex, text) => {
    const { container } = renderBlock(html);
    await waitFor(() => expect(container.textContent).not.toBe(""));
    expect(latexOf(container)).toEqual(latex);
    expect(textOutsideMath(container)).toBe(text);
  });

  it("still renders $$display$$ math", async () => {
    const { container } = renderBlock("<p>$$x+1$$</p>");
    await waitFor(() =>
      expect(container.querySelector(".katex-display")).not.toBeNull(),
    );
  });
});
