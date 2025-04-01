import { render, screen, fireEvent } from "@testing-library/react";
import { GenericEditor } from "@/components/draft/lesson/blocks/generic";

jest.mock("@/lib/actions", () => ({
  revalidateLesson: jest.fn(),
}));

jest.mock("@/components/ui/tiptap/generic-block-input", () => ({
  GenericBlockInput: ({
    initialContent,
    updateContent,
  }: {
    initialContent: string;
    updateContent: (content: string) => void;
    revalidate: any;
  }) => (
    <div data-testid="generic-block-input">
      <button
        data-testid="update-content-button"
        onClick={() => updateContent("Updated content")}
      >
        Update Content
      </button>
    </div>
  ),
}));

describe("GenericEditor", () => {
  const mockBlock = {
    id: 1,
    __component: "droplets.generic",
    content: "Test content",
  };

  const mockUpdateBlock = jest.fn();
  const mockDeleteBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with correct block title", () => {
    render(
      <GenericEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(screen.getByText("Text Block")).toBeInTheDocument();
  });

  it("calls updateBlock when content is updated", () => {
    render(
      <GenericEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByTestId("update-content-button"));

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      id: 1,
      __component: "droplets.generic",
      content: "Updated content",
    });
  });

  it("calls deleteBlock when delete button is clicked", () => {
    render(
      <GenericEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByTestId("delete-block"));

    expect(mockDeleteBlock).toHaveBeenCalled();
  });
});
