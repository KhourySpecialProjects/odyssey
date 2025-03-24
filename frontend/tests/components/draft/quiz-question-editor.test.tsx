import { render, screen, fireEvent } from "@testing-library/react";
import { QuizQuestionEditor } from "@/components/draft/lesson/blocks/quiz-question-editor";

// Mock dependencies
jest.mock("@/components/ui/tiptap/generic-block-input", () => ({
  GenericBlockInput: ({
    initialContent,
    updateContent,
  }: {
    initialContent: string;
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

describe("QuizQuestionEditor", () => {
  const mockQuestion = {
    id: 1,
    content: "Test question",
    answerOptions: [
      { id: 1, content: "Option 1", isCorrect: true },
      { id: 2, content: "Option 2", isCorrect: false },
    ],
  };

  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders question content", () => {
    render(
      <QuizQuestionEditor
        question={mockQuestion}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("Question")).toBeInTheDocument();
    expect(
      screen.getByText("Answer Options (choose multiple if applicable)"),
    ).toBeInTheDocument();
  });

  it("updates question content when TipTap editor changes", () => {
    render(
      <QuizQuestionEditor
        question={mockQuestion}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />,
    );

    fireEvent.click(screen.getAllByTestId("update-content-button")[0]);

    expect(mockOnUpdate).toHaveBeenCalledWith({
      ...mockQuestion,
      content: "Updated content",
    });
  });

  it("updates answer content when TipTap editor for an answer changes", () => {
    render(
      <QuizQuestionEditor
        question={mockQuestion}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />,
    );

    fireEvent.click(screen.getAllByTestId("update-content-button")[1]);

    expect(mockOnUpdate).toHaveBeenCalledWith({
      ...mockQuestion,
      answerOptions: [
        { id: 1, content: "Updated content", isCorrect: true },
        { id: 2, content: "Option 2", isCorrect: false },
      ],
    });
  });

  it("toggles answer correctness when checkbox is clicked", () => {
    render(
      <QuizQuestionEditor
        question={mockQuestion}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />,
    );

    const checkbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(checkbox);

    expect(mockOnUpdate).toHaveBeenCalledWith({
      ...mockQuestion,
      answerOptions: [
        { id: 1, content: "Option 1", isCorrect: false },
        { id: 2, content: "Option 2", isCorrect: false },
      ],
    });
  });

  it("adds a new answer option when Add Answer Option button is clicked", () => {
    render(
      <QuizQuestionEditor
        question={mockQuestion}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />,
    );

    fireEvent.click(screen.getByText("Add Answer Option"));

    expect(mockOnUpdate).toHaveBeenCalledWith({
      ...mockQuestion,
      answerOptions: [
        ...mockQuestion.answerOptions,
        expect.objectContaining({
          content: "",
          isCorrect: false,
        }),
      ],
    });
  });

  it("displays different label for true/false questions", () => {
    const trueFalseQuestion = {
      id: 1,
      content: "Is this true?",
      answerOptions: [
        { id: 1, content: "True", isCorrect: true },
        { id: 2, content: "False", isCorrect: false },
      ],
    };

    render(
      <QuizQuestionEditor
        question={trueFalseQuestion}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("Answer Options")).toBeInTheDocument();
  });
});
