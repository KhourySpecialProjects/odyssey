import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ReviewTranscript } from "@/components/draft/review/review-transcript";
import { useSharedReviewComments } from "@/components/draft/review/review-comments-context";
import {
  acceptAiScores,
  sendFeedback,
  unconfirmScores,
} from "@/lib/requests/reviews";
import {
  ReviewFocusProvider,
  useReviewFocus,
} from "@/components/draft/review/review-focus-context";
import { mockAiFinding } from "@/testing/mocks/reviewsMock";
import { startAiScoring } from "@/lib/requests/ai-scoring";
import type { ReviewPanelData } from "@/lib/requests/reviews";

const push = jest.fn();
const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => "/draft/d/intro",
}));
jest.mock("@/lib/requests/reviews");
jest.mock("@/lib/requests/droplet");
jest.mock("@/lib/requests/ai-scoring", () => ({ startAiScoring: jest.fn() }));
jest.mock("sonner");
jest.mock("@/components/draft/review/review-comments-context", () => ({
  useSharedReviewComments: jest.fn(),
}));

const droplet = {
  id: 3,
  name: "Intro",
  slug: "intro",
  status: "draft",
  inReview: true,
  lessons: [
    { id: 11, name: "Variables", slug: "variables", orderIndex: 0 },
    { id: 12, name: "Loops", slug: "loops", orderIndex: 1 },
  ],
} as never;

const criteria = [{ id: 2, name: "Tone", order: 0, active: true }];

const finding = {
  id: "8-1",
  quote: "beta",
  reason: "Too vague.",
  lessonId: 12,
  anchor: { v: 1, field: "blocks", quote: "beta", prefix: "", suffix: "" },
};

const score = (lessonId: number | null, over = {}) => ({
  id: 1,
  key: `70:${lessonId ?? "overall"}:2`,
  criterionName: "Tone",
  lessonId,
  criterionId: 2,
  value: null,
  aiValue: 2,
  ...over,
});

const panel = (scores: object[] = []): ReviewPanelData =>
  ({
    review: { id: 70, round: 1, state: "open" },
    criteria,
    scores,
    latestRun: null,
    positions: {},
  }) as never;

const ensureReview = jest
  .fn()
  .mockResolvedValue({ ok: true, data: { id: 70 } });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.mocked(useSharedReviewComments).mockReturnValue({
    comments: [],
    review: { id: 70, state: "open" },
    ensureReview,
  } as never);
});

const publish = () => screen.getByRole("button", { name: "Publish droplet" });

describe("footer", () => {
  it("disables Publish until every Overall score has a value", async () => {
    const { rerender } = render(
      <ReviewTranscript
        droplet={droplet}
        panel={panel([score(null, { value: null })])}
      />,
    );

    expect(publish()).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText(/Confirm the Overall Score to publish/),
    ).toBeInTheDocument();

    rerender(
      <ReviewTranscript
        droplet={droplet}
        panel={panel([score(null, { value: 2 })])}
      />,
    );
    expect(publish()).not.toHaveAttribute("aria-disabled");
    await userEvent.click(publish());
    expect(
      screen.getByPlaceholderText("Enter droplet name"),
    ).toBeInTheDocument();
  });

  it("still renders the footer when the scores did not load", async () => {
    render(<ReviewTranscript droplet={droplet} panel={null} />);

    expect(publish()).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText("Couldn't load scores. Reload to try again."),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Send feedback" }),
    );
    expect(
      screen.getByRole("heading", { name: "Send feedback" }),
    ).toBeVisible();
  });
});

describe("summary note", () => {
  it("is labelled optional and has a placeholder", () => {
    render(<ReviewTranscript droplet={droplet} panel={panel()} />);

    expect(screen.getByLabelText("Summary note (optional)")).toHaveAttribute(
      "placeholder",
      "Anything the creator should know about the droplet as a whole",
    );
  });

  it("is saved in localStorage and pre-fills Send feedback", async () => {
    render(<ReviewTranscript droplet={droplet} panel={panel()} />);

    await userEvent.type(
      screen.getByLabelText(/summary note/i),
      "Needs a clearer intro",
    );
    expect(localStorage.getItem("review-note:70")).toBe(
      "Needs a clearer intro",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Send feedback" }),
    );
    expect(screen.getByLabelText(/optional summary/i)).toHaveValue(
      "Needs a clearer intro",
    );
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it("restores a saved note", () => {
    localStorage.setItem("review-note:70", "Saved");
    render(<ReviewTranscript droplet={droplet} panel={panel()} />);

    expect(screen.getByLabelText(/summary note/i)).toHaveValue("Saved");
  });
});

describe("wiring", () => {
  it("confirms a card through the shared scores hook", async () => {
    jest.mocked(acceptAiScores).mockResolvedValue({
      ok: true,
      error: null,
      data: [{ key: "70:11:2", value: 2 }],
    } as never);
    render(
      <ReviewTranscript
        droplet={droplet}
        panel={panel([score(11, { aiValue: 2 })])}
      />,
    );
    const card = screen.getByRole("region", { name: "Variables" });

    await userEvent.click(
      within(card).getByRole("button", { name: "Confirm scores" }),
    );

    expect(acceptAiScores).toHaveBeenCalledWith(70, 11);
    expect(await within(card).findByText("Scores confirmed")).toBeVisible();
  });

  it("shows Overall findings with a lesson tag that opens the lesson", async () => {
    render(
      <ReviewTranscript
        droplet={droplet}
        panel={panel([score(null, { aiFindings: [finding] })])}
      />,
    );
    const card = screen.getByRole("region", { name: "Overall Score" });

    await userEvent.click(within(card).getByRole("button", { name: /^Tone/ }));

    expect(within(card).getByText("Lesson 2")).toBeInTheDocument();
    await userEvent.click(
      within(card).getByRole("button", { name: /show in lesson/i }),
    );
    expect(push).toHaveBeenCalledWith("/draft/d/intro/loops");
  });

  it("drops a dismissed finding from the issue count", async () => {
    render(
      <ReviewTranscript
        droplet={droplet}
        panel={panel([score(12, { aiFindings: [finding] })])}
      />,
    );
    const card = screen.getByRole("region", { name: "Loops" });
    expect(
      within(card).getByRole("button", { name: /1 issue/ }),
    ).toBeInTheDocument();

    await userEvent.click(within(card).getByRole("button", { name: /^Tone/ }));
    await userEvent.click(
      within(card).getByRole("button", { name: /not an issue/i }),
    );

    expect(
      within(card).getByRole("button", { name: /^Tone.*no issues/ }),
    ).toBeInTheDocument();
  });
});

describe("open detail for the lesson's finding marks", () => {
  const Probe = () => {
    const open = useReviewFocus()?.openDetail;
    return (
      <output data-testid="probe">
        {open
          ? `${open.band}:${open.findings.map((f) => `${f.number}=${f.finding.id}`).join(",")}`
          : "none"}
      </output>
    );
  };
  const mount = (active: boolean) =>
    render(
      <ReviewFocusProvider active={active}>
        <Probe />
        <ReviewTranscript
          droplet={droplet}
          panel={panel([
            score(12, {
              aiValue: 2,
              aiFindings: [
                mockAiFinding({ id: "a", lessonId: 12 }),
                mockAiFinding({ id: "b", lessonId: 12 }),
              ],
            }),
          ])}
        />
      </ReviewFocusProvider>,
    );

  it("follows the open circle and its undismissed findings", async () => {
    mount(true);
    const card = screen.getByRole("region", { name: "Loops" });
    await userEvent.click(within(card).getByRole("button", { name: /^Tone/ }));
    expect(screen.getByTestId("probe")).toHaveTextContent("needs_work:1=a,2=b");

    await userEvent.click(
      within(card).getAllByRole("button", { name: /not an issue/i })[0],
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("needs_work:1=b");

    await userEvent.click(
      within(card).getByRole("button", { name: /close tone details/i }),
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("none");
  });

  it("is hidden while the panel is a rail", async () => {
    mount(false);
    const card = screen.getByRole("region", { name: "Loops" });
    await userEvent.click(within(card).getByRole("button", { name: /^Tone/ }));
    expect(screen.getByTestId("probe")).toHaveTextContent("none");
  });
});

describe("per-criterion state and the shell link", () => {
  const two = (): ReviewPanelData =>
    ({
      ...panel([
        score(11, { value: 3, aiValue: 3 }),
        score(11, {
          id: 2,
          key: "70:11:3",
          criterionId: 3,
          criterionName: "Style",
          value: 4,
          aiValue: 4,
        }),
      ]),
      criteria: [
        { id: 2, name: "Tone", order: 0, active: true },
        { id: 3, name: "Style", order: 1, active: true },
      ],
    }) as never;

  it("does not carry the Change control between criteria", async () => {
    render(<ReviewTranscript droplet={droplet} panel={two()} />);
    const card = screen.getByRole("region", { name: "Variables" });

    await userEvent.click(within(card).getByRole("button", { name: /^Tone/ }));
    await userEvent.click(
      within(card).getByRole("button", { name: /disagree/i }),
    );
    expect(within(card).getByRole("radiogroup")).toBeInTheDocument();

    await userEvent.click(within(card).getByRole("button", { name: /^Style/ }));

    expect(within(card).queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(
      within(card).getByRole("region", { name: "Style details" }),
    ).toBeInTheDocument();
  });

  it("tells the shell its scores, and clears them on unmount", () => {
    const onScoresChange = jest.fn();
    const { unmount } = render(
      <ReviewTranscript
        droplet={droplet}
        panel={panel([score(11)])}
        onScoresChange={onScoresChange}
      />,
    );
    expect(onScoresChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ lessonId: 11 }),
    ]);

    unmount();

    expect(onScoresChange).toHaveBeenLastCalledWith(null);
  });
});

describe("confirm and undo end to end", () => {
  it("confirming the Overall card enables Publish", async () => {
    jest.mocked(acceptAiScores).mockResolvedValue({
      ok: true,
      error: null,
      data: [{ key: "70:overall:2", value: 2 }],
    } as never);
    render(
      <ReviewTranscript
        droplet={droplet}
        panel={panel([score(null, { value: null, aiValue: 2 })])}
      />,
    );
    expect(publish()).toHaveAttribute("aria-disabled", "true");
    const overall = screen.getByRole("region", { name: "Overall Score" });

    await userEvent.click(
      within(overall).getByRole("button", { name: "Confirm scores" }),
    );

    expect(acceptAiScores).toHaveBeenCalledWith(70, null);
    await within(overall).findByText("Scores confirmed");
    expect(publish()).not.toHaveAttribute("aria-disabled");
  });

  it("Undo calls unconfirmScores and the card goes back to To confirm", async () => {
    jest.mocked(unconfirmScores).mockResolvedValue({
      ok: true,
      error: null,
      data: [{ key: "70:11:2", value: null }],
    } as never);
    render(
      <ReviewTranscript
        droplet={droplet}
        panel={panel([score(11, { value: 2, aiValue: 2 })])}
      />,
    );
    const card = screen.getByRole("region", { name: "Variables" });
    expect(within(card).getByText("Confirmed")).toBeInTheDocument();

    await userEvent.click(within(card).getByRole("button", { name: "Undo" }));

    expect(unconfirmScores).toHaveBeenCalledWith(70, 11);
    expect(await within(card).findByText("To confirm")).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "Confirm scores" }),
    ).toBeInTheDocument();
  });
});

describe("Score with AI in the panel", () => {
  const withRun = (latestRun: object | null): ReviewPanelData =>
    ({ ...panel(), latestRun }) as never;
  const scoreButton = () =>
    screen.getByRole("button", { name: /score with ai|scoring with ai/i });

  it("starts a run, toasts and refreshes so the queued run loads", async () => {
    jest.mocked(startAiScoring).mockResolvedValue({
      ok: true,
      error: null,
      data: { runId: 9 },
    } as never);
    render(<ReviewTranscript droplet={droplet} panel={withRun(null)} />);

    await userEvent.click(scoreButton());

    expect(startAiScoring).toHaveBeenCalledWith(3);
    expect(toast.success).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["conflict", undefined, "Score with AI is already running on your review."],
    [
      "rate_limited",
      undefined,
      "You've used Score with AI too often. Try again later.",
    ],
    ["rate_limited", "Try again in 2 minutes.", "Try again in 2 minutes."],
  ])(
    "toasts a %s refusal and does not refresh",
    async (error, message, text) => {
      jest
        .mocked(startAiScoring)
        .mockResolvedValue({ ok: false, error, data: null, message } as never);
      render(<ReviewTranscript droplet={droplet} panel={withRun(null)} />);

      await userEvent.click(scoreButton());

      expect(toast.error).toHaveBeenCalledWith(text);
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it("toasts a fixed message when the start throws", async () => {
    jest.mocked(startAiScoring).mockRejectedValue(new Error("offline"));
    render(<ReviewTranscript droplet={droplet} panel={withRun(null)} />);

    await userEvent.click(scoreButton());

    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't start Score with AI. Try again.",
    );
  });

  it("is disabled while a start is in flight", async () => {
    let finish!: (v: unknown) => void;
    jest
      .mocked(startAiScoring)
      .mockReturnValue(new Promise((r) => (finish = r)) as never);
    render(<ReviewTranscript droplet={droplet} panel={withRun(null)} />);

    await userEvent.click(scoreButton());
    const button = screen.getByRole("button", { name: "Starting…" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(startAiScoring).toHaveBeenCalledTimes(1);

    finish({ ok: false, error: "conflict", data: null });
  });

  it("is disabled while a run is running", async () => {
    render(
      <ReviewTranscript
        droplet={droplet}
        panel={withRun({ id: 4, runState: "running", progress: null })}
      />,
    );

    const button = scoreButton();
    expect(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(button);
    expect(startAiScoring).not.toHaveBeenCalled();
  });

  it("offers Run again once a run is done", async () => {
    jest.mocked(startAiScoring).mockResolvedValue({
      ok: true,
      error: null,
      data: { runId: 10 },
    } as never);
    render(
      <ReviewTranscript
        droplet={droplet}
        panel={withRun({ id: 4, runState: "done" })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Run again" }));

    expect(startAiScoring).toHaveBeenCalledWith(3);
  });
});
