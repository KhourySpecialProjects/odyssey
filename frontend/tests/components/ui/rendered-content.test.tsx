import { render, waitFor } from "@testing-library/react";
import { RenderedContent } from "@/components/ui/rendered-content";
import hljs from "highlight.js/lib/core";

// RenderedContent lazy-loads highlight.js/lib/core through the shared
// highlighter module, so this file shares that core instance.
let mockHaskellChunkFails = false;
jest.mock("highlight.js/lib/languages/haskell", () => {
  if (mockHaskellChunkFails) throw new Error("Loading chunk haskell failed");
  return jest.requireActual("highlight.js/lib/languages/haskell");
});

const codeHtml = (lang: string | null, code: string) =>
  `<pre><code${lang ? ` class="language-${lang}"` : ""}>${code}</code></pre>`;

describe("RenderedContent", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockHaskellChunkFails = false;
  });

  it("renders the gutter and plain code text immediately", () => {
    const { container } = render(
      <RenderedContent html={codeHtml("python", "a = 1\nb = 2")} />,
    );

    const code = container.querySelector("pre code") as HTMLElement;
    expect(code.textContent).toBe("a = 1\nb = 2");
    expect(code).toHaveClass("hljs", "language-python");
    expect(code).not.toHaveAttribute("data-highlighted");
    const gutterLines = container.querySelectorAll("pre > div > div");
    expect(Array.from(gutterLines).map((l) => l.textContent)).toEqual([
      "1",
      "2",
    ]);
  });

  it("highlights the code once the highlighter has loaded", async () => {
    const { container } = render(
      <RenderedContent html={codeHtml("javascript", "const a = 1;")} />,
    );

    const code = container.querySelector("pre code") as HTMLElement;
    await waitFor(() =>
      expect(code).toHaveAttribute("data-highlighted", "yes"),
    );
    expect(code.querySelector(".hljs-keyword")).toHaveTextContent("const");
    // The gutter survives highlighting
    expect(container.querySelectorAll("pre > div > div")).toHaveLength(1);
  });

  it("loads a lazily bundled grammar through its alias", async () => {
    expect(hljs.getLanguage("yaml")).toBeUndefined();

    const { container } = render(
      <RenderedContent html={codeHtml("yml", "name: odyssey\ncount: 3")} />,
    );

    const code = container.querySelector("pre code") as HTMLElement;
    await waitFor(() =>
      expect(code).toHaveAttribute("data-highlighted", "yes"),
    );
    expect(hljs.getLanguage("yaml")).toBeDefined();
    expect(code).toHaveClass("language-yml");
    expect(code.querySelector(".hljs-attr")).toHaveTextContent("name");
  });

  it("auto-detects a code block that has no language", async () => {
    const { container } = render(
      <RenderedContent
        html={codeHtml(null, "def f():\n    return 1\n\nprint(f())")}
      />,
    );

    const code = container.querySelector("pre code") as HTMLElement;
    await waitFor(() =>
      expect(code).toHaveAttribute("data-highlighted", "yes"),
    );
    expect(code.textContent).toBe("def f():\n    return 1\n\nprint(f())");
  });

  it("leaves an unknown language as plain text", async () => {
    const { container } = render(
      <RenderedContent
        html={
          codeHtml("notareallanguage", "foo &lt;bar&gt;") +
          codeHtml("python", "b = 2")
        }
      />,
    );

    const codes = () => container.querySelectorAll("pre code");
    await waitFor(() =>
      expect(codes()[1]).toHaveAttribute("data-highlighted", "yes"),
    );
    expect(codes()[0]).not.toHaveAttribute("data-highlighted");
    expect(codes()[0].textContent).toBe("foo <bar>");
    expect(codes()[0].querySelector("span")).toBeNull();
  });

  it("keeps plain text and logs when a grammar fails to load", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockHaskellChunkFails = true;

    const { container } = render(
      <RenderedContent html={codeHtml("haskell", 'main = putStrLn "hi"')} />,
    );

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load syntax highlighting for "haskell":',
        expect.any(Error),
      ),
    );
    const code = container.querySelector("pre code") as HTMLElement;
    expect(code.textContent).toBe('main = putStrLn "hi"');
  });

  it("does not load or run the highlighter when there are no code blocks", async () => {
    const highlightElement = jest.spyOn(hljs, "highlightElement");
    const { container } = render(<RenderedContent html="<p>No code</p>" />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container).toHaveTextContent("No code");
    expect(highlightElement).not.toHaveBeenCalled();
  });

  it("does not highlight after unmounting before the highlighter loads", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const highlightElement = jest.spyOn(hljs, "highlightElement");

    const { unmount } = render(
      <RenderedContent html={codeHtml("scheme", "(define x 1)")} />,
    );
    expect(() => unmount()).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(highlightElement).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does not highlight stale content when html changes while loading", async () => {
    const { container, rerender } = render(
      <RenderedContent html={codeHtml("scheme", "(define x 1)")} />,
    );
    rerender(<RenderedContent html="<p>Replaced</p>" />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container).toHaveTextContent("Replaced");
    expect(container.querySelector("code")).toBeNull();
  });
});
