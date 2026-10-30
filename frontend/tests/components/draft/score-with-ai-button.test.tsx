import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ScoreWithAiButton } from "@/components/draft/review/score-with-ai-button";
import { getAiScoringRun, startAiScoring } from "@/lib/requests/ai-scoring";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: jest.fn() }),
  usePathname: () => "/draft/d/intro-to-git",
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/lib/requests/ai-scoring", () => ({
  getAiScoringRun: jest.fn(),
  startAiScoring: jest.fn(),
}));

const run = (runState: string, extra = {}) => ({
  id: 40,
  runState,
  startedAt: null,
  finishedAt: null,
  failedLessons: [],
  error: null,
  ...extra,
});
const ok = (data: unknown) => ({ ok: true, error: null, data });

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getAiScoringRun).mockResolvedValue(ok(null) as never);
});

afterEach(() => jest.useRealTimers());

describe("ScoreWithAiButton", () => {
  it("starts a run and says it is scoring", async () => {
    jest.mocked(startAiScoring).mockResolvedValue(ok(run("queued")) as never);
    render(<ScoreWithAiButton dropletId={3} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Score with AI" }),
    );

    expect(startAiScoring).toHaveBeenCalledWith(3);
    expect(
      screen.getByRole("button", { name: "Scoring with AI…" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Scoring every lesson. You can keep reviewing.",
    );
  });

  it("polls until the run ends, then refreshes so the suggestions load", async () => {
    jest.useFakeTimers();
    jest
      .mocked(getAiScoringRun)
      .mockResolvedValueOnce(ok(run("running")) as never)
      .mockResolvedValueOnce(ok(run("running")) as never)
      .mockResolvedValueOnce(
        ok(run("partial", { failedLessons: [12] })) as never,
      );
    render(<ScoreWithAiButton dropletId={3} />);
    await screen.findByText("Scoring every lesson. You can keep reviewing.");

    await act(() => jest.advanceTimersByTimeAsync(5000));
    expect(refresh).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTimeAsync(5000));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      "AI suggestions are ready, except for 1 lesson it couldn't score.",
    );
    expect(
      screen.getByRole("button", { name: "Score with AI again" }),
    ).toBeEnabled();
  });

  it("waits for a slow check before the next one, and announces the end once", async () => {
    jest.useFakeTimers();
    let answer: (value: unknown) => void = () => {};
    jest
      .mocked(getAiScoringRun)
      .mockResolvedValueOnce(ok(run("running")) as never)
      .mockImplementationOnce(
        () => new Promise((resolve) => (answer = resolve)) as never,
      );
    render(<ScoreWithAiButton dropletId={3} />);
    await screen.findByText("Scoring every lesson. You can keep reviewing.");

    await act(() => jest.advanceTimersByTimeAsync(30_000));
    // The mount read and one check still waiting: nothing stacked up.
    expect(getAiScoringRun).toHaveBeenCalledTimes(2);

    await act(async () => answer(ok(run("done"))));
    await act(() => jest.advanceTimersByTimeAsync(30_000));

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(getAiScoringRun).toHaveBeenCalledTimes(2);
  });

  it("stops checking when it's refused", async () => {
    jest.useFakeTimers();
    jest
      .mocked(getAiScoringRun)
      .mockResolvedValueOnce(ok(run("running")) as never)
      .mockResolvedValue({
        ok: false,
        error: "forbidden",
        data: null,
      } as never);
    render(<ScoreWithAiButton dropletId={3} />);
    await screen.findByText("Scoring every lesson. You can keep reviewing.");

    await act(() => jest.advanceTimersByTimeAsync(60_000));

    expect(getAiScoringRun).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["rate_limited", "Rate limit reached. Try again in 5 minutes."],
    [
      "conflict",
      "This month's Score with AI budget is used up. It resets on November 1.",
    ],
  ])("shows why a start was refused (%s)", async (error, message) => {
    jest.mocked(startAiScoring).mockResolvedValue({
      ok: false,
      error,
      data: null,
      message,
    } as never);
    render(<ScoreWithAiButton dropletId={3} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Score with AI" }),
    );

    expect(toast.error).toHaveBeenCalledWith(message);
    expect(screen.getByRole("button", { name: "Score with AI" })).toBeEnabled();
  });

  it.each([
    [
      "partial",
      [12],
      "Suggestions are ready, except for 1 lesson and the Overall Score.",
    ],
    ["partial", [], "Suggestions are ready, except for the Overall Score."],
    ["failed", [11, 12], "Nothing was scored."],
  ])(
    "says a %s run with failed lessons %j stopped at the per-run cost limit",
    async (runState, failedLessons, rest) => {
      jest.mocked(getAiScoringRun).mockResolvedValue(
        ok(
          run(runState, {
            failedLessons,
            error: "Stopped at the per-run cost ceiling",
          }),
        ) as never,
      );
      render(<ScoreWithAiButton dropletId={3} />);

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          `Score with AI stopped at its cost limit for one run. ${rest}`,
        ),
      );
    },
  );

  it("says when the last run failed", async () => {
    jest.mocked(getAiScoringRun).mockResolvedValue(ok(run("failed")) as never);
    render(<ScoreWithAiButton dropletId={3} />);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Score with AI couldn't finish. Try again.",
      ),
    );
    expect(
      screen.getByRole("button", { name: "Score with AI again" }),
    ).toBeEnabled();
  });
});
