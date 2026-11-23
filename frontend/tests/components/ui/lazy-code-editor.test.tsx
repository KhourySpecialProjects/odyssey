import { render, screen } from "@testing-library/react";
import { LazyCodeEditor } from "@/components/ui/lazy-code-editor";

jest.mock("@/components/ui/code-editor", () => ({
  CodeEditor: () => <div data-testid="real-editor" />,
}));

describe("LazyCodeEditor fallback", () => {
  it("shows the code with CodeMirror-style line numbers until the editor loads", async () => {
    const { container } = render(
      <LazyCodeEditor value={"print(1)\nprint(2)"} readOnly />,
    );

    expect(container.querySelector("pre")).toHaveTextContent("print(1)");
    const gutter = container.querySelector('[aria-hidden="true"]');
    // One line number per line, each on its own row
    expect(Array.from(gutter!.children, (row) => row.textContent)).toEqual([
      "1",
      "2",
    ]);
    // Same font stack as CodeMirror's base theme, so glyphs don't change
    expect(container.firstChild).toHaveClass("font-[monospace]");

    expect(await screen.findByTestId("real-editor")).toBeInTheDocument();
  });

  it("draws the gutter and text in CodeMirror's dark-mode colours", async () => {
    let Fresh: typeof LazyCodeEditor = LazyCodeEditor;
    jest.isolateModules(() => {
      Fresh = require("@/components/ui/lazy-code-editor").LazyCodeEditor;
    });
    const { container } = render(<Fresh value={"a\nb"} readOnly />);

    const gutter = container.querySelector('[aria-hidden="true"]');
    // Base dark gutter: #333338 / #ccc and no border (githubDark sets none)
    expect(gutter).toHaveClass(
      "dark:bg-[#333338]",
      "dark:text-[#ccc]",
      "dark:border-r-0",
    );
    // Line 1 carries CodeMirror's active-line gutter highlight
    expect(gutter!.children[0]).toHaveClass("dark:bg-[#36334280]");
    expect(gutter!.children[1]).not.toHaveClass("dark:bg-[#36334280]");
    // globals.css forces `.dark pre` text to white; the pre sets its own
    expect(container.querySelector("pre")).toHaveClass("dark:text-[#c9d1d9]");

    expect(await screen.findByTestId("real-editor")).toBeInTheDocument();
  });

  it("shows the editor's placeholder when there's no code yet", async () => {
    // Fresh module so the editor chunk isn't already loaded from the test above
    let Fresh: typeof LazyCodeEditor = LazyCodeEditor;
    jest.isolateModules(() => {
      Fresh = require("@/components/ui/lazy-code-editor").LazyCodeEditor;
    });
    render(<Fresh value="" placeholder="# Write your Python code here" />);

    expect(
      screen.getByText("# Write your Python code here"),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("real-editor")).toBeInTheDocument();
  });
});
