import { act, renderHook, waitFor } from "@testing-library/react";
import { useReviewComments } from "@/hooks/use-review-comments";
import { useSentFeedback } from "@/hooks/use-sent-feedback";
import {
  deleteReply,
  getMyReview,
  getReviewForDroplet,
  replyToComment,
} from "@/lib/requests/reviews";

jest.mock("@/lib/requests/reviews", () => ({
  getReviewForDroplet: jest.fn(),
  getMyReview: jest.fn(),
  replyToComment: jest.fn(),
  deleteReply: jest.fn(),
}));

const ok = <T>(data: T) => ({ ok: true as const, error: null, data });
const anchor = { v: 1 as const, field: "blocks" as const, blockId: "b1" };
const comment = {
  id: 21,
  field: "blocks" as const,
  anchor,
  body: "Fix",
  resolvedAt: null,
  replies: [],
};
const sent = { id: 7, round: 1, state: "sent" as const, comments: [comment] };
const reply = { id: 90, body: "hi", parent: { id: 21 }, mine: true };

beforeEach(() => jest.clearAllMocks());

// The reviewer replies in Comment mode, deletes it in Read mode, and returns
it("a reply posted in one hook and deleted in the other doesn't come back", async () => {
  const copy = { ...comment, id: 41, carriedFrom: { id: 21 } };
  const myReview = { id: 8, state: "open" as const, comments: [copy] };
  jest.mocked(getMyReview).mockResolvedValue(ok(myReview) as never);
  jest.mocked(replyToComment).mockResolvedValue(ok(reply) as never);
  const mine = renderHook(() => useReviewComments(3, true));
  await waitFor(() => expect(mine.result.current.isLoading).toBe(false));
  await act(async () => {
    await mine.result.current.reply(41, "hi");
  });

  jest
    .mocked(getReviewForDroplet)
    .mockResolvedValue(
      ok({ ...sent, comments: [{ ...comment, replies: [reply] }] }) as never,
    );
  const shared = renderHook(() =>
    useSentFeedback(3, true, { isAuthor: false }),
  );
  await waitFor(() =>
    expect(shared.result.current.comments[0]?.replies?.length).toBe(1),
  );
  jest.mocked(deleteReply).mockResolvedValue(ok({ id: 90 }) as never);
  await act(async () => {
    await shared.result.current.removeReply(90);
  });
  expect(shared.result.current.comments[0].replies).toEqual([]);

  await act(async () => {
    await mine.result.current.reload();
  });

  expect(mine.result.current.comments[0].replies).toEqual([]);
});
