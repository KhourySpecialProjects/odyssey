import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizQuestionBlock } from "@/components/droplets/lessons/quiz-question";
import type { QuizQuestion } from "@/types";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { init: jest.fn(), identify: jest.fn(), capture: jest.fn() },
}));

const question = (correct: number): QuizQuestion => ({
  id: 1,
  content: "<p>Pick</p>",
  answerOptions: [
    { id: 11, content: "<p>Alpha</p>", isCorrect: correct >= 1 },
    {
      id: 12,
      content: "<p>Beta</p><pre><code>let x = 1;</code></pre>",
      isCorrect: correct >= 2,
    },
  ],
});

const renderQuestion = (correct: number) =>
  render(<QuizQuestionBlock question={question(correct)} lessonId={1} />);

beforeEach(() => sessionStorage.clear());

describe.each([
  ["radio", 1, "radio"],
  ["checkbox", 2, "checkbox"],
] as const)("quiz %s answers", (_name, correct, role) => {
  it("keeps block content out of labels", async () => {
    const { container } = renderQuestion(correct);
    await screen.findAllByRole(role);
    expect(container.querySelector("label div")).toBeNull();
  });

  it("names each input from its answer text", async () => {
    renderQuestion(correct);
    expect(
      await screen.findByRole(role, { name: "Alpha" }),
    ).toBeInTheDocument();
    expect(screen.getByRole(role, { name: /^Beta/ })).toBeInTheDocument();
  });

  it("selects the answer when its text is clicked", async () => {
    renderQuestion(correct);
    await screen.findByRole(role, { name: "Alpha" });
    await userEvent.click(screen.getByText("Alpha"));
    await waitFor(() =>
      expect(screen.getByRole(role, { name: "Alpha" })).toBeChecked(),
    );
  });
});
