import { render, screen } from "@testing-library/react";
import { QuizBlock } from "@/components/droplets/lessons/quiz";

describe("QuizBlock", () => {
  const mockQuizData = {
    id: 1,
    questions: [
      {
        id: 1,
        content: "Test question 1",
        answerOptions: [
          { id: 1, content: "Option 1", isCorrect: true },
          { id: 2, content: "Option 2", isCorrect: false },
        ],
      },
      {
        id: 2,
        content: "Test question 2",
        answerOptions: [
          { id: 3, content: "Option 3", isCorrect: true },
          { id: 4, content: "Option 4", isCorrect: false },
        ],
      },
    ],
  };

  it("renders quiz title and description", () => {
    render(<QuizBlock data={mockQuizData} />);

    expect(screen.getByText(/check in/i)).toBeInTheDocument();
    expect(
      screen.getByText("Test your knowledge and see what you just learned."),
    ).toBeInTheDocument();
  });

  it("renders all questions", () => {
    render(<QuizBlock data={mockQuizData} />);

    expect(screen.getByText("Test question 1")).toBeInTheDocument();
    expect(screen.getByText("Test question 2")).toBeInTheDocument();
  });
});
