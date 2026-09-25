import { render, screen, waitFor } from "@testing-library/react";
import { CodeBlockViewer } from "@/components/draft/lesson/code-block-viewer";

jest.mock("@/lib/code-execution", () => ({
  executeCode: jest.fn(),
}));

describe("CodeBlockViewer", () => {
  const code = 'print("hello")';

  it("shows the code as plain text while the editor loads", async () => {
    const { container } = render(
      <CodeBlockViewer
        language="python"
        code={code}
        editable={false}
        runnable={false}
      />,
    );

    expect(container.querySelector("pre")).toHaveTextContent(code);

    // Let the lazy editor finish loading so no update lands after the test
    await waitFor(() => expect(container.querySelector("pre")).toBeNull());
  });

  it("replaces the fallback with the code editor once loaded", async () => {
    const { container } = render(
      <CodeBlockViewer
        language="python"
        code={code}
        editable={false}
        runnable={false}
      />,
    );

    // The CodeMirror mock renders the value in a <div>
    await waitFor(() => expect(container.querySelector("pre")).toBeNull());
    expect(screen.getByText(code)).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
  });
});
