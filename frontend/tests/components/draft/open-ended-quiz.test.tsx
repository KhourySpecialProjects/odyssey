import { render, screen, fireEvent } from "@testing-library/react";
import { OpenEndedQuizEditor } from "@/components/draft/lesson/blocks/open-ended-quiz";

jest.mock("@/components/ui/tiptap/generic-block-input", () => ({
  GenericBlockInput: ({
    updateContent,
  }: {
    updateContent: (content: string) => void;
    revalidate: any;
  }) => (
    <div data-testid="tiptap-editor">
      <button
        data-testid="update-content-button"
        onClick={() => updateContent("Updated content")}
      >
        Update Content
      </button>
    </div>
  ),
}));

describe("OpenEndedQuizEditor", () => {
  const mockQuestion = {
    id: 1,
    content: "Test question",
    correctAnswer: "Test answer",
  };

  const mockBlock = {
    __component: "droplets.open-ended-quiz" as const,
    content: "",
    questions: [mockQuestion],
  };

  const mockUpdateBlock = jest.fn();
  const mockDeleteBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with correct title", () => {
    render(
      <OpenEndedQuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(screen.getByText("Open Ended Quiz")).toBeInTheDocument();
  });

  it("renders a question", () => {
    render(
      <OpenEndedQuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(screen.getByText("Question 1")).toBeInTheDocument();
    expect(screen.getByText("Correct Answer")).toBeInTheDocument();
  });

  it("updates question content when TipTap editor changes", () => {
    render(
      <OpenEndedQuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    // First update-content-button belongs to the question editor
    fireEvent.click(screen.getAllByTestId("update-content-button")[0]);

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.open-ended-quiz",
      questions: [
        {
          id: 1,
          content: "Updated content",
          correctAnswer: "Test answer",
        },
      ],
    });
  });

  it("updates correct answer when TipTap editor changes", () => {
    render(
      <OpenEndedQuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    // Second update-content-button belongs to the correct answer editor
    fireEvent.click(screen.getAllByTestId("update-content-button")[1]);

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.open-ended-quiz",
      questions: [
        {
          id: 1,
          content: "Test question",
          correctAnswer: "Updated content",
        },
      ],
    });
  });

  it("adds a new question when Add Question button is clicked", () => {
    render(
      <OpenEndedQuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByText("Add Question"));

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.open-ended-quiz",
      questions: [
        mockQuestion,
        expect.objectContaining({
          content: "",
          correctAnswer: "",
        }),
      ],
    });
  });

  it("removes a question when delete button is clicked", () => {
    render(
      <OpenEndedQuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /delete question 1/i }));

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.open-ended-quiz",
      questions: [],
    });
  });

  test("removes a question when delete button is clicked", () => {
    const mockUpdateBlock = jest.fn();
    const mockDeleteBlock = jest.fn();

    render(
      <OpenEndedQuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    const deleteButtons = screen.getAllByLabelText(/Delete question/);
    fireEvent.click(deleteButtons[0]);

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.open-ended-quiz",
      questions: [],
    });
  });
});
