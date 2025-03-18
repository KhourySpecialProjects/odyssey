import { QuizQuestionBlock } from "@/components/droplets/lessons/quiz-question";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("QuizQuestionBlock", () => {
  const mockQuestion = {
    id: 1,
    content: "What is 2 + 2?",
    answerOptions: [
      { id: 1, content: "3", isCorrect: false },
      { id: 2, content: "4", isCorrect: true },
      { id: 3, content: "5", isCorrect: false },
    ],
  };

  it("renders question content", () => {
    render(<QuizQuestionBlock question={mockQuestion} />);
    expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
  });

  it("renders all answer options", () => {
    render(<QuizQuestionBlock question={mockQuestion} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows feedback when answer is submitted", async () => {
    render(<QuizQuestionBlock question={mockQuestion} />);

    const user = userEvent.setup();

    const answer = await screen.findByText("4");
    expect(answer).toBeInTheDocument();

    await user.click(answer);
    await user.click(screen.getByText("Check Answer"));

    expect(screen.getByText(/right/i)).toBeInTheDocument();
  });
});
