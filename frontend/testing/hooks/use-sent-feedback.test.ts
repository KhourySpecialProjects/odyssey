import { act, renderHook, waitFor } from "@testing-library/react";
import { useSentFeedback } from "@/hooks/use-sent-feedback";
import {
  getReviewForDroplet,
  markAddressed,
  replyToComment,
} from "@/lib/requests/reviews";

jest.mock("@/lib/requests/reviews", () => ({
  getReviewForDroplet: jest.fn(),
  markAddressed: jest.fn(),
  replyToComment: jest.fn(),
}));

const ok = <T>(data: T) => ({ ok: true as const, error: null, data });
const fail = (error: string) => ({ ok: false as const, error, data: null });

const comment = {
  id: 21,
  field: "blocks" as const,
  anchor: { v: 1 as const, field: "blocks" as const, blockId: "b1" },
  body: "Fix this",
  resolvedAt: null,
  addressedAt: null,
};
const sent = {
  id: 7,
  round: 1,
  key: "3:9:1",
  state: "sent" as const,
  sentAt: "2026-10-28T12:00:00.000Z",
  summaryNote: "Nearly there.",
  comments: [comment],
};

async function mount(enabled = true, isAuthor = true) {
  const hook = renderHook(({ on }) => useSentFeedback(3, on, { isAuthor }), {
    initialProps: { on: enabled },
  });
  if (enabled)
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getReviewForDroplet).mockResolvedValue(ok(sent) as never);
  jest.mocked(markAddressed).mockResolvedValue(ok(comment) as never);
});

describe("useSentFeedback (ODY-807)", () => {
  it("loads the feedback sent to the authors", async () => {
    const { result } = await mount();

    expect(getReviewForDroplet).toHaveBeenCalledWith(3);
    expect(result.current.review).toMatchObject({ id: 7, state: "sent" });
    expect(result.current.comments).toEqual([comment]);
  });

  it("shows nothing when the server has nothing sent", async () => {
    jest.mocked(getReviewForDroplet).mockResolvedValue(ok(null) as never);

    const { result } = await mount();

    expect(result.current.review).toBeNull();
    expect(result.current.comments).toEqual([]);
  });

  it("shows nothing of a published review", async () => {
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue(ok({ ...sent, state: "published" }) as never);

    const { result } = await mount();

    expect(result.current.comments).toEqual([]);
  });

  it("reads nothing while disabled", async () => {
    const { result } = await mount(false);

    expect(getReviewForDroplet).not.toHaveBeenCalled();
    expect(result.current.comments).toEqual([]);
  });

  it("reports a failed load", async () => {
    jest.mocked(getReviewForDroplet).mockResolvedValue(fail("failed") as never);

    const { result } = await mount();

    expect(result.current.loadError).toBe("failed");
  });

  it("marks a comment addressed at once", async () => {
    const { result } = await mount();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.markAddressed(21);
    });

    expect(outcome).toEqual({ ok: true });
    expect(markAddressed).toHaveBeenCalledWith(21, true);
    expect(typeof result.current.comments[0].addressedAt).toBe("string");
  });

  it("lets only an author mark addressed (ODY-881)", async () => {
    const author = await mount();
    const reviewer = await mount(true, false);
    expect(author.result.current.canAddress).toBe(true);
    expect(reviewer.result.current.canAddress).toBe(false);

    let outcome: unknown;
    await act(async () => {
      outcome = await reviewer.result.current.markAddressed(21);
    });

    expect(outcome).toEqual({ ok: false, error: "forbidden" });
    expect(markAddressed).not.toHaveBeenCalled();
    expect(reviewer.result.current.comments[0].addressedAt).toBeNull();
  });

  it("rolls the mark back when the server refuses it", async () => {
    jest
      .mocked(markAddressed)
      .mockResolvedValue(fail("review_closed") as never);
    const { result } = await mount();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.markAddressed(21);
    });

    expect(outcome).toEqual({ ok: false, error: "review_closed" });
    expect(result.current.comments[0].addressedAt).toBeNull();
  });

  it("clears the mark, and restores it if that's refused", async () => {
    const addressedAt = "2026-10-29T09:00:00.000Z";
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue(
        ok({ ...sent, comments: [{ ...comment, addressedAt }] }) as never,
      );
    jest.mocked(markAddressed).mockRejectedValue(new Error("offline"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { result } = await mount();

    await act(async () => {
      await result.current.markAddressed(21, false);
    });

    expect(markAddressed).toHaveBeenCalledWith(21, false);
    expect(result.current.comments[0].addressedAt).toBe(addressedAt);
  });
});

describe("reply", () => {
  const savedReply = { ...comment, id: 90, body: "On it", parent: { id: 21 } };

  it("shows the reply at once, then swaps in the saved row", async () => {
    let finish: (v: unknown) => void = () => {};
    jest
      .mocked(replyToComment)
      .mockReturnValue(new Promise((r) => (finish = r)) as never);
    const { result } = await mount();

    let outcome: unknown;
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.reply(21, "On it").then((o) => (outcome = o));
    });
    const shown = result.current.comments[0].replies!;
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ body: "On it", mine: true });
    expect(shown[0].id).toBeLessThan(0);

    await act(async () => {
      finish(ok(savedReply));
      await pending;
    });

    expect(outcome).toEqual({ ok: true });
    expect(replyToComment).toHaveBeenCalledWith(21, "On it");
    expect(result.current.comments[0].replies).toEqual([
      expect.objectContaining({ id: 90, mine: true }),
    ]);
  });

  it("puts a carried copy's reply on every copy of the root", async () => {
    const copy = { ...comment, id: 30, carriedFrom: { id: 21 } };
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue(ok({ ...sent, comments: [comment, copy] }) as never);
    jest.mocked(replyToComment).mockResolvedValue(ok(savedReply) as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.reply(30, "On it");
    });

    expect(result.current.comments.map((c) => c.replies?.length)).toEqual([
      1, 1,
    ]);
  });

  it("rolls back and returns the refusal", async () => {
    jest
      .mocked(replyToComment)
      .mockResolvedValue(fail("review_closed") as never);
    const { result } = await mount();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.reply(21, "Late");
    });

    expect(outcome).toEqual({ ok: false, error: "review_closed" });
    expect(result.current.comments[0].replies).toEqual([]);
  });

  it("is not_found for a comment it doesn't have", async () => {
    const { result } = await mount();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.reply(99, "Hi");
    });

    expect(outcome).toEqual({ ok: false, error: "not_found" });
    expect(replyToComment).not.toHaveBeenCalled();
  });

  it("doesn't add a saved reply twice when a reload already has it", async () => {
    let finish: (v: unknown) => void = () => {};
    jest
      .mocked(replyToComment)
      .mockReturnValue(new Promise((r) => (finish = r)) as never);
    const { result } = await mount();
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.reply(21, "On it");
    });
    jest.mocked(getReviewForDroplet).mockResolvedValue(
      ok({
        ...sent,
        comments: [{ ...comment, replies: [savedReply] }],
      }) as never,
    );
    await act(async () => {
      await result.current.reload();
    });

    await act(async () => {
      finish(ok(savedReply));
      await pending;
    });

    expect(result.current.comments[0].replies!.map((r) => r.id)).toEqual([90]);
  });
});

describe("reload", () => {
  it("keeps a reply saved while an earlier read was still in flight", async () => {
    const savedReply = {
      ...comment,
      id: 90,
      body: "On it",
      parent: { id: 21 },
    };
    jest.mocked(replyToComment).mockResolvedValue(ok(savedReply) as never);
    const { result } = await mount();
    let land: (v: unknown) => void = () => {};
    jest
      .mocked(getReviewForDroplet)
      .mockReturnValue(new Promise((r) => (land = r)) as never);
    let reloading: Promise<unknown> = Promise.resolve();
    act(() => {
      reloading = result.current.reload();
    });

    await act(async () => {
      await result.current.reply(21, "On it");
    });
    await act(async () => {
      land(ok({ ...sent, comments: [{ ...comment, replies: [] }] }));
      await reloading;
    });

    expect(result.current.comments[0].replies!.map((r) => r.id)).toEqual([90]);
  });

  it("keeps the feedback shown when a reload fails", async () => {
    const { result } = await mount();
    jest.mocked(getReviewForDroplet).mockResolvedValue(fail("failed") as never);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.review).toMatchObject({ id: 7 });
    expect(result.current.loadError).toBe("failed");
  });

  it("does nothing while disabled", async () => {
    const { result } = await mount(false);

    await act(async () => {
      await result.current.reload();
    });

    expect(getReviewForDroplet).not.toHaveBeenCalled();
  });

  it("reads the feedback again", async () => {
    const { result } = await mount();

    await act(async () => {
      await result.current.reload();
    });

    expect(getReviewForDroplet).toHaveBeenCalledTimes(2);
  });
});

describe("a load the page leaves before it answers", () => {
  it("logs nothing", async () => {
    let reject: (e: Error) => void = () => {};
    jest
      .mocked(getReviewForDroplet)
      .mockReturnValue(new Promise((_, no) => (reject = no)) as never);
    const errors = jest.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderHook(() =>
      useSentFeedback(3, true, { isAuthor: true }),
    );

    unmount();
    await act(async () => reject(new Error("network error")));

    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
