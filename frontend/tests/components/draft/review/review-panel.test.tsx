import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewPanel } from "@/components/draft/review/review-panel";
import { useSharedReviewComments } from "@/components/draft/review/review-comments-context";
import type { ReviewPanelData } from "@/lib/requests/reviews";
import type { ReviewComment } from "@/types";

const push = jest.fn();
const refresh = jest.fn();
let pathname = "/draft/d/intro";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => pathname,
}));
jest.mock("@/components/draft/review/review-comments-context", () => ({
  useSharedReviewComments: jest.fn(),
}));

const droplet = {
  slug: "intro",
  lessons: [
    { id: 12, name: "Loops", slug: "loops", orderIndex: 1 },
    { id: 11, name: "Variables", slug: "variables", orderIndex: 0 },
  ],
};

const criteria = [
  { id: 2, name: "Tone", order: 0, active: true },
  { id: 3, name: "Style", order: 1, active: true },
];

const score = (lessonId: number | null, criterionId: number, over = {}) => ({
  id: criterionId * 100 + (lessonId ?? 0),
  key: `70:${lessonId ?? "overall"}:${criterionId}`,
  criterionName: criterionId === 2 ? "Tone" : "Style",
  lessonId,
  criterionId,
  value: null,
  aiValue: null,
  ...over,
});

const panel = (over: Partial<ReviewPanelData> = {}): ReviewPanelData => ({
  review: { id: 70, round: 1, state: "open" },
  criteria,
  scores: [],
  latestRun: null,
  positions: {},
  ...over,
});

const comment = (id: number, over: Partial<ReviewComment> = {}) =>
  ({
    id,
    field: "blocks",
    anchor: {
      v: 1,
      field: "blocks",
      blockId: "b",
      quote: `quote ${id}`,
      prefix: "",
      suffix: "",
    },
    body: `Body ${id}`,
    lesson: { id: 11 },
    resolvedAt: null,
    createdAt: "2026-10-29T12:00:00.000Z",
    ...over,
  }) as ReviewComment;

const setComments = (comments: ReviewComment[]) =>
  jest.mocked(useSharedReviewComments).mockReturnValue({
    comments,
    review: { id: 70, state: "open" },
  } as never);

const show = (data = panel(), extra: object = {}) =>
  render(
    <ReviewPanel
      droplet={droplet}
      panel={data}
      scores={data.scores}
      {...extra}
    />,
  );

const cardTitles = () =>
  screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

beforeEach(() => {
  jest.clearAllMocks();
  pathname = "/draft/d/intro";
  setComments([]);
});

describe("cards", () => {
  it("lists Overview, lessons by orderIndex, then Overall Score", () => {
    show();

    expect(cardTitles()).toEqual([
      "Overview",
      "Variables",
      "Loops",
      "Overall Score",
    ]);
    expect(screen.getByText(/isn't scored on its own/i)).toBeInTheDocument();
  });

  it("marks the card for the page on screen as Viewing", () => {
    pathname = "/draft/d/intro/loops";
    show();

    const loops = screen.getByRole("region", { name: "Loops" });
    expect(within(loops).getByText("Viewing")).toBeInTheDocument();
    expect(screen.getAllByText("Viewing")).toHaveLength(1);
  });

  it("marks the Overview when it is on screen", () => {
    show();

    const overview = screen.getByRole("region", { name: "Overview" });
    expect(within(overview).getByText("Viewing")).toBeInTheDocument();
  });

  it("draws a circle per active criterion by order, with Effective scores", () => {
    show(
      panel({
        scores: [
          score(11, 2, { aiValue: 4 }),
          score(11, 3, { value: 2, aiValue: 5 }),
        ],
      }),
    );

    const card = screen.getByRole("region", { name: "Variables" });
    const circles = within(card).getAllByRole("button", {
      name: /out of 5|not scored/,
    });
    const labels = circles.map((c) => c.getAttribute("aria-label")!);
    expect(labels[0]).toMatch(/^Tone/);
    expect(labels[0]).toMatch(/4 out of 5/);
    expect(labels[0]).toMatch(/suggested by AI$/);
    expect(labels[1]).toMatch(/^Style/);
    expect(labels[1]).not.toMatch(/suggested/);
  });

  it("shows To confirm until every criterion has a value, then Confirmed", () => {
    show(
      panel({
        scores: [
          score(11, 2, { aiValue: 4 }),
          score(11, 3, { aiValue: 4 }),
          score(12, 2, { value: 4, aiValue: 4 }),
          score(12, 3, { value: 3 }),
        ],
      }),
    );

    const vars = screen.getByRole("region", { name: "Variables" });
    const loops = screen.getByRole("region", { name: "Loops" });
    expect(within(vars).getByText("To confirm")).toBeInTheDocument();
    expect(within(loops).getByText("Confirmed")).toBeInTheDocument();
    const overall = screen.getByRole("region", { name: "Overall Score" });
    expect(within(overall).queryByText(/confirm/i)).toBeNull();
  });

  it("uses the scores prop, not panel.scores", () => {
    const data = panel({ scores: [score(11, 2, { aiValue: 1 })] });
    render(
      <ReviewPanel
        droplet={droplet}
        panel={data}
        scores={[score(11, 2, { value: 5 })]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Tone, 5 out of 5/ }),
    ).toBeInTheDocument();
  });

  it("renders the footer slot", () => {
    show(panel(), { footer: <button>Publish droplet</button> });

    expect(
      screen.getByRole("button", { name: "Publish droplet" }),
    ).toBeInTheDocument();
  });
});

describe("detail and action slots", () => {
  it("opens one detail per card under the circles and returns focus on close", async () => {
    const renderDetail = jest.fn(({ criterion, close }) => (
      <div>
        <p>Detail for {criterion.name}</p>
        <button onClick={close}>Close detail</button>
      </div>
    ));
    show(panel({ scores: [score(11, 2, { aiValue: 4 })] }), { renderDetail });
    const card = screen.getByRole("region", { name: "Variables" });
    const tone = within(card).getByRole("button", { name: /^Tone/ });
    const style = within(card).getByRole("button", { name: /^Style/ });

    await userEvent.click(tone);
    expect(tone).toHaveAttribute("aria-expanded", "true");
    expect(tone).toHaveAttribute("aria-controls", "review-detail-11");
    expect(document.getElementById("review-detail-11")).toHaveTextContent(
      "Detail for Tone",
    );
    expect(renderDetail).toHaveBeenCalledWith(
      expect.objectContaining({ lessonId: 11 }),
    );

    await userEvent.click(style);
    expect(tone).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByText(/Detail for/)).toHaveLength(1);

    await userEvent.click(screen.getByText("Close detail"));
    expect(screen.queryByText(/Detail for/)).toBeNull();
    expect(style).toHaveFocus();
  });

  it("closes on Escape and returns focus to the circle", async () => {
    show(panel(), { renderDetail: () => <input aria-label="inside" /> });
    const tone = within(
      screen.getByRole("region", { name: "Overall Score" }),
    ).getByRole("button", { name: /^Tone/ });

    await userEvent.click(tone);
    expect(document.getElementById("review-detail-overall")).not.toBeNull();
    await userEvent.click(screen.getByLabelText("inside"));
    await userEvent.keyboard("{Escape}");

    expect(document.getElementById("review-detail-overall")).toBeNull();
    expect(tone).toHaveFocus();
  });

  it("renders the card actions slot for each scored card", () => {
    const renderActions = jest.fn((id: number | null) => (
      <span>actions {String(id)}</span>
    ));
    show(panel(), { renderActions });

    expect(screen.getByText("actions 11")).toBeInTheDocument();
    expect(screen.getByText("actions null")).toBeInTheDocument();
  });
});

describe("comments", () => {
  it("counts and lists the caller's comments in position order", () => {
    setComments([
      comment(1),
      comment(2),
      comment(3, { lesson: { id: 12 } as never }),
    ]);
    show(
      panel({
        positions: { c1: { order: [4, 0] }, c2: { order: [1, 0] } },
      }),
    );

    const vars = screen.getByRole("region", { name: "Variables" });
    expect(within(vars).getByText("2 comments")).toBeInTheDocument();
    const items = within(vars).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Body 2");
    expect(items[1]).toHaveTextContent("Body 1");
    expect(
      within(screen.getByRole("region", { name: "Loops" })).getByText(
        "1 comment",
      ),
    ).toBeInTheDocument();
  });

  it("sorts a comment with no position last, and shows outdated wording", () => {
    setComments([comment(1), comment(2), comment(3)]);
    show(
      panel({
        positions: { c2: { order: [0, 0] }, c3: { outdated: true } },
      }),
    );

    const vars = screen.getByRole("region", { name: "Variables" });
    const items = within(vars).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining("Body 2"),
      expect.stringContaining("Body 3"),
      expect.stringContaining("Body 1"),
    ]);
    expect(items[1]).toHaveTextContent(
      "Outdated: the text it pointed at has changed",
    );
    expect(items[0]).not.toHaveTextContent("Outdated");
  });

  it("puts a comment on a deleted lesson in the Overview, as outdated", () => {
    setComments([comment(5, { lesson: { id: 99 } as never })]);
    show();

    const overview = screen.getByRole("region", { name: "Overview" });
    expect(within(overview).getByText("Body 5")).toBeInTheDocument();
    expect(overview).toHaveTextContent(
      "Outdated: the text it pointed at has changed",
    );
  });

  it("mutes a resolved comment", () => {
    setComments([comment(1, { resolvedAt: "2026-10-29T13:00:00.000Z" })]);
    show();

    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("opens the comment's lesson when clicked", async () => {
    setComments([comment(3, { lesson: { id: 12 } as never })]);
    show();

    await userEvent.click(screen.getByRole("button", { name: /Body 3/ }));

    expect(push).toHaveBeenCalledWith("/draft/d/intro/loops");
  });

  it("opens the Overview for an Overview comment", async () => {
    setComments([
      comment(4, {
        field: "description",
        lesson: null,
        anchor: { v: 1, field: "description" },
      }),
    ]);
    pathname = "/draft/d/intro/loops";
    show();

    await userEvent.click(screen.getByRole("button", { name: /Body 4/ }));

    expect(push).toHaveBeenCalledWith("/draft/d/intro");
  });

  it("works with no shared comments", () => {
    jest.mocked(useSharedReviewComments).mockReturnValue(null);
    show();

    expect(screen.getAllByText("0 comments").length).toBeGreaterThan(0);
  });
});

describe("AI bar and polling", () => {
  const run = (runState: string, extra: object = {}) =>
    panel({ latestRun: { id: 4, runState, ...extra } as never });

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("refreshes every 4 s while running and stops on done", () => {
    const view = show(
      run("running", { progress: { done: [11], current: 12 } }),
    );
    expect(screen.getByText("Scoring Loops…")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(8000);
    });
    expect(refresh).toHaveBeenCalledTimes(3);

    const done = run("done");
    view.rerender(<ReviewPanel droplet={droplet} panel={done} scores={[]} />);
    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(screen.getByText("0 of 3 confirmed")).toBeInTheDocument();
  });

  it("stops polling on unmount", () => {
    const view = show(run("queued"));
    view.unmount();

    act(() => {
      jest.advanceTimersByTime(20000);
    });

    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not poll with no run", () => {
    show();

    act(() => {
      jest.advanceTimersByTime(20000);
    });

    expect(refresh).not.toHaveBeenCalled();
  });

  it("passes onStart to the bar", () => {
    show(panel(), { onStart: jest.fn() });

    expect(
      screen.getByRole("button", { name: /score with ai/i }),
    ).toBeInTheDocument();
  });
});
