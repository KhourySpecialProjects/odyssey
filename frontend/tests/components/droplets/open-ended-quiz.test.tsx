import { render, screen } from "@testing-library/react";
import { OpenEndedQuizBlock } from "@/components/droplets/lessons/open-ended-quiz";

describe("OpenEndedQuizBlock", () => {
  const mockQuizData = {
    id: 1,
    questions: [
      {
        id: 1,
        content: "Test question 1",
        correctAnswer: "correct answer 1",
      },
      {
        id: 2,
        content: "Test question 2",
        correctAnswer: "correct answer 2",
      },
    ],
  };

  it("renders quiz title and description", () => {
    render(<OpenEndedQuizBlock data={mockQuizData} />);

    expect(screen.getByText(/check in/i)).toBeInTheDocument();
    expect(
      screen.getByText("Test your knowledge and see what you just learned."),
    ).toBeInTheDocument();
  });

  it("renders all questions", () => {
    render(<OpenEndedQuizBlock data={mockQuizData} />);

    expect(screen.getByText("Test question 1")).toBeInTheDocument();
    expect(screen.getByText("Test question 2")).toBeInTheDocument();
  });
});
