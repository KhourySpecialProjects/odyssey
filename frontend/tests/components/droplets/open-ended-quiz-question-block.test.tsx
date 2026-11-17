import { render, screen, fireEvent } from "@testing-library/react";
import { OpenEndedQuizQuestionBlock } from "@/components/droplets/lessons/open-ended-quiz-question-block";

describe("OpenEndedQuizQuestionBlock", () => {
  const mockQuestion = {
    id: 1,
    content: "What is the capital of France?",
    correctAnswer: "Paris",
  };

  it("renders question content", () => {
    render(<OpenEndedQuizQuestionBlock question={mockQuestion} />);
    expect(screen.getByText(mockQuestion.content)).toBeInTheDocument();
  });

  it("handles correct answer submission", () => {
    render(<OpenEndedQuizQuestionBlock question={mockQuestion} />);

    const input = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(input, { target: { value: "Paris" } });

    const checkButton = screen.getByText("Check Answer");
    fireEvent.click(checkButton);

    expect(screen.getByText(/Right/i)).toBeInTheDocument();
  });

  it("handles incorrect answer submission", () => {
    render(<OpenEndedQuizQuestionBlock question={mockQuestion} />);

    const input = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(input, { target: { value: "London" } });

    const checkButton = screen.getByText("Check Answer");
    fireEvent.click(checkButton);

    expect(screen.getByText("Not Quite")).toBeInTheDocument();
  });

  it("allows retry after incorrect answer", () => {
    render(<OpenEndedQuizQuestionBlock question={mockQuestion} />);

    const input = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(input, { target: { value: "London" } });

    const checkButton = screen.getByText("Check Answer");
    fireEvent.click(checkButton);

    const tryAgainButton = screen.getByText("Try Again");
    fireEvent.click(tryAgainButton);

    expect(
      screen.getByPlaceholderText("Type your answer here..."),
    ).toBeInTheDocument();
  });

  describe("whitespace in answers (ODY-618)", () => {
    const answerWith = (correctAnswer: string, typed: string) => {
      render(
        <OpenEndedQuizQuestionBlock
          question={{ ...mockQuestion, correctAnswer }}
        />,
      );
      fireEvent.change(
        screen.getByPlaceholderText("Type your answer here..."),
        {
          target: { value: typed },
        },
      );
      fireEvent.click(screen.getByText("Check Answer"));
    };

    it("accepts a multi-line code answer typed the same way", () => {
      answerWith(
        "<pre><code>for i in range(3):\n    print(i)</code></pre>",
        "for i in range(3):\n    print(i)",
      );
      expect(screen.getByText(/Right/i)).toBeInTheDocument();
    });

    it("accepts an answer with extra spaces", () => {
      answerWith("<p>New York City</p>", "  New   York  City ");
      expect(screen.getByText(/Right/i)).toBeInTheDocument();
    });

    it("still rejects a different answer", () => {
      answerWith(
        "<pre><code>for i in range(3):\n    print(i)</code></pre>",
        "for i in range(4):\n    print(i)",
      );
      expect(screen.getByText("Not Quite")).toBeInTheDocument();
    });
  });
});
