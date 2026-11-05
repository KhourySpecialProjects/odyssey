import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import {
  ReviewCommentsProvider,
  SentFeedbackProvider,
  ThreadRefresh,
} from "@/components/draft/review/review-comments-context";
import { CommentCard } from "@/components/draft/review/comment-card";
import { CommentStrip } from "@/components/draft/review/comment-strip";
import { FeedbackStrip } from "@/components/draft/review/feedback-strip";
import { CommentTag } from "@/components/draft/review/comment-tag";
import { OutdatedComments } from "@/components/draft/review/outdated-comments";
import { carriedNotes, commentStripText } from "@/lib/review-comments";
import { getThreadStamp } from "@/lib/requests/reviews";
import type { ReviewComment } from "@/types";

const reloadSent = jest.fn();

jest.mock("@/lib/requests/reviews", () => ({ getThreadStamp: jest.fn() }));
jest.mock("@/hooks/use-review-comments", () => ({
  useReviewComments: () => ({ reload: jest.fn() }),
}));
jest.mock("@/hooks/use-sent-feedback", () => ({
  useSentFeedback: () => ({ reload: reloadSent, review: { id: 7 } }),
}));

const mockedStamp = jest.mocked(getThreadStamp);
const stamp = (s: string) =>
  mockedStamp.mockResolvedValue({ ok: true, error: null, data: { stamp: s } });

const reply = (id: number, over: Partial<ReviewComment> = {}) =>
  ({ id, body: `reply ${id}`, field: "blocks", anchor: {}, ...over }) as never;
const comment = (over: Partial<ReviewComment> = {}) =>
  ({
    id: 1,
    field: "blocks",
    anchor: { blockId: "b", quote: "old text", start: 0, end: 8 },
    body: "Fix this",
    createdAt: "2026-10-28T12:00:00.000Z",
    replies: [reply(5), reply(6, { mine: true })],
    ...over,
  }) as ReviewComment;

const providers = (children: React.ReactNode) => (
  <ReviewCommentsProvider dropletId={3} enabled={false}>
    <SentFeedbackProvider dropletId={3} enabled isAuthor>
      <ThreadRefresh dropletId={3}>{children}</ThreadRefresh>
    </SentFeedbackProvider>
  </ReviewCommentsProvider>
);

const card = (c: ReviewComment) => (
  <CommentCard
    comment={c}
    number={1}
    about="text"
    anchor={{ centerX: 0, bottom: 0 } as never}
    canChange={false}
    onEdit={jest.fn()}
    onDelete={jest.fn()}
    onResolve={jest.fn()}
    onClose={jest.fn()}
  />
);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  stamp("1");
});

describe("the new-replies dot and label", () => {
  const tag = (unseen: boolean) => (
    <CommentTag
      number={2}
      pending={false}
      resolved={false}
      unseen={unseen}
      lit={false}
      expanded={false}
      mode="full"
      top={0}
      left={0}
      room={200}
      label={`Comment 2: ${carriedNotes(comment(), unseen).join(", ")}`}
      onLight={jest.fn()}
      onOpen={jest.fn()}
    >
      text
    </CommentTag>
  );

  it("draws a dot and says so to a screen reader", () => {
    render(tag(true));
    expect(screen.getByTestId("new-replies-dot")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAccessibleName(/new replies/);
  });

  it("draws nothing without unseen replies", () => {
    render(tag(false));
    expect(screen.queryByTestId("new-replies-dot")).toBeNull();
    expect(screen.getByRole("button")).not.toHaveAccessibleName(/new replies/);
  });
});

describe("the strips", () => {
  it("say how many replies are new", () => {
    render(<CommentStrip total={3} pending={0} newReplies={2} />);
    expect(screen.getByText("2 new replies")).toBeInTheDocument();
  });

  it("say it in the feedback strip too, and in the plain text", () => {
    render(
      <FeedbackStrip
        review={{ round: 1, sentAt: null, reviewer: null, summaryNote: null }}
        total={3}
        addressed={0}
        newReplies={1}
      />,
    );
    expect(screen.getByText("1 new reply")).toBeInTheDocument();
    expect(commentStripText({ total: 3, pending: 0, newReplies: 2 })).toBe(
      "3 comments on this lesson · 2 new replies",
    );
  });
});

/** The layout is up (and has read what's seen) before a card opens. */
async function openLater(c: ReviewComment) {
  const view = render(providers(null));
  await act(async () => {});
  view.rerender(providers(card(c)));
  return view;
}

describe("a card's New pill", () => {
  it("marks replies by others, then clears on the next open; own replies never count", async () => {
    const first = await openLater(comment());
    expect(screen.getAllByText("New")).toHaveLength(1);
    expect(screen.getByText("reply 5")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("review-seen-replies-3")!)).toEqual([
      5,
    ]);
    first.unmount();

    await openLater(comment());
    expect(screen.queryByText("New")).toBeNull();
  });

  it("marks nothing in a resolved thread", async () => {
    await openLater(comment({ resolvedAt: "2026-11-01" }));
    expect(screen.queryByText("New")).toBeNull();
    expect(localStorage.getItem("review-seen-replies-3")).toBeNull();
  });

  it("checks for newer replies when it opens, once the last check is 5 s old", async () => {
    jest.useFakeTimers();
    const view = render(providers(null));
    await act(async () => {});
    expect(mockedStamp).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(6_000);
    });
    view.rerender(providers(card(comment())));
    await act(async () => {});
    expect(mockedStamp).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});

describe("a refresh that brings a reply", () => {
  function Live() {
    const [comments, setComments] = useState([comment({ replies: [] })]);
    reloadSent.mockImplementation(() =>
      setComments([comment({ replies: [reply(8)] })]),
    );
    return <OutdatedComments comments={comments} />;
  }

  it("lights the dot", async () => {
    jest.useFakeTimers();
    render(providers(<Live />));
    await act(async () => {});
    expect(screen.queryByTestId("new-replies-dot")).toBeNull();

    stamp("2");
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId("new-replies-dot")).toBeInTheDocument();
    jest.useRealTimers();
  });
});
