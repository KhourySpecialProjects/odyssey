import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DraftLayoutShell } from "@/components/draft/draft-layout-shell";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import type { User } from "@/types";

jest.mock("@/components/draft/draft-tour", () => ({
  DraftTour: () => null,
  TOUR_KEY: "tour",
}));
jest.mock("@/components/draft/sidebar", () => ({
  Sidebar: ({
    expanded,
    setExpanded,
    hideReviewActions,
    lessonDots,
  }: {
    expanded: boolean;
    setExpanded: (v: boolean) => void;
    hideReviewActions: boolean;
    lessonDots: Record<number, string>;
  }) => (
    <div data-testid="sidebar" data-expanded={expanded}>
      <span data-testid="hide">{String(hideReviewActions)}</span>
      <span data-testid="dots">{JSON.stringify(lessonDots)}</span>
      <button onClick={() => setExpanded(true)}>open sidebar</button>
    </div>
  ),
}));
jest.mock("@/components/draft/review/review-comments-context", () => ({
  ReviewCommentsProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useSharedReviewComments: () => ({ comments: [{ id: 1 }, { id: 2 }] }),
}));
const unmounted = jest.fn();
jest.mock("@/components/draft/review/review-transcript", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    ReviewTranscript: ({ panel }: { panel: unknown }) => {
      useEffect(() => {
        return () => unmounted();
      }, []);
      return (
        <div data-testid="transcript">
          {panel ? "with data" : "no data"}
          <button>first action</button>
          <button>last action</button>
        </div>
      );
    },
  };
});

type Listener = (e: { matches: boolean }) => void;
const listeners = new Set<{ min: number; fn: Listener }>();
let viewport = 0;
let installed = false;
const minOf = (query: string) =>
  Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);

/** Sets the viewport width; matchMedia answers from it and notifies listeners on a change */
const wide = (width: number) => {
  const before = viewport;
  viewport = width;
  if (!installed) {
    installed = true;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      get matches() {
        return viewport >= minOf(query);
      },
      media: query,
      addEventListener: (_: string, fn: Listener) =>
        listeners.add({ min: minOf(query), fn }),
      removeEventListener: (_: string, fn: Listener) =>
        listeners.forEach((l) => l.fn === fn && listeners.delete(l)),
    })) as never;
  }
  listeners.forEach(({ min, fn }) => {
    if (before >= min !== width >= min) fn({ matches: width >= min });
  });
};

const droplet = {
  id: 3,
  name: "Intro",
  slug: "intro",
  status: "draft",
  inReview: true,
  lessons: [],
} as never;
const editor = {
  id: 9,
  roles: [AuthorizedUserRoleTitle.ContentEditor],
} as unknown as User;

const panel = {
  review: null,
  criteria: [{ id: 1, name: "Tone", order: 0, active: true }],
  latestRun: null,
  positions: {},
  scores: [
    { lessonId: 11, criterionId: 1, value: null, aiValue: 2 },
    { lessonId: 12, criterionId: 1, value: null, aiValue: 5 },
  ],
} as never;

const show = (props: object = {}) =>
  render(
    <DraftLayoutShell
      user={editor}
      isAuthor={false}
      droplet={droplet}
      availableDroplets={[]}
      reviewPanel={panel}
      {...props}
    >
      <p>page</p>
    </DraftLayoutShell>,
  );

const main = () => screen.getByText("page").closest("main")!;
const sidebarOpen = () =>
  screen.getByTestId("sidebar").getAttribute("data-expanded");

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem("tour", "done");
});

describe("below 1440", () => {
  beforeEach(() => wide(1300));

  it("starts with the panel open and the sidebar collapsed", () => {
    show();

    expect(screen.getByTestId("transcript")).toBeInTheDocument();
    expect(sidebarOpen()).toBe("false");
    expect(main()).toHaveAttribute("data-review-panel", "open");
  });

  it("turns the panel into a rail when the sidebar opens, and back again", async () => {
    show();

    await userEvent.click(screen.getByText("open sidebar"));
    expect(sidebarOpen()).toBe("true");
    expect(screen.getByTestId("transcript")).not.toBeVisible();
    expect(main()).toHaveAttribute("data-review-panel", "rail");

    await userEvent.click(
      screen.getByRole("button", { name: "Open Reviewer Transcript" }),
    );
    expect(sidebarOpen()).toBe("false");
    expect(screen.getByTestId("transcript")).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: "Collapse Reviewer Transcript" }),
    );
    expect(screen.getByTestId("transcript")).not.toBeVisible();
    expect(unmounted).not.toHaveBeenCalled();
  });

  it("moves focus to the counterpart control between open and rail", async () => {
    show();

    await userEvent.click(
      screen.getByRole("button", { name: "Collapse Reviewer Transcript" }),
    );
    expect(
      screen.getByRole("button", { name: "Open Reviewer Transcript" }),
    ).toHaveFocus();

    await userEvent.click(
      screen.getByRole("button", { name: "Open Reviewer Transcript" }),
    );
    expect(
      screen.getByRole("button", { name: "Collapse Reviewer Transcript" }),
    ).toHaveFocus();
  });

  it("shows the comment total on the rail", async () => {
    show();
    await userEvent.click(screen.getByText("open sidebar"));

    expect(screen.getByText("2 comments")).toBeInTheDocument();
  });
});

describe("below 1280", () => {
  it("starts as the rail", () => {
    wide(1100);
    show();

    expect(main()).toHaveAttribute("data-review-panel", "rail");
    expect(
      screen.getByRole("button", { name: "Open Reviewer Transcript" }),
    ).toBeInTheDocument();
  });

  it("moves focus into the drawer, closes it with Escape, and makes the page inert behind it", async () => {
    wide(1100);
    show();
    expect(main()).not.toHaveAttribute("inert");

    await userEvent.click(
      screen.getByRole("button", { name: "Open Reviewer Transcript" }),
    );
    expect(
      screen.getByRole("button", { name: "Collapse Reviewer Transcript" }),
    ).toHaveFocus();
    expect(main()).toHaveAttribute("inert");

    await userEvent.keyboard("{Escape}");

    expect(main()).toHaveAttribute("data-review-panel", "rail");
    expect(main()).not.toHaveAttribute("inert");
    expect(
      screen.getByRole("button", { name: "Open Reviewer Transcript" }),
    ).toHaveFocus();
  });

  it("is a modal dialog with Tab wrapped inside it", async () => {
    wide(1100);
    show();
    await userEvent.click(
      screen.getByRole("button", { name: "Open Reviewer Transcript" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Reviewer Transcript" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const first = screen.getByRole("button", {
      name: "Collapse Reviewer Transcript",
    });
    const last = screen.getByRole("button", { name: "last action" });

    last.focus();
    await userEvent.tab();
    expect(first).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it("closes the drawer from its backdrop", async () => {
    wide(1100);
    show();
    await userEvent.click(
      screen.getByRole("button", { name: "Open Reviewer Transcript" }),
    );

    expect(main()).toHaveAttribute("inert");

    await userEvent.click(screen.getByTestId("review-panel-backdrop"));

    expect(main()).toHaveAttribute("data-review-panel", "rail");
    expect(main()).not.toHaveAttribute("inert");
    expect(
      screen.getByRole("button", { name: "Open Reviewer Transcript" }),
    ).toHaveFocus();
  });
});

describe("at 1440 and up", () => {
  beforeEach(() => wide(1500));

  it("keeps both open", async () => {
    show();
    await act(async () => {});

    expect(sidebarOpen()).toBe("true");
    expect(screen.getByTestId("transcript")).toBeInTheDocument();
    await userEvent.click(screen.getByText("open sidebar"));
    expect(screen.getByTestId("transcript")).toBeInTheDocument();
  });

  it("is a plain landmark, not a dialog", () => {
    show();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Reviewer Transcript" }),
    ).toBeInTheDocument();
    expect(main()).not.toHaveAttribute("inert");
  });

  it("collapses to the rail when the window shrinks below 1280, without moving focus", async () => {
    show();
    await act(async () => {});
    const outside = screen.getByText("open sidebar");
    outside.focus();

    await act(async () => {
      wide(1100);
    });

    expect(main()).toHaveAttribute("data-review-panel", "rail");
    expect(main()).not.toHaveAttribute("inert");
    expect(outside).toHaveFocus();
  });

  it("pads main for the open panel and for the rail", async () => {
    show();
    expect(main()).toHaveClass("group", "xl:pr-[384px]");
    expect(main()).toHaveAttribute("data-review-panel", "open");

    await userEvent.click(
      screen.getByRole("button", { name: "Collapse Reviewer Transcript" }),
    );
    expect(main()).toHaveClass("xl:pr-12");
    expect(main()).toHaveAttribute("data-review-panel", "rail");
  });

  it("tells the sidebar to hide the review actions and shows dots", () => {
    show();

    expect(screen.getByTestId("hide")).toHaveTextContent("true");
    expect(screen.getByTestId("dots")).toHaveTextContent(
      JSON.stringify({ 11: "needs_work" }),
    );
  });
});

describe("not reviewing", () => {
  beforeEach(() => wide(1500));

  it.each([
    ["an author", { isAuthor: true }],
    [
      "a draft not in review",
      { droplet: { ...(droplet as object), inReview: false } },
    ],
  ])("has no panel, rail or padding for %s", (_name, props) => {
    show(props);

    expect(screen.queryByTestId("transcript")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open Reviewer Transcript" }),
    ).not.toBeInTheDocument();
    expect(main()).not.toHaveAttribute("data-review-panel");
    expect(main()).not.toHaveClass("group");
    expect(screen.getByTestId("hide")).toHaveTextContent("false");
  });
});

describe("reviewing with no panel data", () => {
  it("still shows the panel, for its footer", () => {
    wide(1500);
    show({ reviewPanel: null });

    expect(screen.getByTestId("transcript")).toHaveTextContent("no data");
  });
});
