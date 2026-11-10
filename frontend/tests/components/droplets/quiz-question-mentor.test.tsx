import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import posthog from "posthog-js";
import { QuizQuestionBlock } from "@/components/droplets/lessons/quiz-question";
import { displayBlocksOf } from "@/lib/blocknote/convert-blocks";
import { useLessonPanelStore } from "@/stores/lesson-panel-store";
import type { MentorLesson } from "@/lib/mentor/types";
import {
  blockNoteLesson,
  classicLesson,
} from "@/testing/mocks/mentorLessonMock";
import {
  mentorDone,
  mentorHttpErrorResponse,
  mentorSseResponse,
  mentorText,
} from "@/testing/mocks/mentorEventsMock";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { init: jest.fn(), identify: jest.fn(), capture: jest.fn() },
}));

// react-markdown is ESM-only; a stand-in is enough to see the text
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

const fetchMock = jest.fn();
const classic = classicLesson();
const blockNote = blockNoteLesson();

const questionOf = (lesson: MentorLesson, id: number) => {
  const found = displayBlocksOf(lesson)
    .flatMap((block) =>
      block.__component === "droplets.quiz" ? block.questions : [],
    )
    .find((q) => q.id === id);
  if (!found) throw new Error(`No question ${id}`);
  return found;
};
const mcQuestion = () =>
  displayBlocksOf(blockNote).flatMap((block) =>
    block.__component === "droplets.quiz" ? block.questions : [],
  );

const renderQuiz = (
  question: ReturnType<typeof questionOf>,
  lesson: MentorLesson,
  props: { dropletId?: number | null } = {},
) =>
  render(
    <QuizQuestionBlock
      question={question}
      lessonId={lesson.id}
      dropletId={props.dropletId === null ? undefined : props.dropletId ?? 7}
    />,
  );

/** Picks the nth option and checks the answer */
const answer = async (n: number) => {
  const user = userEvent.setup();
  const radios = screen.getAllByRole("radio");
  await user.click(radios[n]);
  await user.click(screen.getByRole("button", { name: "Check Answer" }));
  return user;
};
const explainButton = () =>
  screen.queryByRole("button", { name: /Explain my answer/ });

beforeEach(() => {
  window.sessionStorage.clear();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  (posthog.capture as jest.Mock).mockClear();
  useLessonPanelStore.setState({
    ownerLessonId: classic.id,
    mentorAvailable: true,
  });
});
afterEach(() => {
  useLessonPanelStore.setState({ ownerLessonId: null, mentorAvailable: false });
});

describe("Explain my answer", () => {
  it("is absent before checking", () => {
    renderQuiz(questionOf(classic, 41), classic);
    expect(explainButton()).toBeNull();
  });

  it("is absent after a right answer", async () => {
    renderQuiz(questionOf(classic, 41), classic);
    await answer(0);
    expect(screen.getByText("That’s Right!")).toBeInTheDocument();
    expect(explainButton()).toBeNull();
  });

  it("is absent on a two-option question (Classic)", async () => {
    renderQuiz(questionOf(classic, 42), classic);
    await answer(0);
    expect(screen.getByText("Not Quite")).toBeInTheDocument();
    expect(explainButton()).toBeNull();
  });

  it("is absent on a true/false question (BlockNote)", async () => {
    useLessonPanelStore.setState({ ownerLessonId: blockNote.id });
    const tf = mcQuestion().find((q) => q.answerOptions.length === 2)!;
    renderQuiz(tf, blockNote);
    const radios = screen.getAllByRole("radio");
    const user = userEvent.setup();
    const wrong = tf.answerOptions.findIndex((o) => !o.isCorrect);
    await user.click(radios[wrong]);
    await user.click(screen.getByRole("button", { name: "Check Answer" }));
    expect(screen.getByText("Not Quite")).toBeInTheDocument();
    expect(explainButton()).toBeNull();
  });

  it("is absent on a checkbox question", async () => {
    renderQuiz(questionOf(classic, 43), classic);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("checkbox")[2]);
    await user.click(screen.getByRole("button", { name: "Check Answer" }));
    expect(screen.getByText("Not Quite")).toBeInTheDocument();
    expect(explainButton()).toBeNull();
  });

  it.each([
    ["Mentor is off", { mentorAvailable: false }, 7],
    ["it is another lesson's quiz", { ownerLessonId: 999 }, 7],
    ["there is no droplet", {}, null],
  ])("is absent when %s", async (_, store, dropletId) => {
    useLessonPanelStore.setState(store);
    renderQuiz(questionOf(classic, 41), classic, { dropletId });
    await answer(1);
    expect(screen.getByText("Not Quite")).toBeInTheDocument();
    expect(explainButton()).toBeNull();
  });

  it("shows for a wrong pick on a Classic multiple choice", async () => {
    renderQuiz(questionOf(classic, 41), classic);
    await answer(1);
    expect(explainButton()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeVisible();
  });

  it("shows for a wrong pick on a BlockNote multiple choice", async () => {
    useLessonPanelStore.setState({ ownerLessonId: blockNote.id });
    const mc = mcQuestion().find((q) => q.answerOptions.length >= 3)!;
    renderQuiz(mc, blockNote);
    const user = userEvent.setup();
    const wrong = mc.answerOptions.findIndex((o) => !o.isCorrect);
    await user.click(screen.getAllByRole("radio")[wrong]);
    await user.click(screen.getByRole("button", { name: "Check Answer" }));
    expect(explainButton()).toBeInTheDocument();
  });

  it("posts the exact body and streams the hint into the box", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      mentorSseResponse(
        [mentorText("A LEFT JOIN "), mentorText("keeps more."), mentorDone()],
        { signal: init.signal },
      ),
    );
    renderQuiz(questionOf(classic, 41), classic);
    const user = await answer(1);
    await user.click(explainButton()!);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      kind: "quiz-hint",
      dropletId: 7,
      lessonId: classic.id,
      questionId: 41,
      answerIds: [412],
    });
    const box = await screen.findByRole("region", { name: "Mentor hint" });
    expect(box).toHaveClass("ph-no-capture");
    expect(
      within(box).getByText("Mentor · a hint, not the answer"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(box).toHaveTextContent("A LEFT JOIN keeps more."),
    );
    expect(box).toHaveAttribute("aria-busy", "false");
    // Only the two result badges are role=status: the footer counts them
    expect(within(box).queryByRole("status")).toBeNull();
  });

  it("clears the hint on Try Again and brings the button back", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      mentorSseResponse([mentorText("Hint."), mentorDone()], {
        signal: init.signal,
      }),
    );
    renderQuiz(questionOf(classic, 41), classic);
    const user = await answer(1);
    await user.click(explainButton()!);
    await screen.findByRole("region", { name: "Mentor hint" });

    await user.click(screen.getByRole("button", { name: "Try Again" }));
    expect(screen.queryByRole("region", { name: "Mentor hint" })).toBeNull();
    await user.click(screen.getAllByRole("radio")[2]);
    await user.click(screen.getByRole("button", { name: "Check Answer" }));
    expect(explainButton()).toBeInTheDocument();
    expect(explainButton()).not.toHaveAttribute("aria-disabled", "true");
  });

  it("shows a lock message without a Try again link", async () => {
    fetchMock.mockResolvedValue(
      mentorHttpErrorResponse(429, {
        error: "daily_limit",
        message: "You've used today's Mentor questions.",
      }),
    );
    renderQuiz(questionOf(classic, 41), classic);
    const user = await answer(1);
    await user.click(explainButton()!);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("You've used today's Mentor questions.");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("fires only the existing PostHog event", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      mentorSseResponse([mentorText("Hint."), mentorDone()], {
        signal: init.signal,
      }),
    );
    renderQuiz(questionOf(classic, 41), classic);
    const user = await answer(1);
    await user.click(explainButton()!);
    await screen.findByRole("region", { name: "Mentor hint" });
    const names = (posthog.capture as jest.Mock).mock.calls.map((c) => c[0]);
    expect(names).toEqual(["quiz_answer_submitted"]);
  });
});
