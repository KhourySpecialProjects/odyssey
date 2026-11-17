import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizQuestionBlock } from "@/components/droplets/lessons/quiz-question";
import { OpenEndedQuizQuestionBlock } from "@/components/droplets/lessons/open-ended-quiz-question-block";
import { recordQuizAttempt } from "@/lib/requests/quiz-attempt";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { init: jest.fn(), identify: jest.fn(), capture: jest.fn() },
}));
jest.mock("@/lib/requests/quiz-attempt", () => ({
  recordQuizAttempt: jest.fn(),
}));

const mockedRecord = jest.mocked(recordQuizAttempt);
const ids = { userId: 5, dropletId: 7, lessonId: 11 };

const choice = {
  id: 21,
  content: "<p>Pick one</p>",
  answerOptions: [
    { id: 1, content: "<p>Right</p>", isCorrect: true },
    { id: 2, content: "<p>Wrong</p>", isCorrect: false },
  ],
};
const openEnded = {
  id: 31,
  content: "<p>Capital?</p>",
  correctAnswer: "Paris",
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockedRecord.mockResolvedValue({ ok: true });
});

describe("quiz attempt on submit (ODY-939)", () => {
  it("saves a choice submit once, with a fresh submitId each time", async () => {
    const user = userEvent.setup();
    render(<QuizQuestionBlock question={choice} {...ids} />);

    await user.click(screen.getAllByRole("radio")[1]);
    await user.click(screen.getByRole("button", { name: "Check Answer" }));
    await user.click(screen.getByRole("button", { name: /Try Again/ }));
    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: "Check Answer" }));

    expect(mockedRecord).toHaveBeenCalledTimes(2);
    const [first, second] = mockedRecord.mock.calls.map((c) => c[0]) as {
      submitId: string;
    }[];
    expect(first).toMatchObject({
      dropletId: 7,
      lessonId: 11,
      quizType: "choice",
      questionId: 21,
      correct: false,
    });
    expect(second).toMatchObject({ correct: true });
    expect(first.submitId).not.toBe(second.submitId);
    expect(first).not.toHaveProperty("userId");
  });

  it("saves an open-ended submit with its exact-match result", async () => {
    const user = userEvent.setup();
    render(<OpenEndedQuizQuestionBlock question={openEnded} {...ids} />);

    await user.type(screen.getByPlaceholderText(/Type your answer/), "paris");
    await user.click(screen.getByText("Check Answer"));

    expect(mockedRecord).toHaveBeenCalledTimes(1);
    expect(mockedRecord.mock.calls[0][0]).toMatchObject({
      quizType: "open-ended",
      questionId: 31,
      correct: true,
    });
  });

  it("saves nothing without a user, droplet or lesson", async () => {
    const user = userEvent.setup();
    render(<OpenEndedQuizQuestionBlock question={openEnded} dropletId={7} />);

    await user.type(screen.getByPlaceholderText(/Type your answer/), "x");
    await user.click(screen.getByText("Check Answer"));

    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it("still shows the result when the save rejects or fails", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    mockedRecord.mockRejectedValueOnce(new Error("down"));
    const user = userEvent.setup();
    render(<QuizQuestionBlock question={choice} {...ids} />);

    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: "Check Answer" }));

    expect(await screen.findByText(/Right/)).toBeInTheDocument();
  });
});
