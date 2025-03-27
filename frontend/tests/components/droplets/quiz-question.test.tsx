import { QuizQuestionBlock } from "@/components/droplets/lessons/quiz-question";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("validates correct answers", async () => {
    render(<QuizQuestionBlock question={mockQuestion} />);

    const correctAnswer = screen.getByRole("radio", { name: "4" });
    await userEvent.click(correctAnswer);

    const submitButton = screen.getByRole("button", { name: /check answer/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/right/i);
    });
  });

  it("handles incorrect answers and allows retry", async () => {
    render(<QuizQuestionBlock question={mockQuestion} />);

    const wrongAnswer = screen.getByRole("radio", { name: "3" });
    await userEvent.click(wrongAnswer);

    const submitButton = screen.getByRole("button", { name: /check answer/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/not quite/i);
    });

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    await userEvent.click(tryAgainButton);

    expect(
      screen.getByRole("button", { name: /check answer/i }),
    ).toBeInTheDocument();
  });

  it("handles multiple correct answers", async () => {
    const multipleAnswerQuestion = {
      ...mockQuestion,
      answerOptions: [
        { id: 1, content: "A", isCorrect: true },
        { id: 2, content: "B", isCorrect: true },
        { id: 3, content: "C", isCorrect: false },
      ],
    };

    render(<QuizQuestionBlock question={multipleAnswerQuestion} />);

    const answer1 = screen.getByRole("checkbox", { name: "A" });
    const answer2 = screen.getByRole("checkbox", { name: "B" });
    await userEvent.click(answer1);
    await userEvent.click(answer2);

    const submitButton = screen.getByRole("button", { name: /check answer/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/right/i);
    });
  });
});
