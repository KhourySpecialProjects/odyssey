import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import posthog from "posthog-js";
import { QuizQuestionBlock } from "@/components/droplets/lessons/quiz-question";
import { displayBlocksOf } from "@/lib/blocknote/convert-blocks";
import { saveMentorFeedback } from "@/lib/requests/mentor-feedback";
import { useLessonPanelStore } from "@/stores/lesson-panel-store";
import { classicLesson } from "@/testing/mocks/mentorLessonMock";
import {
  mentorCitation,
  mentorDone,
  mentorHttpErrorResponse,
  mentorSseResponse,
  mentorText,
} from "@/testing/mocks/mentorEventsMock";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { init: jest.fn(), identify: jest.fn(), capture: jest.fn() },
}));
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
jest.mock("@/lib/requests/mentor-feedback", () => ({
  saveMentorFeedback: jest.fn(),
}));

const fetchMock = jest.fn();
const capture = posthog.capture as jest.Mock;
const classic = classicLesson();
const question = displayBlocksOf(classic)
  .flatMap((b) => (b.__component === "droplets.quiz" ? b.questions : []))
  .find((q) => q.id === 41)!;

const names = () => capture.mock.calls.map((c) => c[0]);
const callsOf = (name: string) =>
  capture.mock.calls.filter((c) => c[0] === name);
const explainButton = () =>
  screen.queryByRole("button", { name: /Explain my answer/ });
const checkAnswer = async (
  user: ReturnType<typeof userEvent.setup>,
  n: number,
) => {
  await user.click(screen.getAllByRole("radio")[n]);
  await user.click(screen.getByRole("button", { name: "Check Answer" }));
};
const hintDone = (text = "Hint.") =>
  fetchMock.mockImplementation(async (_u, init) =>
    mentorSseResponse(
      [mentorText(text), mentorDone({ citations: [mentorCitation()] })],
      { signal: init.signal },
    ),
  );

const setup = async () => {
  render(
    <QuizQuestionBlock
      question={question}
      lessonId={classic.id}
      dropletId={7}
    />,
  );
  const user = userEvent.setup();
  await checkAnswer(user, 1);
  return user;
};
const explain = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(explainButton()!);
  await screen.findByRole("button", { name: "Good answer" });
};

beforeEach(() => {
  // jsdom's crypto has no randomUUID; the hint id is a UUID in a browser
  let n = 0;
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () =>
      `7b1f0c2e-3a4d-4e5f-8a9b-0c1d2e3f${String(++n).padStart(4, "0")}`,
  });
  window.sessionStorage.clear();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  capture.mockClear();
  jest
    .mocked(saveMentorFeedback)
    .mockResolvedValue({ ok: true, canShare: false, promptVersion: "v1" });
  useLessonPanelStore.setState({
    ownerLessonId: classic.id,
    mentorAvailable: true,
  });
});
afterEach(() => {
  Reflect.deleteProperty(globalThis.crypto, "randomUUID");
  useLessonPanelStore.setState({ ownerLessonId: null, mentorAvailable: false });
});

describe("Mentor hint ratings and next try (ODY-890)", () => {
  it("rates a finished hint as a quiz-hint with ids-only citations and no text", async () => {
    hintDone("SENTINEL-HINT [p2]");
    const user = await setup();
    await explain(user);
    await user.click(screen.getByRole("button", { name: "Good answer" }));

    await waitFor(() => expect(saveMentorFeedback).toHaveBeenCalledTimes(1));
    const sent = jest.mocked(saveMentorFeedback).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(sent).toEqual({
      answerKey: expect.stringMatching(/^[A-Za-z0-9-]{8,64}$/),
      kind: "quiz-hint",
      rating: "up",
      dropletId: 7,
      lessonId: classic.id,
      questionId: 41,
      citations: [{ ref: "p2", blockId: "para-2", blockIndex: 1 }],
      shared: false,
    });
    await waitFor(() => expect(callsOf("mentor_rated")).toHaveLength(1));
    expect(callsOf("mentor_rated")[0][1]).toMatchObject({
      kind: "quiz-hint",
      answer_key: sent.answerKey,
    });
  });

  it("fires the Explain events once each and keeps the quiz event's args", async () => {
    hintDone();
    const user = await setup();
    await explain(user);

    expect(names()).toEqual([
      "quiz_answer_submitted",
      "mentor_explain_answer",
      "mentor_asked",
    ]);
    expect(callsOf("mentor_explain_answer")[0][1]).toEqual({
      droplet_id: 7,
      lesson_id: classic.id,
      question_id: 41,
    });
    expect(callsOf("mentor_asked")[0][1]).toEqual({
      kind: "quiz-hint",
      droplet_id: 7,
      lesson_id: classic.id,
    });
    expect(callsOf("quiz_answer_submitted")[0][1]).toEqual({
      question_id: 41,
      question_title: expect.any(String),
      lesson_id: classic.id,
      lesson_name: undefined,
      droplet_id: 7,
      droplet_name: undefined,
      is_correct: false,
      quiz_type: "multiple_choice",
      user_id: undefined,
      page: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it("fires mentor_hint_next_try once, on the submit after the hint", async () => {
    hintDone();
    const user = await setup();
    await explain(user);
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    await checkAnswer(user, 0);

    expect(callsOf("mentor_hint_next_try")).toEqual([
      [
        "mentor_hint_next_try",
        {
          droplet_id: 7,
          lesson_id: classic.id,
          question_id: 41,
          is_correct: true,
        },
      ],
    ]);
    expect(callsOf("quiz_answered_correctly")).toHaveLength(1);
    expect(callsOf("quiz_answered_correctly")[0][1]).toEqual({
      question_id: 41,
      question_title: expect.any(String),
      lesson_id: classic.id,
      lesson_name: undefined,
      droplet_id: 7,
      droplet_name: undefined,
      quiz_type: "multiple_choice",
      user_id: undefined,
      page: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it("clears the flag after the next try, so a later submit fires nothing", async () => {
    hintDone();
    const user = await setup();
    await explain(user);
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    await checkAnswer(user, 1);
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    await checkAnswer(user, 0);

    expect(callsOf("mentor_hint_next_try")).toHaveLength(1);
    expect(callsOf("mentor_hint_next_try")[0][1]).toMatchObject({
      is_correct: false,
    });
  });

  it("fires no next-try after an errored hint or without a hint", async () => {
    fetchMock.mockResolvedValue(
      mentorHttpErrorResponse(403, { error: "forbidden", message: "No." }),
    );
    const user = await setup();
    await user.click(explainButton()!);
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    await checkAnswer(user, 0);

    expect(callsOf("mentor_hint_next_try")).toHaveLength(0);
  });

  it("counts one ask when the hint's retry follows a 500", async () => {
    fetchMock.mockResolvedValueOnce(
      mentorHttpErrorResponse(500, { error: "internal", message: "Snag." }),
    );
    const user = await setup();
    hintDone();
    await user.click(explainButton()!);
    await user.click(await screen.findByRole("button", { name: "Retry hint" }));
    await screen.findByRole("button", { name: "Good answer" });

    expect(callsOf("mentor_explain_answer")).toHaveLength(1);
    expect(callsOf("mentor_asked")).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fires no next-try when Try Again stops the hint mid-stream", async () => {
    fetchMock.mockImplementation(async (_u, init) =>
      mentorSseResponse([mentorText("Hint."), mentorDone()], {
        delayMs: 200,
        signal: init.signal,
      }),
    );
    const user = await setup();
    await user.click(explainButton()!);
    await screen.findByRole("region", { name: "Mentor hint" });
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    await checkAnswer(user, 0);
    await new Promise((r) => setTimeout(r, 300));

    expect(callsOf("mentor_hint_next_try")).toHaveLength(0);
  });

  it("never sends hint text to PostHog", async () => {
    hintDone("SENTINEL-HINT-3c9e [p2]");
    const user = await setup();
    await explain(user);
    await user.click(screen.getByRole("button", { name: "Good answer" }));
    await waitFor(() => expect(callsOf("mentor_rated")).toHaveLength(1));

    const box = screen.getByRole("region", { name: "Mentor hint" });
    expect(box).toHaveTextContent("SENTINEL-HINT-3c9e");
    expect(
      screen
        .getByRole("button", { name: "Good answer" })
        .closest(".ph-no-capture"),
    ).not.toBeNull();
    expect(JSON.stringify(capture.mock.calls)).not.toContain("SENTINEL-HINT");
    expect(
      JSON.stringify(jest.mocked(saveMentorFeedback).mock.calls),
    ).not.toContain("SENTINEL-HINT");
  });
});
