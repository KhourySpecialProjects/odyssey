import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OverviewFeedback } from "@/components/draft/review/overview-feedback";
import { getReviewForDroplet, markAddressed } from "@/lib/requests/reviews";
import { settleDropletUpdates } from "@/components/draft/metadata/hooks/useDropletUpdate";
import type { ReviewComment } from "@/types";

jest.mock("@/lib/requests/reviews", () => ({
  getReviewForDroplet: jest.fn(),
  markAddressed: jest.fn(),
}));
const refresh = jest.fn();
jest.mock("@/components/draft/metadata/hooks/useDropletUpdate", () => ({
  settleDropletUpdates: jest.fn(() => Promise.resolve()),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

beforeAll(() => {
  Range.prototype.getBoundingClientRect = () =>
    ({
      top: 0,
      bottom: 20,
      left: 0,
      right: 40,
      width: 40,
      height: 20,
    }) as DOMRect;
  Range.prototype.getClientRects = function () {
    return [this.getBoundingClientRect()] as unknown as DOMRectList;
  };
});

const droplet = {
  name: "Loops",
  description: "<p>Learn how loops repeat code.</p>",
  overview: "<p>This droplet covers for and while loops.</p>",
  focusArea: "technical",
  type: "knowledge",
  difficulty: "beginner",
  tags: [],
  learningObjectives: [{ id: 1, objective: "Write a for loop" }],
  nextSteps: [],
  prerequisites: [],
  postrequisites: [],
  funFact: "",
  datasets: [],
} as never;

const quote = (
  id: number,
  field: "description" | "overview",
  text: string,
): ReviewComment => ({
  id,
  field,
  anchor: { v: 1, field, quote: text, prefix: "", suffix: "" },
  body: `About ${text}`,
  resolvedAt: null,
  addressedAt: null,
});

const sent = {
  id: 7,
  round: 1,
  key: "3:9:1",
  state: "sent",
  sentAt: "2026-10-28T15:04:00.000Z",
  reviewer: { id: 9, firstName: "Nadia", lastName: "Reviewer" },
  comments: [
    quote(1, "description", "repeat"),
    {
      ...quote(2, "overview", "no longer here"),
      anchor: {
        v: 1 as const,
        field: "overview" as const,
        quote: "no longer here",
        prefix: "A sentence that is ",
        suffix: " at all, edited away.",
      },
    },
    {
      id: 3,
      field: "nextSteps",
      anchor: { v: 1, field: "nextSteps" },
      body: "Add a next step.",
      resolvedAt: null,
    },
    // A lesson's, which the Overview leaves out
    { ...quote(4, "description", "x"), field: "blocks", lesson: { id: 5 } },
  ],
};

async function mount(canEdit = true) {
  render(
    <OverviewFeedback
      droplet={droplet}
      authors={[]}
      dropletId={3}
      canEdit={canEdit}
    >
      <div data-testid="overview-editors">Editors</div>
    </OverviewFeedback>,
  );
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(getReviewForDroplet)
    .mockResolvedValue({ ok: true, error: null, data: sent } as never);
  jest
    .mocked(markAddressed)
    .mockResolvedValue({ ok: true, error: null, data: {} } as never);
});

describe("the Overview for an author with sent feedback (ODY-807)", () => {
  it("opens on Feedback: the Overview as the reviewer saw it, with their comments", async () => {
    await mount();

    expect(screen.queryByTestId("overview-editors")).not.toBeInTheDocument();
    const strip = screen.getByRole("region", { name: "Reviewer feedback" });
    expect(strip).toHaveTextContent(
      "3 comments from Nadia Reviewer on the Overview",
    );
    expect(
      within(screen.getByTestId("overview-feedback-description")).getByText(
        "repeat",
      ),
    ).toHaveAttribute("data-anchor-id", "comment-1");
    // The whole Next Steps section's comment, on its heading
    expect(
      within(screen.getByTestId("overview-section-nextSteps")).getByTestId(
        "comment-tag",
      ),
    ).toBeInTheDocument();
  });

  it("lists a comment whose text is gone as outdated", async () => {
    await mount();

    const outdated = screen.getByRole("region", { name: "Outdated comments" });
    expect(outdated).toHaveTextContent("no longer here");
  });

  it("opens a card from a mark, with Mark addressed", async () => {
    await mount();

    await userEvent.click(screen.getByText("repeat"));
    await userEvent.click(
      screen.getByRole("button", { name: "Mark addressed" }),
    );

    expect(markAddressed).toHaveBeenCalledWith(1, true);
  });

  it("takes no new comment from a heading", async () => {
    await mount();

    await userEvent.click(screen.getByRole("heading", { name: "Next Steps" }));

    expect(
      screen.queryByRole("dialog", { name: /Comment on/ }),
    ).not.toBeInTheDocument();
  });

  it("switches to the editors, and back once their saves have settled", async () => {
    await mount();

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("overview-editors")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Feedback" }));
    expect(settleDropletUpdates).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByTestId("overview-editors")).not.toBeInTheDocument();
  });

  it("is read-only while the draft is back in review", async () => {
    await mount(false);

    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    await userEvent.click(screen.getByText("repeat"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark addressed" })).toBeNull();
  });

  it("shows only what it was given when no feedback was sent", async () => {
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue({ ok: true, error: null, data: null } as never);

    await mount();

    expect(screen.getByTestId("overview-editors")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Reviewer feedback" }),
    ).toBeNull();
  });
});
