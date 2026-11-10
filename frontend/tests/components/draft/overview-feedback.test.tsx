import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OverviewFeedback } from "@/components/draft/review/overview-feedback";
import {
  getReviewForDroplet,
  getThreadStamp,
  replyToComment,
  deleteReply,
} from "@/lib/requests/reviews";
import { toast } from "sonner";
import {
  ReviewCommentsProvider,
  SentFeedbackProvider,
  ThreadRefresh,
} from "@/components/draft/review/review-comments-context";
import { settleDropletUpdates } from "@/components/draft/metadata/hooks/useDropletUpdate";
import type { ReviewComment } from "@/types";

jest.mock("@/lib/requests/reviews", () => ({
  getReviewForDroplet: jest.fn(),
  getThreadStamp: jest.fn(),
  replyToComment: jest.fn(),
  deleteReply: jest.fn(),
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

async function mount(
  canEdit = true,
  canReply = true,
  canAddress = true,
  inLayout = false,
) {
  const overview = (
    <OverviewFeedback
      droplet={droplet}
      authors={[]}
      dropletId={3}
      canEdit={canEdit}
      canReply={canReply}
      canAddress={canAddress}
    >
      <div data-testid="overview-editors">Editors</div>
    </OverviewFeedback>
  );
  render(
    inLayout ? (
      <ReviewCommentsProvider dropletId={3} enabled={false}>
        <SentFeedbackProvider dropletId={3} enabled isAuthor={canAddress}>
          <ThreadRefresh dropletId={3}>{overview}</ThreadRefresh>
        </SentFeedbackProvider>
      </ReviewCommentsProvider>
    ) : (
      overview
    ),
  );
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest
    .mocked(getThreadStamp)
    .mockResolvedValue({ ok: true, error: null, data: { stamp: "1" } });
  jest
    .mocked(getReviewForDroplet)
    .mockResolvedValue({ ok: true, error: null, data: sent } as never);
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

  it("opens a card from a mark, with Reply and no Mark addressed", async () => {
    await mount();

    await userEvent.click(screen.getByText("repeat"));

    expect(screen.getByRole("button", { name: "Reply" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /addressed/i })).toBeNull();
    expect(
      screen.getByRole("region", { name: "Reviewer feedback" }),
    ).toHaveTextContent("reply to it once you've changed the text");
  });

  it.each([
    ["a text field", false, () => screen.getByText("repeat"), 1],
    [
      "a whole section, on the frozen mount",
      true,
      () =>
        within(screen.getByTestId("overview-section-nextSteps")).getByTestId(
          "comment-tag",
        ),
      3,
    ],
  ])("replies on %s", async (_n, frozen, open, id) => {
    jest.mocked(replyToComment).mockResolvedValue({
      ok: true,
      error: null,
      data: { id: 90, body: "Done", parent: { id } },
    } as never);
    await mount(!frozen);

    await userEvent.click(open());
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Write a reply" }),
      "Done",
    );
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));

    expect(replyToComment).toHaveBeenCalledWith(id, "Done");
    expect(await screen.findByText("Done")).toBeInTheDocument();
  });

  it("leaves the strip's counts and the tag numbers as they are with replies", async () => {
    const replies = [{ id: 8 }, { id: 9 }];
    jest.mocked(getReviewForDroplet).mockResolvedValue({
      ok: true,
      error: null,
      data: {
        ...sent,
        comments: sent.comments.map((c) => ({ ...c, replies })),
      },
    } as never);
    await mount();

    expect(
      screen.getByRole("region", { name: "Reviewer feedback" }),
    ).toHaveTextContent("3 comments from Nadia Reviewer on the Overview");
    // With no layout there is no seen state, so nothing is new
    expect(screen.getAllByTestId("comment-tag")[0]).toHaveAccessibleName(
      /^Comment 1: /,
    );
  });

  describe.each([
    [
      "a text field's tag",
      "Comment 1",
      () => screen.getAllByTestId("comment-tag")[0],
    ],
    [
      "a section's tag",
      "Comment 3",
      () =>
        within(screen.getByTestId("overview-section-nextSteps")).getByTestId(
          "comment-tag",
        ),
    ],
  ])("%s in the layout", (_n, label, tag) => {
    const withReplies = () =>
      jest.mocked(getReviewForDroplet).mockResolvedValue({
        ok: true,
        error: null,
        data: {
          ...sent,
          comments: sent.comments.map((c) => ({
            ...c,
            replies: [{ id: 80 + c.id, body: "Reply", mine: false }],
          })),
        },
      } as never);
    const strip = () =>
      screen.getByRole("region", { name: "Reviewer feedback" });

    it("shows the dot and says so when replies are unseen", async () => {
      withReplies();
      await mount(true, true, true, true);

      expect(tag()).toHaveAccessibleName(
        new RegExp(`^${label}, new replies: `),
      );
      expect(within(tag()).getByTestId("new-replies-dot")).toBeInTheDocument();
      expect(strip()).toHaveTextContent(/\d+ new repl/);
    });

    it("shows neither once they have been seen", async () => {
      withReplies();
      localStorage.setItem(
        "review-seen-replies-3",
        JSON.stringify([81, 82, 83, 84]),
      );
      await mount(true, true, true, true);

      expect(tag()).toHaveAccessibleName(new RegExp(`^${label}: `));
      expect(within(tag()).queryByTestId("new-replies-dot")).toBeNull();
      expect(strip()).not.toHaveTextContent(/new repl/);
    });
  });

  it("gives a reviewer Reply, with their own strip hint (ODY-881)", async () => {
    await mount(true, true, false);

    await userEvent.click(screen.getByText("repeat"));

    expect(screen.getByRole("button", { name: "Reply" })).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Reviewer feedback" }),
    ).toHaveTextContent("its replies");
  });

  describe("a whole-section comment's card", () => {
    const withSection = (comment: Partial<ReviewComment>) =>
      jest.mocked(getReviewForDroplet).mockResolvedValue({
        ok: true,
        error: null,
        data: {
          ...sent,
          comments: sent.comments.map((c) =>
            c.id === 3 ? { ...c, ...comment } : c,
          ),
        },
      } as never);
    const tag = () =>
      within(screen.getByTestId("overview-section-nextSteps")).getByTestId(
        "comment-tag",
      );

    it("shows no carried note on a read-only card", async () => {
      withSection({ carriedFrom: { id: 90, review: { round: 1 } } } as never);
      await mount();

      await userEvent.click(tag());

      expect(screen.queryByText(/carried/i)).toBeNull();
    });

    it("says so when deleting a reply finds the feedback closed", async () => {
      withSection({
        replies: [
          { id: 91, body: "Mine", mine: true, parent: { id: 3 } },
        ] as never,
      });
      jest
        .mocked(deleteReply)
        .mockResolvedValue({ ok: false, error: "review_closed" } as never);
      await mount();

      await userEvent.click(tag());
      await userEvent.click(screen.getByRole("button", { name: "Delete" }));
      await userEvent.click(
        screen.getAllByRole("button", { name: "Delete" })[0],
      );

      expect(toast.info).toHaveBeenCalledTimes(1);
      expect(toast.info).toHaveBeenCalledWith(
        "This feedback can't change now.",
        expect.anything(),
      );
    });
  });

  it("offers no Reply without canReply", async () => {
    await mount(true, false);

    await userEvent.click(screen.getByText("repeat"));

    expect(screen.queryByRole("button", { name: "Reply" })).toBeNull();
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
  });

  it("shows the reviewer's summary note and how many comments are on lessons", async () => {
    jest.mocked(getReviewForDroplet).mockResolvedValue({
      ok: true,
      error: null,
      data: { ...sent, summaryNote: "Nearly there: tighten lesson 2." },
    } as never);

    await mount();

    const strip = screen.getByRole("region", { name: "Reviewer feedback" });
    expect(strip).toHaveTextContent("Nearly there: tighten lesson 2.");
    expect(strip).toHaveTextContent("1 comment on 1 lesson");
  });

  it("shows the strip above the editors when every comment is on a lesson", async () => {
    jest.mocked(getReviewForDroplet).mockResolvedValue({
      ok: true,
      error: null,
      data: {
        ...sent,
        summaryNote: "See the lessons.",
        comments: [sent.comments[3]],
      },
    } as never);

    await mount();

    expect(screen.getByTestId("overview-editors")).toBeInTheDocument();
    const strip = screen.getByRole("region", { name: "Reviewer feedback" });
    expect(strip).toHaveTextContent("Feedback from Nadia Reviewer");
    expect(strip).toHaveTextContent("See the lessons.");
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
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
