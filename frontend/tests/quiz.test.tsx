import { render, screen, fireEvent } from "@testing-library/react";
import { QuizEditor } from "@/components/draft/lesson/blocks/quiz";

// Mock dependencies
jest.mock("@/components/draft/lesson/blocks/quiz-question-editor", () => ({
  QuizQuestionEditor: ({
    question,
    onUpdate,
    onDelete,
  }: {
    question: any;
    onUpdate: (question: any) => void;
    onDelete: () => void;
  }) => (
    <div data-testid={`question-${question.id}`}>
      <span>{question.content || "Empty question"}</span>
      <button
        data-testid={`update-question-${question.id}`}
        onClick={() => onUpdate({ ...question, content: "Updated content" })}
      >
        Update
      </button>
      <button data-testid={`delete-question-${question.id}`} onClick={onDelete}>
        Delete
      </button>
    </div>
  ),
}));

describe("QuizEditor", () => {
  const mockQuestion = {
    id: 1,
    content: "Test question",
    answerOptions: [
      { id: 1, content: "Option 1", isCorrect: true },
      { id: 2, content: "Option 2", isCorrect: false },
    ],
  };

  const mockBlock = {
    __component: "droplets.quiz",
    questions: [mockQuestion],
  };

  const mockUpdateBlock = jest.fn();
  const mockDeleteBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with correct title for multiple choice quiz", () => {
    render(
      <QuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(screen.getByText("Multiple Choice Quiz")).toBeInTheDocument();
  });

  it("renders with correct title for true/false quiz", () => {
    const trueFalseBlock = {
      __component: "droplets.quiz",
      questions: [
        {
          id: 1,
          content: "Is this true?",
          answerOptions: [
            { id: 1, content: "True", isCorrect: true },
            { id: 2, content: "False", isCorrect: false },
          ],
        },
      ],
    };

    render(
      <QuizEditor
        block={trueFalseBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(screen.getByText("True/False Quiz")).toBeInTheDocument();
  });

  it("renders question editors for each question", () => {
    render(
      <QuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    expect(
      screen.getByTestId(`question-${mockQuestion.id}`),
    ).toBeInTheDocument();
  });

  it("updates a question when QuizQuestionEditor triggers update", () => {
    render(
      <QuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByTestId(`update-question-${mockQuestion.id}`));

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.quiz",
      questions: [
        {
          ...mockQuestion,
          content: "Updated content",
        },
      ],
    });
  });

  it("removes a question when QuizQuestionEditor triggers delete", () => {
    render(
      <QuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByTestId(`delete-question-${mockQuestion.id}`));

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.quiz",
      questions: [],
    });
  });

  it("adds a new question when Add Question button is clicked", () => {
    render(
      <QuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByText("Add Question"));

    expect(mockUpdateBlock).toHaveBeenCalledWith({
      __component: "droplets.quiz",
      questions: [
        mockQuestion,
        expect.objectContaining({
          content: "",
          answerOptions: expect.arrayContaining([
            expect.objectContaining({ content: "", isCorrect: true }),
            expect.objectContaining({ content: "", isCorrect: false }),
          ]),
        }),
      ],
    });
  });

  it("calls deleteBlock when the main delete button is clicked", () => {
    render(
      <QuizEditor
        block={mockBlock}
        updateBlock={mockUpdateBlock}
        deleteBlock={mockDeleteBlock}
      />,
    );

    fireEvent.click(screen.getByRole("img", { name: /trash/i }));

    expect(mockDeleteBlock).toHaveBeenCalled();
  });
});
