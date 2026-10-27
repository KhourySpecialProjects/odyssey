import { act, renderHook, waitFor } from "@testing-library/react";
import { useReviewComments } from "@/hooks/use-review-comments";
import {
  addComment,
  deleteComment,
  editComment,
  getMyReview,
  getOrOpenReview,
  resolveComment,
} from "@/lib/requests/reviews";

jest.mock("@/lib/requests/reviews", () => ({
  getMyReview: jest.fn(),
  getOrOpenReview: jest.fn(),
  addComment: jest.fn(),
  editComment: jest.fn(),
  deleteComment: jest.fn(),
  resolveComment: jest.fn(),
}));

const ok = <T>(data: T) => ({ ok: true as const, error: null, data });
const fail = (error: string) => ({ ok: false as const, error, data: null });

const saved = {
  id: 21,
  field: "blocks" as const,
  anchor: { v: 1 as const, field: "blocks" as const, blockId: "b1" },
  body: "Fix this",
  resolvedAt: null,
  lesson: { id: 4 } as never,
};
const review = { id: 7, round: 1, key: "3:9:1", state: "open" as const };
const input = {
  field: "blocks" as const,
  lessonId: 4,
  anchor: { v: 1 as const, field: "blocks" as const, blockId: "b2" },
  body: "New one",
};

async function mount(enabled = true) {
  const hook = renderHook(({ on }) => useReviewComments(3, on), {
    initialProps: { on: enabled },
  });
  if (enabled)
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("loading", () => {
  it("reads nothing while disabled", async () => {
    await mount(false);
    expect(getMyReview).not.toHaveBeenCalled();
  });

  it("loads the caller's review and its comments", async () => {
    jest
      .mocked(getMyReview)
      .mockResolvedValue(ok({ ...review, comments: [saved] }) as never);

    const { result } = await mount();

    expect(getMyReview).toHaveBeenCalledWith(3);
    expect(result.current.review).toMatchObject({ id: 7 });
    expect(result.current.comments).toEqual([saved]);
  });

  it("reports a failed load", async () => {
    jest.mocked(getMyReview).mockResolvedValue(fail("forbidden") as never);

    const { result } = await mount();

    expect(result.current.loadError).toBe("forbidden");
    expect(result.current.comments).toEqual([]);
  });

  it("treats a thrown load as failed", async () => {
    jest.mocked(getMyReview).mockRejectedValue(new Error("offline"));

    const { result } = await mount();

    expect(result.current.loadError).toBe("failed");
  });
});

describe("add", () => {
  it("opens the review on the first comment, then adds it", async () => {
    jest.mocked(getMyReview).mockResolvedValue(ok(null) as never);
    jest.mocked(getOrOpenReview).mockResolvedValue(ok(review) as never);
    jest.mocked(addComment).mockResolvedValue(
      ok({
        ...saved,
        id: 30,
        anchor: input.anchor,
        body: input.body,
      }) as never,
    );
    const { result } = await mount();

    let outcome;
    await act(async () => {
      outcome = await result.current.add(input);
    });

    expect(outcome).toEqual({ ok: true });
    expect(getOrOpenReview).toHaveBeenCalledWith(3);
    expect(addComment).toHaveBeenCalledWith({ reviewId: 7, ...input });
    expect(result.current.review).toMatchObject({ id: 7 });
    expect(result.current.comments).toEqual([
      expect.objectContaining({ id: 30, body: "New one", lesson: { id: 4 } }),
    ]);
  });

  it("doesn't open a review that is already loaded", async () => {
    jest
      .mocked(getMyReview)
      .mockResolvedValue(ok({ ...review, comments: [] }) as never);
    jest
      .mocked(addComment)
      .mockResolvedValue(ok({ ...saved, id: 30 }) as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.add(input);
    });

    expect(getOrOpenReview).not.toHaveBeenCalled();
  });

  it("shows the comment at once, before the save returns", async () => {
    jest
      .mocked(getMyReview)
      .mockResolvedValue(ok({ ...review, comments: [] }) as never);
    let finish!: (v: unknown) => void;
    jest
      .mocked(addComment)
      .mockReturnValue(new Promise((r) => (finish = r)) as never);
    const { result } = await mount();

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.add(input);
    });

    expect(result.current.comments).toEqual([
      expect.objectContaining({ body: "New one" }),
    ]);
    expect(result.current.comments[0].id).toBeLessThan(0);
    await act(async () => {
      finish(ok({ ...saved, id: 30 }));
      await pending;
    });
    expect(result.current.comments[0].id).toBe(30);
  });

  it("takes the comment back when the save fails", async () => {
    jest
      .mocked(getMyReview)
      .mockResolvedValue(ok({ ...review, comments: [saved] }) as never);
    jest.mocked(addComment).mockResolvedValue(fail("review_closed") as never);
    const { result } = await mount();

    let outcome;
    await act(async () => {
      outcome = await result.current.add(input);
    });

    expect(outcome).toEqual({ ok: false, error: "review_closed" });
    expect(result.current.comments).toEqual([saved]);
  });

  it("takes the comment back when opening the review fails", async () => {
    jest.mocked(getMyReview).mockResolvedValue(ok(null) as never);
    jest
      .mocked(getOrOpenReview)
      .mockResolvedValue(fail("not_in_review") as never);
    const { result } = await mount();

    let outcome;
    await act(async () => {
      outcome = await result.current.add(input);
    });

    expect(outcome).toEqual({ ok: false, error: "not_in_review" });
    expect(addComment).not.toHaveBeenCalled();
    expect(result.current.comments).toEqual([]);
  });
});

describe("edit, remove and resolve", () => {
  const other = { ...saved, id: 22, body: "Second" };

  beforeEach(() => {
    jest
      .mocked(getMyReview)
      .mockResolvedValue(ok({ ...review, comments: [saved, other] }) as never);
  });

  it("edits the body, and restores it on failure", async () => {
    jest.mocked(editComment).mockResolvedValueOnce(ok({}) as never);
    jest.mocked(editComment).mockResolvedValueOnce(fail("failed") as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.edit(21, "Better");
    });
    expect(result.current.comments[0].body).toBe("Better");

    let outcome;
    await act(async () => {
      outcome = await result.current.edit(21, "Worse");
    });
    expect(outcome).toEqual({ ok: false, error: "failed" });
    expect(result.current.comments[0].body).toBe("Better");
  });

  it("removes a comment, and puts it back in its place on failure", async () => {
    jest.mocked(deleteComment).mockRejectedValue(new Error("offline"));
    const { result } = await mount();

    let outcome;
    await act(async () => {
      outcome = await result.current.remove(21);
    });

    expect(outcome).toEqual({ ok: false, error: "failed" });
    expect(result.current.comments.map((c) => c.id)).toEqual([21, 22]);
  });

  it("resolves and reopens a comment", async () => {
    jest.mocked(resolveComment).mockResolvedValue(ok({}) as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.resolve(22);
    });
    expect(result.current.comments[1].resolvedAt).toEqual(expect.any(String));
    expect(resolveComment).toHaveBeenCalledWith(22, true);

    await act(async () => {
      await result.current.resolve(22, false);
    });
    expect(result.current.comments[1].resolvedAt).toBeNull();
  });

  it("is not_found for a comment it doesn't have", async () => {
    const { result } = await mount();

    let outcome;
    await act(async () => {
      outcome = await result.current.remove(99);
    });

    expect(outcome).toEqual({ ok: false, error: "not_found" });
    expect(deleteComment).not.toHaveBeenCalled();
  });
});
