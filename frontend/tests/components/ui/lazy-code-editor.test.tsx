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
    expect(gutter).toHaveTextContent("12");
    // Same font stack as CodeMirror's base theme, so glyphs don't change
    expect(container.firstChild).toHaveClass("font-[monospace]");

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
