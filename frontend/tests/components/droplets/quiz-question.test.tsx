import { QuizQuestionBlock } from "@/components/droplets/lessons/quiz-question";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock isomorphic-dompurify so tests run in jsdom without the full JSDOM window.
// The factory must be self-contained (jest.mock hoisting), so we define the spy
// inside the factory using jest.fn(). Access via jest.requireMock() in tests.
jest.mock("isomorphic-dompurify", () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html: string) => html),
  },
}));

// Mock sessionStorage for testing since it's not available in Node/Jest environment
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Override window.sessionStorage with our mock
Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
});

describe("QuizQuestionBlock", () => {
  // Standard quiz question with one correct answer
  const mockQuestion = {
    id: 1,
    content: "What is 2 + 2?",
    answerOptions: [
      { id: 1, content: "3", isCorrect: false },
      { id: 2, content: "4", isCorrect: true },
      { id: 3, content: "5", isCorrect: false },
    ],
  };

  const mockLessonId = 1;

  // Clear storage before each test to avoid state pollution
  beforeEach(() => {
    mockSessionStorage.clear();
  });

  it("renders question content", () => {
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Verify the question text is displayed
    expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
  });

  it("renders all answer options", () => {
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Verify all three answer options are visible
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows feedback when answer is submitted", async () => {
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );
    const user = userEvent.setup();

    // Select the correct answer
    const answer = await screen.findByText("4");
    expect(answer).toBeInTheDocument();
    await user.click(answer);

    // Submit the quiz
    await user.click(screen.getByText("Check Answer"));

    // Verify success feedback is shown
    expect(screen.getByText(/right/i)).toBeInTheDocument();
  });

  it("validates correct answers", async () => {
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Select the correct answer (id: 2, content: "4")
    const correctAnswer = screen.getByRole("radio", { name: "4" });
    await userEvent.click(correctAnswer);

    // Submit the answer
    const submitButton = screen.getByRole("button", { name: /check answer/i });
    await userEvent.click(submitButton);

    // Wait for and verify the success badge appears
    await waitFor(() => {
      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/right/i);
    });
  });

  it("handles incorrect answers and allows retry", async () => {
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Select an incorrect answer
    const wrongAnswer = screen.getByRole("radio", { name: "3" });
    await userEvent.click(wrongAnswer);

    // Submit the answer
    const submitButton = screen.getByRole("button", { name: /check answer/i });
    await userEvent.click(submitButton);

    // Verify "Not Quite" feedback is shown
    await waitFor(() => {
      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/not quite/i);
    });

    // Click "Try Again" button
    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    await userEvent.click(tryAgainButton);

    // Verify the form reappears for another attempt
    expect(
      screen.getByRole("button", { name: /check answer/i }),
    ).toBeInTheDocument();
  });

  it("handles multiple correct answers", async () => {
    // Create a question with multiple correct answers (checkbox style)
    const multipleAnswerQuestion = {
      ...mockQuestion,
      answerOptions: [
        { id: 1, content: "A", isCorrect: true },
        { id: 2, content: "B", isCorrect: true },
        { id: 3, content: "C", isCorrect: false },
      ],
    };

    render(
      <QuizQuestionBlock
        question={multipleAnswerQuestion}
        lessonId={mockLessonId}
      />,
    );

    // Select both correct answers
    const answer1 = screen.getByRole("checkbox", { name: "A" });
    const answer2 = screen.getByRole("checkbox", { name: "B" });
    await userEvent.click(answer1);
    await userEvent.click(answer2);

    // Submit the answers
    const submitButton = screen.getByRole("button", { name: /check answer/i });
    await userEvent.click(submitButton);

    // Verify success feedback for multiple correct answers
    await waitFor(() => {
      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/right/i);
    });
  });
});

describe("QuizQuestionBlock - Session Storage", () => {
  // Standard quiz question for storage tests
  const mockQuestion = {
    id: 1,
    content: "What is 2 + 2?",
    answerOptions: [
      { id: 1, content: "3", isCorrect: false },
      { id: 2, content: "4", isCorrect: true },
      { id: 3, content: "5", isCorrect: false },
    ],
  };

  const mockLessonId = 1;

  // Clear storage before each test to ensure isolation
  beforeEach(() => {
    mockSessionStorage.clear();
  });

  it("saves selected answer to session storage", async () => {
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Select an answer
    const answer = screen.getByRole("radio", { name: "4" });
    await userEvent.click(answer);

    // Verify the answer was saved to sessionStorage
    await waitFor(() => {
      const stored = sessionStorage.getItem("quiz-1-1");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.answerIds).toEqual(["2"]); // Answer id 2 corresponds to "4"
      expect(parsed.showResult).toBe(false); // Not yet submitted
    });
  });

  it("restores selected answer from session storage on mount", async () => {
    // Pre-populate sessionStorage with a saved answer
    sessionStorage.setItem(
      "quiz-1-1",
      JSON.stringify({
        answerIds: ["2"],
        showResult: false,
        timestamp: Date.now(),
      }),
    );

    // Render the component
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Verify the saved answer is restored and checked
    await waitFor(() => {
      const correctAnswer = screen.getByRole("radio", {
        name: "4",
      });
      // Check aria-checked attribute for Radix UI radio buttons
      expect(correctAnswer).toHaveAttribute("aria-checked", "true");
    });
  });

  it("saves submission state to session storage", async () => {
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Select and submit an answer
    const answer = screen.getByRole("radio", { name: "4" });
    await userEvent.click(answer);

    const submitButton = screen.getByRole("button", { name: /check answer/i });
    await userEvent.click(submitButton);

    // Verify that showResult is saved as true after submission
    await waitFor(() => {
      const stored = sessionStorage.getItem("quiz-1-1");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.showResult).toBe(true);
    });
  });

  it("restores submission result from session storage", async () => {
    // Pre-populate with a submitted correct answer
    sessionStorage.setItem(
      "quiz-1-1",
      JSON.stringify({
        answerIds: ["2"],
        showResult: true,
        timestamp: Date.now(),
      }),
    );

    // Render the component
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Verify the result screen is shown immediately (not the form)
    await waitFor(() => {
      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/right/i);
    });
  });

  it("restores incorrect answer result from session storage", async () => {
    // Pre-populate with a submitted incorrect answer
    sessionStorage.setItem(
      "quiz-1-1",
      JSON.stringify({
        answerIds: ["1"],
        showResult: true,
        timestamp: Date.now(),
      }),
    );

    // Render the component
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Verify the "Not Quite" result is shown immediately
    await waitFor(() => {
      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/not quite/i);
    });
  });

  it("persists answers across multiple question instances with different lessonIds", async () => {
    // Render quiz for lesson 1
    const { unmount } = render(
      <QuizQuestionBlock question={mockQuestion} lessonId={1} />,
    );

    // Select an answer and verify it's stored
    const answer1 = screen.getByRole("radio", { name: "4" });
    await userEvent.click(answer1);

    await waitFor(() => {
      expect(sessionStorage.getItem("quiz-1-1")).toBeTruthy();
    });

    // Unmount and render the same question for lesson 2
    unmount();
    render(<QuizQuestionBlock question={mockQuestion} lessonId={2} />);

    // Verify the answer is NOT restored (different lesson)
    await waitFor(() => {
      const answer = screen.getByRole("radio", {
        name: "4",
      });
      // Check aria-checked attribute for Radix UI radio buttons
      expect(answer).toHaveAttribute("aria-checked", "false");
    });
  });
  it("handles multiple correct answers in session storage", async () => {
    // Create a question with multiple correct answers
    const multipleAnswerQuestion = {
      id: 2,
      content: "Select all that apply",
      answerOptions: [
        { id: 4, content: "A", isCorrect: true },
        { id: 5, content: "B", isCorrect: true },
        { id: 6, content: "C", isCorrect: false },
      ],
    };

    render(
      <QuizQuestionBlock
        question={multipleAnswerQuestion}
        lessonId={mockLessonId}
      />,
    );

    // Select multiple answers
    const answer1 = screen.getByRole("checkbox", { name: "A" });
    const answer2 = screen.getByRole("checkbox", { name: "B" });
    await userEvent.click(answer1);
    await userEvent.click(answer2);

    // Verify both answers are saved in storage
    await waitFor(() => {
      const stored = sessionStorage.getItem("quiz-1-2");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.answerIds).toEqual(expect.arrayContaining(["4", "5"]));
      expect(parsed.answerIds).toHaveLength(2);
    });
  });

  it("updates storage when changing answer before submission", async () => {
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Select first answer
    const firstAnswer = screen.getByRole("radio", { name: "3" });
    await userEvent.click(firstAnswer);

    // Verify first answer is saved
    await waitFor(() => {
      const stored = sessionStorage.getItem("quiz-1-1");
      const parsed = JSON.parse(stored!);
      expect(parsed.answerIds).toEqual(["1"]);
    });

    // Change to a different answer
    const secondAnswer = screen.getByRole("radio", { name: "4" });
    await userEvent.click(secondAnswer);

    // Verify storage is updated with the new answer
    await waitFor(() => {
      const stored = sessionStorage.getItem("quiz-1-1");
      const parsed = JSON.parse(stored!);
      expect(parsed.answerIds).toEqual(["2"]);
    });
  });

  it("resets showResult state when trying again", async () => {
    // Start with a submitted wrong answer in storage
    sessionStorage.setItem(
      "quiz-1-1",
      JSON.stringify({
        answerIds: ["1"],
        showResult: true,
        timestamp: Date.now(),
      }),
    );

    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Verify the result is shown initially
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    // Click "Try Again" button
    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    await userEvent.click(tryAgainButton);

    // Verify the form reappears and result is hidden
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /check answer/i }),
      ).toBeInTheDocument();
    });
  });

  it("does not restore data when storage is empty", () => {
    // Render with no data in storage
    render(
      <QuizQuestionBlock question={mockQuestion} lessonId={mockLessonId} />,
    );

    // Verify all radio buttons are unchecked using aria-checked
    const radios = screen.getAllByRole("radio");
    radios.forEach((radio) => {
      expect(radio).toHaveAttribute("aria-checked", "false");
    });

    // Verify the form is shown (not the result screen)
    expect(
      screen.getByRole("button", { name: /check answer/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("QuizQuestionBlock - formatted content (ODY-445)", () => {
  const mockLessonId = 99;

  beforeEach(() => {
    mockSessionStorage.clear();
  });

  it("renders inline <code> in the question stem", () => {
    const question = {
      id: 10,
      content: "<p>What does <code>print(x)</code> output?</p>",
      answerOptions: [
        { id: 101, content: "42", isCorrect: true },
        { id: 102, content: "None", isCorrect: false },
      ],
    };
    render(<QuizQuestionBlock question={question} lessonId={mockLessonId} />);
    // The <code> element should be in the DOM
    expect(document.querySelector("code")).toBeInTheDocument();
  });

  it("renders a <pre><code> block in the question stem", () => {
    const question = {
      id: 11,
      content: "<pre><code>def foo():\n  return 1</code></pre>",
      answerOptions: [
        { id: 111, content: "1", isCorrect: true },
        { id: 112, content: "0", isCorrect: false },
      ],
    };
    render(<QuizQuestionBlock question={question} lessonId={mockLessonId} />);
    expect(document.querySelector("pre")).toBeInTheDocument();
    expect(document.querySelector("code")).toBeInTheDocument();
  });

  it("renders inline code inside an answer option without invalid nesting", () => {
    const question = {
      id: 12,
      content: "<p>Which snippet is correct?</p>",
      answerOptions: [
        { id: 121, content: "<code>x = 1</code>", isCorrect: true },
        { id: 122, content: "<code>x == 1</code>", isCorrect: false },
      ],
    };
    render(<QuizQuestionBlock question={question} lessonId={mockLessonId} />);
    // Both code elements should appear (one per answer)
    const codeElements = document.querySelectorAll("code");
    expect(codeElements.length).toBeGreaterThanOrEqual(2);
    // The code elements must NOT be inside a <span> (was the old broken wrapping)
    codeElements.forEach((el) => {
      expect(el.closest("span")).toBeNull();
    });
  });

  it("strips dangerous XSS content from question stem via DOMPurify.sanitize", () => {
    // Access the mock spy via requireMock (safe after hoisting)
    const DOMPurify = jest.requireMock<{ default: { sanitize: jest.Mock } }>(
      "isomorphic-dompurify",
    ).default;

    // Override the mock to simulate DOMPurify stripping <script> tags
    DOMPurify.sanitize.mockImplementation((html: string) =>
      html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ""),
    );

    const question = {
      id: 13,
      content: '<p>Hello</p><script>alert("xss")</script>',
      answerOptions: [
        { id: 131, content: "A", isCorrect: true },
        { id: 132, content: "B", isCorrect: false },
      ],
    };
    render(<QuizQuestionBlock question={question} lessonId={mockLessonId} />);
    // script should not be in the rendered DOM after sanitization
    expect(document.querySelector("script")).toBeNull();
    // DOMPurify.sanitize should have been called with the original content
    expect(DOMPurify.sanitize).toHaveBeenCalledWith(
      '<p>Hello</p><script>alert("xss")</script>',
    );

    // Restore default mock behaviour for other tests
    DOMPurify.sanitize.mockImplementation((html: string) => html);
  });

  it("plain-text legacy answers still render correctly", () => {
    const question = {
      id: 14,
      content: "<p>What is 1 + 1?</p>",
      answerOptions: [
        { id: 141, content: "2", isCorrect: true },
        { id: 142, content: "3", isCorrect: false },
      ],
    };
    render(<QuizQuestionBlock question={question} lessonId={mockLessonId} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
