import { render, screen, fireEvent } from "@testing-library/react";
import { QuizEditor } from "@/components/draft/lesson/blocks/quiz";
import userEvent from "@testing-library/user-event";

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

  describe("QuizEditor", () => {
    const mockBlock = {
      __component: "quiz",
      questions: [
        {
          id: 1,
          content: "Test Question",
          answerOptions: [
            { id: 1, content: "True", isCorrect: true },
            { id: 2, content: "False", isCorrect: false },
          ],
        },
      ],
    };

    const mockProps = {
      block: mockBlock,
      updateBlock: jest.fn(),
      deleteBlock: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("adds a new true/false question correctly", async () => {
      const user = userEvent.setup();
      render(<QuizEditor {...mockProps} />);

      await user.click(screen.getByText("Add Question"));

      expect(mockProps.updateBlock).toHaveBeenCalledWith({
        __component: "quiz",
        questions: expect.arrayContaining([
          expect.objectContaining({
            content: "",
            answerOptions: [
              { content: "True", isCorrect: true, id: expect.any(Number) },
              { content: "False", isCorrect: false, id: expect.any(Number) },
            ],
          }),
        ]),
      });
    });

    it("displays correct quiz type in header", () => {
      render(<QuizEditor {...mockProps} />);
      expect(screen.getByText("True/False Quiz")).toBeInTheDocument();
    });
  });

  describe("QuizEditor", () => {
    const mockTrueFalseBlock = {
      __component: "quiz",
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

    const mockMultipleChoiceBlock = {
      __component: "quiz",
      questions: [
        {
          id: 1,
          content: "What is your choice?",
          answerOptions: [
            { id: 1, content: "Option 1", isCorrect: true },
            { id: 2, content: "Option 2", isCorrect: false },
          ],
        },
      ],
    };

    test("renders correct title for True/False quiz", () => {
      render(
        <QuizEditor
          block={mockTrueFalseBlock}
          updateBlock={jest.fn()}
          deleteBlock={jest.fn()}
        />,
      );

      expect(screen.getByText("True/False Quiz")).toBeInTheDocument();
    });

    test("renders correct title for Multiple Choice quiz", () => {
      render(
        <QuizEditor
          block={mockMultipleChoiceBlock}
          updateBlock={jest.fn()}
          deleteBlock={jest.fn()}
        />,
      );

      expect(screen.getByText("Multiple Choice Quiz")).toBeInTheDocument();
    });

    test("renders QuizQuestionEditor for each question", () => {
      const multipleQuestionBlock = {
        __component: "quiz",
        questions: [
          {
            id: 1,
            content: "Question 1",
            answerOptions: [
              { id: 1, content: "True", isCorrect: true },
              { id: 2, content: "False", isCorrect: false },
            ],
          },
          {
            id: 2,
            content: "Question 2",
            answerOptions: [
              { id: 3, content: "True", isCorrect: true },
              { id: 4, content: "False", isCorrect: false },
            ],
          },
        ],
      };

      render(
        <QuizEditor
          block={multipleQuestionBlock}
          updateBlock={jest.fn()}
          deleteBlock={jest.fn()}
        />,
      );

      const questionEditors = screen.getAllByText(/question/i);
      expect(questionEditors).toHaveLength(3);
    });

    test("adds new question when Add Question button is clicked", () => {
      const mockUpdateBlock = jest.fn();

      render(
        <QuizEditor
          block={mockTrueFalseBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={jest.fn()}
        />,
      );

      const addButton = screen.getByText("Add Question");
      fireEvent.click(addButton);

      expect(mockUpdateBlock).toHaveBeenCalledWith({
        __component: "quiz",
        questions: expect.arrayContaining([
          ...mockTrueFalseBlock.questions,
          expect.objectContaining({
            content: "",
            answerOptions: [
              expect.objectContaining({ content: "True", isCorrect: true }),
              expect.objectContaining({ content: "False", isCorrect: false }),
            ],
          }),
        ]),
      });
    });

    test("adds new multiple choice question when Add Question button is clicked", () => {
      const mockUpdateBlock = jest.fn();

      render(
        <QuizEditor
          block={mockMultipleChoiceBlock}
          updateBlock={mockUpdateBlock}
          deleteBlock={jest.fn()}
        />,
      );

      const addButton = screen.getByText("Add Question");
      fireEvent.click(addButton);

      expect(mockUpdateBlock).toHaveBeenCalledWith({
        __component: "quiz",
        questions: expect.arrayContaining([
          ...mockMultipleChoiceBlock.questions,
          expect.objectContaining({
            content: "",
            answerOptions: [
              expect.objectContaining({ content: "", isCorrect: true }),
              expect.objectContaining({ content: "", isCorrect: false }),
            ],
          }),
        ]),
      });
    });
  });

  describe("QuizEditor", () => {
    const mockBlock = {
      __component: "droplets.quiz",
      questions: [
        {
          id: 1,
          content: "Test Question",
          answerOptions: [
            { id: 1, content: "True", isCorrect: true },
            { id: 2, content: "False", isCorrect: false },
          ],
        },
      ],
    };

    const mockUpdateBlock = jest.fn();
    const mockDeleteBlock = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe("Quiz Editor Functionality", () => {
      it("renders delete block button with correct test ID", () => {
        render(
          <QuizEditor
            block={mockBlock}
            updateBlock={mockUpdateBlock}
            deleteBlock={mockDeleteBlock}
          />,
        );

        const deleteButton = screen.getByTestId("delete-block");
        expect(deleteButton).toBeInTheDocument();
      });

      it("calls deleteBlock when delete button is clicked", () => {
        render(
          <QuizEditor
            block={mockBlock}
            updateBlock={mockUpdateBlock}
            deleteBlock={mockDeleteBlock}
          />,
        );

        const deleteButton = screen.getByTestId("delete-block");
        fireEvent.click(deleteButton);

        expect(mockDeleteBlock).toHaveBeenCalled();
      });

      it("renders correct quiz type title", () => {
        render(
          <QuizEditor
            block={mockBlock}
            updateBlock={mockUpdateBlock}
            deleteBlock={mockDeleteBlock}
          />,
        );

        expect(screen.getByText("True/False Quiz")).toBeInTheDocument();
      });
    });
  });
});
