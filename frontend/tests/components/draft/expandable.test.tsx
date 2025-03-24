import { render, screen, fireEvent } from "@testing-library/react";
import { ExpandableEditor } from "@/components/draft/lesson/blocks/expandable";

// Mock the dependencies
jest.mock("@/components/ui/tiptap/expandable-block-input", () => ({
  ExpandableBlockInput: ({
    initialContent,
    updateContent,
  }: {
    initialContent: string;
    updateContent: (content: string) => void;
  }) => (
    <div data-testid="expandable-block-input">
      <button
        data-testid="update-content-button"
        onClick={() => updateContent("Updated content")}
      >
        Update Content
      </button>
    </div>
  ),
}));

describe("ExpandableEditor", () => {
  const mockBlock = {
    __component: "droplets.expandable",
    content: "Test content",
    title: "Test title",
  };

  const mockUpdateBlock = jest.fn();
  const mockDeleteBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with correct block title", () => {
    render(
      <ExpandableEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(screen.getByText("Expandable Block")).toBeInTheDocument();
  });

  it("renders with the correct title input value", () => {
    render(
      <ExpandableEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    const titleInput = screen.getByDisplayValue("Test title");
    expect(titleInput).toBeInTheDocument();
  });

  it("calls updateBlock when title is changed", () => {
    render(
      <ExpandableEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    const titleInput = screen.getByDisplayValue("Test title");
    fireEvent.change(titleInput, { target: { value: "New title" } });

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.expandable",
      content: "Test content",
      title: "New title",
    });
  });

  it("calls updateBlock when content is updated", () => {
    render(
      <ExpandableEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByTestId("update-content-button"));

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.expandable",
      content: "Updated content",
      title: "Test title",
    });
  });
});
