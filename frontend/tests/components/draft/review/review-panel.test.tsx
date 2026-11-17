import { act, fireEvent, render, screen, within } from "@testing-library/react";
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
const focusShow = jest.fn();
let focused: object | null = null;
jest.mock("@/components/draft/review/review-focus-context", () => ({
  useReviewFocus: () => ({ show: focusShow, focused }),
}));
jest.mock("@/components/draft/review/review-comments-context", () => ({
  useSharedReviewComments: jest.fn(),
}));

const droplet = {
  name: "Intro",
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

const cardNames = () =>
  screen
    .getAllByRole("region")
    .map((r) => r.getAttribute("aria-label"))
    .filter((name) => name !== "Reviewer Transcript");

/** Opens a card's comments (its header is the first button) */
const expand = (name: string) =>
  userEvent.click(
    within(screen.getByRole("region", { name })).getAllByRole("button")[0],
  );

beforeEach(() => {
  jest.clearAllMocks();
  pathname = "/draft/d/intro";
  setComments([]);
});

describe("header", () => {
  it("shows the droplet name and who reviewed and created it", () => {
    show(panel(), {
      meta: {
        reviewerName: "Theo Abara",
        authorNames: ["Maya Lindqvist", "Sam Roe"],
      },
    });

    expect(screen.getByText("Intro")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reviewed by Theo Abara · Created by Maya Lindqvist, Sam Roe",
      ),
    ).toBeInTheDocument();
  });

  it("leaves the line out without names", () => {
    show();

    expect(screen.queryByText(/Reviewed by/)).not.toBeInTheDocument();
  });
});

describe("a card's two states", () => {
  const renderDetail = ({ criterion }: { criterion: { name: string } }) => (
    <div>
      <p>Detail for {criterion.name}</p>
      <input aria-label="composer" />
    </div>
  );
  const tonePanel = (over = {}) =>
    panel({
      scores: [score(11, 2, { aiValue: 4, aiFindings: [{ id: "f1" }] })],
      ...over,
    });
  const setup = (comments = [comment(1)], extra: object = {}) => {
    setComments(comments);
    const view = show(tonePanel(), { renderDetail, ...extra });
    const card = screen.getByRole("region", { name: "Variables" });
    const header = within(card).getAllByRole("button")[0];
    return { view, card, header };
  };
  const toneCircle = (card: HTMLElement) =>
    within(card).getByRole("button", { name: /^Tone/ });
  const minis = (card: HTMLElement) =>
    Array.from(card.querySelectorAll<HTMLElement>("[data-mini-circle]"));

  it("starts collapsed: mini circles, a score summary and the count, nothing below", () => {
    const { card, header } = setup();

    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(header).toHaveAttribute("aria-controls", "review-card-11");
    expect(header).toHaveAccessibleName(
      /^Lesson 1 To confirm Variables ?, scores: Tone Good, 1 issue; Style Not scored, 1 comment$/,
    );
    expect(within(card).queryByRole("group")).toBeNull();
    expect(screen.queryByText("Body 1")).not.toBeInTheDocument();
    expect(minis(card)).toHaveLength(2);
    minis(card).forEach((m) => expect(m).toHaveAttribute("aria-hidden"));
  });

  it("shows no status text when collapsed but keeps it in the name, and shows it expanded", async () => {
    const { card, header } = setup();

    expect(within(card).getByText("To confirm")).toHaveClass("sr-only");
    expect(header).toHaveAccessibleName(/To confirm/);

    await userEvent.click(header);
    expect(within(card).getByText("To confirm")).not.toHaveClass("sr-only");
  });

  it("keeps the minis on the first row without wrapping", () => {
    const { card } = setup();
    const wrapper = minis(card)[0].parentElement!;

    expect(wrapper.parentElement).toHaveClass("flex-nowrap");
    expect(wrapper.parentElement).not.toHaveClass("flex-wrap");
    expect(wrapper).not.toHaveClass("flex-wrap");
    expect(wrapper).toHaveClass("shrink-0", "pr-1");
  });

  it("keeps each mini's band, badge and dashed unscored state", () => {
    const { card } = setup();
    const [tone, style] = minis(card);

    expect(tone).toHaveAttribute("data-band", "good");
    expect(within(tone).getByText("✓")).toBeInTheDocument();
    expect(tone.style.borderStyle).toBe("solid");
    expect(style).toHaveAttribute("data-band", "unscored");
    expect(within(style).queryByText(/[✓–✕]/)).toBeNull();
    expect(style.style.borderStyle).toBe("dashed");
  });

  it("expands to the full circles, the actions and the comments", async () => {
    const renderActions = () => <span>actions</span>;
    const { card, header } = setup([comment(1)], { renderActions });
    await userEvent.click(header);

    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(
      within(card).getByRole("button", {
        name: /^Tone, 4 out of 5, .+, 1 issue/,
      }),
    ).toBeInTheDocument();
    expect(within(card).getByText("1 issue")).toBeInTheDocument();
    expect(within(card).getByText("actions")).toBeInTheDocument();
    expect(screen.getByText("Body 1")).toBeInTheDocument();
    expect(minis(card)).toHaveLength(0);

    await userEvent.click(header);
    expect(screen.queryByText("Body 1")).not.toBeInTheDocument();
  });

  it("drops the card's bottom strip and rounds the whole header only when collapsed", async () => {
    const { card, header } = setup();
    expect(card).not.toHaveClass("pb-2");
    expect(header).toHaveClass("rounded-xl");
    expect(header).not.toHaveClass("rounded-t-xl");

    await userEvent.click(header);
    expect(card).toHaveClass("pb-2");
    expect(header).toHaveClass("rounded-t-xl");
    expect(header).not.toHaveClass("rounded-xl");
  });

  it("has no scores summary in the name when the card has no criteria", () => {
    const { header } = setup([comment(1)], {});
    expect(header).toHaveAccessibleName(/, scores:/);

    show(panel({ criteria: [] }));
    const card = screen.getAllByRole("region", { name: "Variables" })[1];
    expect(within(card).getAllByRole("button")[0]).not.toHaveAccessibleName(
      /scores:/,
    );
  });

  it("collapsing closes an open detail for good, even a stale one, and keeps focus on the header", async () => {
    const { view, card, header } = setup();
    await userEvent.click(header);
    await userEvent.click(toneCircle(card));
    expect(screen.getByText("Detail for Tone")).toBeInTheDocument();

    await userEvent.click(header);
    expect(screen.queryByText(/Detail for/)).toBeNull();
    expect(header).toHaveFocus();

    await userEvent.click(header);
    expect(screen.queryByText(/Detail for/)).toBeNull();

    await userEvent.click(toneCircle(card));
    const again = (data: ReviewPanelData) => (
      <ReviewPanel
        droplet={droplet}
        panel={data}
        scores={tonePanel().scores}
        renderDetail={renderDetail}
      />
    );
    view.rerender(again(tonePanel({ criteria: [criteria[1]] })));
    await userEvent.click(header);
    view.rerender(again(tonePanel()));
    await userEvent.click(header);
    expect(screen.queryByText(/Detail for/)).toBeNull();
  });

  it("keeps focus on the header when a click doesn't focus it (Safari)", async () => {
    const { card, header } = setup();
    await userEvent.click(header);
    await userEvent.click(toneCircle(card));
    screen.getByLabelText("composer").focus();
    fireEvent.click(header);

    expect(screen.queryByText(/Detail for/)).toBeNull();
    expect(header).toHaveFocus();
  });

  it("keeps focus on Hide/Show when a click doesn't focus it (Safari)", async () => {
    const { card, header } = setup();
    await userEvent.click(header);
    const hide = within(card).getByRole("button", { name: "Hide comments" });
    within(card).getByText("Body 1").closest("button")!.focus();
    expect(hide).not.toHaveFocus();
    fireEvent.click(hide);

    expect(screen.queryByText("Body 1")).not.toBeInTheDocument();
    expect(hide).toHaveFocus();
  });

  it("hides and shows the comments, remembers it, and leaves an open detail alone", async () => {
    const { card, header } = setup();
    await userEvent.click(header);
    await userEvent.click(toneCircle(card));
    const toggle = within(card).getByRole("button", { name: "Hide comments" });
    expect(toggle).toHaveAttribute("aria-controls", "review-comments-11");

    await userEvent.click(toggle);
    expect(screen.queryByText("Body 1")).not.toBeInTheDocument();
    expect(toggle).toHaveAccessibleName("Show comments");
    expect(toggle).not.toHaveAttribute("aria-expanded");
    expect(screen.getByText("Detail for Tone")).toBeInTheDocument();

    await userEvent.click(header);
    await userEvent.click(header);
    expect(screen.queryByText("Body 1")).not.toBeInTheDocument();
    await userEvent.click(
      within(card).getByRole("button", { name: "Show comments" }),
    );
    expect(screen.getByText("Body 1")).toBeInTheDocument();
  });

  it("has no toggle with 0 comments, just the hint", async () => {
    const { card, header } = setup([]);
    await userEvent.click(header);

    expect(
      within(card).queryByRole("button", { name: /^(Hide|Show) comments$/ }),
    ).toBeNull();
    expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
  });

  describe("when the comment count changes", () => {
    const hidden = async (items = [comment(1)]) => {
      const ctx = setup(items);
      await userEvent.click(ctx.header);
      await userEvent.click(
        within(ctx.card).getByRole("button", { name: "Hide comments" }),
      );
      const rerun = (items: ReviewComment[]) => {
        setComments(items);
        ctx.view.rerender(
          <ReviewPanel
            droplet={droplet}
            panel={tonePanel()}
            scores={tonePanel().scores}
            renderDetail={renderDetail}
          />,
        );
      };
      return { ...ctx, rerun };
    };

    it("shows the comments again when one arrives", async () => {
      const { card, rerun } = await hidden();
      rerun([comment(1), comment(2)]);

      expect(screen.getByText("Body 2")).toBeInTheDocument();
      expect(
        within(card).getByRole("button", { name: "Hide comments" }),
      ).toBeInTheDocument();
    });

    it("shows the first comment after the count reached 0", async () => {
      const { rerun } = await hidden();
      rerun([]);
      rerun([comment(3)]);

      expect(screen.getByText("Body 3")).toBeInTheDocument();
    });

    it("leaves them hidden when the count goes down", async () => {
      const { card, rerun } = await hidden([comment(1), comment(2)]);
      rerun([comment(1)]);

      expect(screen.queryByText("Body 1")).not.toBeInTheDocument();
      expect(
        within(card).getByRole("button", { name: "Show comments" }),
      ).toBeInTheDocument();
    });
  });

  it("collapses the Overview with no minis, and leaves Overall Score open", async () => {
    setComments([comment(1, { lesson: undefined })]);
    show();
    const overview = screen.getByRole("region", { name: "Overview" });
    const header = within(overview).getAllByRole("button")[0];

    expect(minis(overview)).toHaveLength(0);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(within(overview).queryByText(/isn.t scored/)).toBeNull();
    await userEvent.click(header);
    expect(within(overview).getByText(/isn.t scored/)).toBeInTheDocument();

    const overall = screen.getByRole("region", { name: "Overall Score" });
    expect(within(overall).getAllByRole("group")).toHaveLength(1);
    expect(minis(overall)).toHaveLength(0);
  });

  it("keeps its state when the page on screen changes, never auto-expanding", async () => {
    const { view, card, header } = setup();
    pathname = "/draft/d/intro/variables";
    const navigated = () => (
      <ReviewPanel
        droplet={droplet}
        panel={tonePanel()}
        scores={tonePanel().scores}
        renderDetail={renderDetail}
      />
    );
    view.rerender(navigated());
    expect(within(card).getByText("Viewing")).toBeInTheDocument();
    expect(header).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(header);
    pathname = "/draft/d/intro/loops";
    view.rerender(navigated());
    expect(header).toHaveAttribute("aria-expanded", "true");
  });
});

describe("cards", () => {
  it("lists Overview, lessons by orderIndex, then Overall Score", async () => {
    show();
    await expand("Overview");

    expect(cardNames()).toEqual([
      "Overview",
      "Variables",
      "Loops",
      "Overall Score",
    ]);
    expect(
      screen.getByText("Description, objectives and details"),
    ).toBeInTheDocument();
    expect(screen.getByText("Lesson 1")).toBeInTheDocument();
    expect(screen.getByText("Lesson 2")).toBeInTheDocument();
    expect(screen.getByText("Whole droplet")).toBeInTheDocument();
    expect(
      screen.getByText(/It counts toward the Overall Score below/),
    ).toBeInTheDocument();
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

  it("draws a circle per active criterion by order, with Effective scores", async () => {
    show(
      panel({
        scores: [
          score(11, 2, { aiValue: 4 }),
          score(11, 3, { value: 2, aiValue: 5 }),
        ],
      }),
    );
    await expand("Variables");

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

  it("shows To confirm until every criterion has a value, then Confirmed", async () => {
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
    expect(within(loops).getByText("Confirmed")).toHaveClass("sr-only");
    await expand("Loops");
    expect(within(loops).getByText("Confirmed")).not.toHaveClass("sr-only");
    const overall = screen.getByRole("region", { name: "Overall Score" });
    expect(within(overall).queryByText(/confirm/i)).toBeNull();
  });

  it("uses the scores prop, not panel.scores", async () => {
    const data = panel({ scores: [score(11, 2, { aiValue: 1 })] });
    render(
      <ReviewPanel
        droplet={droplet}
        panel={data}
        scores={[score(11, 2, { value: 5 })]}
      />,
    );
    await expand("Variables");

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
    await expand("Variables");
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

  it("renders the card actions slot for each scored card", async () => {
    const renderActions = jest.fn((id: number | null) => (
      <span>actions {String(id)}</span>
    ));
    show(panel(), { renderActions });
    await expand("Variables");

    expect(screen.getByText("actions 11")).toBeInTheDocument();
    expect(screen.getByText("actions null")).toBeInTheDocument();
  });
});

describe("comments", () => {
  it("counts and lists the caller's comments in position order", async () => {
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

    await expand("Variables");
    await expand("Loops");

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

  it("sorts a comment with no position last, and shows outdated wording", async () => {
    setComments([comment(1), comment(2), comment(3)]);
    show(
      panel({
        positions: { c2: { order: [0, 0] }, c3: { outdated: true } },
      }),
    );

    await expand("Variables");

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

  it("puts a comment on a deleted lesson in the Overview, as outdated", async () => {
    setComments([comment(5, { lesson: { id: 99 } as never })]);
    show();

    await expand("Overview");

    const overview = screen.getByRole("region", { name: "Overview" });
    expect(within(overview).getByText("Body 5")).toBeInTheDocument();
    expect(overview).toHaveTextContent(
      "Outdated: the text it pointed at has changed",
    );
  });

  it("shows how many replies a comment has", async () => {
    setComments([comment(1, { replies: [{ id: 8 }, { id: 9 }] as never })]);
    show();

    await expand("Variables");

    expect(screen.getByText(/· 2 replies/)).toBeInTheDocument();
  });

  it("mutes a resolved comment", async () => {
    setComments([comment(1, { resolvedAt: "2026-10-29T13:00:00.000Z" })]);
    show();

    await expand("Variables");

    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it.each([
    [
      "a lesson comment",
      comment(3, { lesson: { id: 12 } as never }),
      "/draft/d/intro/loops",
      { kind: "comment", markId: "comment-3", lessonId: 12, place: "Lesson 2" },
    ],
    [
      "an Overview text comment",
      comment(4, { field: "description", lesson: null }),
      "/draft/d/intro",
      { kind: "comment", markId: "comment-4", lessonId: null },
    ],
    [
      "a whole-section comment",
      comment(5, {
        field: "overview",
        lesson: null,
        anchor: { v: 1, field: "overview" },
      }),
      "/draft/d/intro",
      { kind: "section", field: "overview", place: "the Overview" },
    ],
  ])("shows %s in the lesson when clicked", async (_n, c, url, target) => {
    setComments([c]);
    show();

    await expand(
      "lessonId" in target && target.lessonId === 12 ? "Loops" : "Overview",
    );
    await userEvent.click(screen.getByRole("button", { name: /Body/ }));

    expect(focusShow).toHaveBeenCalledWith(
      expect.objectContaining(target),
      url,
    );
  });

  it("marks the picked comment as current", async () => {
    focused = { target: { markId: "comment-1" } };
    setComments([comment(1), comment(2)]);
    show();

    await expand("Variables");

    expect(screen.getByRole("button", { name: /Body 1/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("button", { name: /Body 2/ })).not.toHaveAttribute(
      "aria-current",
    );
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
    expect(screen.getByText("confirmed", { exact: false })).toHaveTextContent(
      "0 of 3 confirmed",
    );
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
