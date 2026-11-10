import { parseLatexShortcut } from "@/lib/blocknote/latex-shortcut";

describe("parseLatexShortcut", () => {
  it.each([
    "it costs $5 and $10",
    "$5 and $10",
    "$5",
    "Pay $5 or $10 today",
    "$x$",
    "text before $$x^2$$",
    "$$x^2$$ text after",
    "$$$$",
    "$$ $$",
    "",
  ])("leaves %j as plain text", (text) => {
    expect(parseLatexShortcut(text)).toBeNull();
  });

  it("converts a block that is exactly $$...$$ into LaTeX", () => {
    expect(parseLatexShortcut("$$x^2 + y^2$$")).toBe("x^2 + y^2");
    expect(parseLatexShortcut("  $$ \\frac{a}{b} $$ ")).toBe("\\frac{a}{b}");
  });
});
