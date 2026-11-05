import { act, renderHook, waitFor } from "@testing-library/react";
import { useReviewComments } from "@/hooks/use-review-comments";
import { isEdited } from "@/lib/review-threads";
import {
  addComment,
  deleteComment,
  editComment,
  getMyReview,
  getOrOpenReview,
  replyToComment,
  editReply,
  deleteReply,
  resolveComment,
} from "@/lib/requests/reviews";

jest.mock("@/lib/requests/reviews", () => ({
  getMyReview: jest.fn(),
  getOrOpenReview: jest.fn(),
  addComment: jest.fn(),
  editComment: jest.fn(),
  deleteComment: jest.fn(),
  resolveComment: jest.fn(),
  replyToComment: jest.fn(),
  editReply: jest.fn(),
  deleteReply: jest.fn(),
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

describe("a comment made before the first load returns", () => {
  /** getMyReview that returns `data` only when `finish` is called */
  function slowLoad(data: unknown) {
    let finish = () => {};
    jest.mocked(getMyReview).mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve(ok(data) as never);
      }) as never,
    );
    return () => act(async () => finish());
  }

  it("keeps it while it's still saving", async () => {
    const finish = slowLoad({ ...review, comments: [saved] });
    jest.mocked(getOrOpenReview).mockResolvedValue(ok(review) as never);
    jest.mocked(addComment).mockReturnValue(new Promise(() => {}) as never);
    const { result } = renderHook(() => useReviewComments(3, true));

    act(() => {
      void result.current.add(input);
    });
    await finish();

    expect(result.current.comments.map((c) => c.id)).toEqual([21, -1]);
    expect(result.current.review).toMatchObject({ id: 7 });
  });

  it("keeps it once saved, though the load began before the save", async () => {
    const finish = slowLoad(null);
    jest.mocked(getOrOpenReview).mockResolvedValue(ok(review) as never);
    jest
      .mocked(addComment)
      .mockResolvedValue(ok({ ...saved, id: 30, body: "New one" }) as never);
    const { result } = renderHook(() => useReviewComments(3, true));

    await act(async () => {
      await result.current.add(input);
    });
    await finish();

    expect(result.current.comments.map((c) => c.id)).toEqual([30]);
    // The review it opened isn't lost to the load's older answer
    expect(result.current.review).toMatchObject({ id: 7 });
  });
});

describe("another droplet", () => {
  it("starts afresh, keeping nothing of the last one's review", async () => {
    jest
      .mocked(getMyReview)
      .mockResolvedValueOnce(ok({ ...review, comments: [saved] }) as never)
      .mockResolvedValueOnce(ok(null) as never);
    const hook = renderHook(({ id }) => useReviewComments(id, true), {
      initialProps: { id: 3 },
    });
    await waitFor(() => expect(hook.result.current.review).not.toBeNull());

    hook.rerender({ id: 4 });
    await waitFor(() => expect(getMyReview).toHaveBeenCalledWith(4));
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

    expect(hook.result.current.review).toBeNull();
    expect(hook.result.current.comments).toEqual([]);
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

describe("a read already in flight during a write", () => {
  const other = { ...saved, id: 22, body: "Second" };
  const server = (...comments: unknown[]) =>
    ok({ ...review, comments }) as never;

  it.each([
    [
      "resolve",
      (r: ReturnType<typeof useReviewComments>) => r.resolve(21),
      () => server({ ...saved, resolvedAt: "t" }, other),
      (c: { id: number; resolvedAt?: unknown }[]) => !!c[0].resolvedAt,
    ],
    [
      "delete",
      (r: ReturnType<typeof useReviewComments>) => r.remove(21),
      () => server(other),
      (c: { id: number }[]) => c.map((x) => x.id).join() === "22",
    ],
    [
      "edit",
      (r: ReturnType<typeof useReviewComments>) => r.edit(21, "Better"),
      () => server({ ...saved, body: "Better" }, other),
      (c: { body: string }[]) => c[0].body === "Better",
    ],
  ])(
    "can't undo a %s, and one reload follows the write",
    async (_name, write, after, holds) => {
      jest.mocked(getMyReview).mockResolvedValue(server(saved, other));
      jest.mocked(resolveComment).mockResolvedValue(ok({}) as never);
      jest.mocked(deleteComment).mockResolvedValue(ok({}) as never);
      jest.mocked(editComment).mockResolvedValue(ok({}) as never);
      const { result } = await mount();
      let land: (v: unknown) => void = () => {};
      jest
        .mocked(getMyReview)
        .mockReturnValueOnce(new Promise((r) => (land = r)) as never);
      let reloading: Promise<unknown> = Promise.resolve();
      act(() => {
        reloading = result.current.reload();
      });
      jest.mocked(getMyReview).mockResolvedValue(after());

      await act(async () => {
        await write(result.current);
      });
      await act(async () => {
        land(server(saved, other));
        await reloading;
      });

      expect(holds(result.current.comments)).toBe(true);
      expect(getMyReview).toHaveBeenCalledTimes(3);
    },
  );

  it("ends with both writes shown when two resolves follow a read in flight", async () => {
    jest.mocked(getMyReview).mockResolvedValue(server(saved, other));
    const { result } = await mount();
    const later = { ...other, resolvedAt: "t" };
    const first = { ...saved, resolvedAt: "t" };
    jest
      .mocked(getMyReview)
      .mockReturnValueOnce(new Promise(() => {}) as never);
    act(() => {
      void result.current.reload();
    });
    let saveA: (v: unknown) => void = () => {};
    let saveB: (v: unknown) => void = () => {};
    jest
      .mocked(resolveComment)
      .mockReturnValueOnce(new Promise((r) => (saveA = r)) as never)
      .mockReturnValueOnce(new Promise((r) => (saveB = r)) as never);
    // The read A's settle starts sees only A saved
    let landA: (v: unknown) => void = () => {};
    jest
      .mocked(getMyReview)
      .mockReturnValueOnce(new Promise((r) => (landA = r)) as never);
    jest.mocked(getMyReview).mockResolvedValue(server(first, later));

    let writes: Promise<unknown> = Promise.resolve();
    act(() => {
      writes = Promise.all([
        result.current.resolve(21),
        result.current.resolve(22),
      ]);
    });
    await act(async () => {
      saveA(ok({}));
    });
    await act(async () => {
      saveB(ok({}));
      await writes;
    });
    await act(async () => {
      landA(server(first, other));
    });

    expect(result.current.comments.map((c) => !!c.resolvedAt)).toEqual([
      true,
      true,
    ]);
  });

  it("re-reads when a read began during the write and landed before it settled", async () => {
    jest.mocked(getMyReview).mockResolvedValue(server(saved, other));
    const { result } = await mount();
    let save: (v: unknown) => void = () => {};
    jest
      .mocked(resolveComment)
      .mockReturnValue(new Promise((r) => (save = r)) as never);
    let write: Promise<unknown> = Promise.resolve();
    act(() => {
      write = result.current.resolve(21);
    });
    // This read began after the write did, and has the old state
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.comments[0].resolvedAt).toBeNull();
    jest
      .mocked(getMyReview)
      .mockResolvedValue(server({ ...saved, resolvedAt: "t" }, other));

    await act(async () => {
      save(ok({}));
      await write;
    });

    expect(result.current.comments[0].resolvedAt).toBeTruthy();
  });

  it("doesn't reload after a write when no read was in flight", async () => {
    jest.mocked(getMyReview).mockResolvedValue(server(saved, other));
    jest.mocked(resolveComment).mockResolvedValue(ok({}) as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.resolve(21);
    });

    expect(getMyReview).toHaveBeenCalledTimes(1);
  });

  it("reloads after a refused write too", async () => {
    jest.mocked(getMyReview).mockResolvedValue(server(saved, other));
    jest.mocked(resolveComment).mockResolvedValue(fail("failed") as never);
    const { result } = await mount();
    jest
      .mocked(getMyReview)
      .mockReturnValueOnce(new Promise(() => {}) as never);
    act(() => {
      void result.current.reload();
    });
    jest.mocked(getMyReview).mockResolvedValue(server(saved, other));

    await act(async () => {
      await result.current.resolve(21);
    });

    expect(getMyReview).toHaveBeenCalledTimes(3);
    expect(result.current.comments[0].resolvedAt).toBeNull();
  });
});

describe("reply", () => {
  const copy = { ...saved, id: 31, carriedFrom: { id: 21 } };
  const reply = { ...saved, id: 90, body: "Fixed", parent: { id: 21 } };

  beforeEach(() => {
    jest
      .mocked(getMyReview)
      .mockResolvedValue(ok({ ...review, comments: [copy] }) as never);
  });

  it("shows the reply at once, then swaps in the saved row", async () => {
    let finish: (v: unknown) => void = () => {};
    jest
      .mocked(replyToComment)
      .mockReturnValue(new Promise((r) => (finish = r)) as never);
    const { result } = await mount();

    let outcome: unknown;
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.reply(31, "Fixed").then((o) => (outcome = o));
    });
    const shown = result.current.comments[0].replies!;
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ body: "Fixed", mine: true });
    expect(shown[0].id).toBeLessThan(0);

    await act(async () => {
      finish(ok(reply));
      await pending;
    });

    expect(outcome).toEqual({ ok: true });
    expect(replyToComment).toHaveBeenCalledWith(31, "Fixed");
    expect(result.current.comments[0].replies!.map((r) => r.id)).toEqual([90]);
  });

  it("rolls back and returns the refusal", async () => {
    jest
      .mocked(replyToComment)
      .mockResolvedValue(fail("review_closed") as never);
    const { result } = await mount();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.reply(31, "Late");
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

  it("keeps a reply saved while an earlier read was still in flight", async () => {
    jest.mocked(replyToComment).mockResolvedValue(ok(reply) as never);
    const { result } = await mount();
    let land: (v: unknown) => void = () => {};
    jest
      .mocked(getMyReview)
      .mockReturnValue(new Promise((r) => (land = r)) as never);
    let reloading: Promise<unknown> = Promise.resolve();
    act(() => {
      reloading = result.current.reload();
    });

    await act(async () => {
      await result.current.reply(31, "Fixed");
    });
    await act(async () => {
      land(ok({ ...review, comments: [copy] }));
      await reloading;
    });

    expect(result.current.comments[0].replies!.map((r) => r.id)).toEqual([90]);
  });

  it("a reply deleted elsewhere stays gone after a reload that began later", async () => {
    jest.mocked(replyToComment).mockResolvedValue(ok(reply) as never);
    const { result } = await mount();
    await act(async () => {
      await result.current.reply(31, "Fixed");
    });
    expect(result.current.comments[0].replies!.map((r) => r.id)).toEqual([90]);

    // The server no longer returns it
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.comments[0].replies ?? []).toEqual([]);
  });

  it("reload does nothing while disabled", async () => {
    const { result } = await mount(false);

    await act(async () => {
      await result.current.reload();
    });

    expect(getMyReview).not.toHaveBeenCalled();
  });

  it("reload refetches the review", async () => {
    const { result } = await mount();

    await act(async () => {
      await result.current.reload();
    });

    expect(getMyReview).toHaveBeenCalledTimes(2);
  });
});

describe("editReply and removeReply", () => {
  const copy = { ...saved, id: 31, carriedFrom: { id: 21 } };
  const mine = {
    ...saved,
    id: 90,
    body: "Mine",
    mine: true,
    parent: { id: 21 },
    createdAt: "2026-11-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest
      .mocked(getMyReview)
      .mockResolvedValue(
        ok({ ...review, comments: [{ ...copy, replies: [mine] }] }) as never,
      );
  });

  it("shows an edit and keeps the saved row", async () => {
    jest
      .mocked(editReply)
      .mockResolvedValue(ok({ ...mine, body: "Better" }) as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.editReply(90, "Better");
    });

    expect(editReply).toHaveBeenCalledWith(90, "Better");
    expect(result.current.comments[0].replies![0]).toMatchObject({
      body: "Better",
      mine: true,
    });
  });

  it("rolls an edit back when refused", async () => {
    jest.mocked(editReply).mockResolvedValue(fail("review_closed") as never);
    const { result } = await mount();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.editReply(90, "Better");
    });

    expect(outcome).toEqual({ ok: false, error: "review_closed" });
    expect(result.current.comments[0].replies![0].body).toBe("Mine");
  });

  it("removes a reply, restoring it when refused", async () => {
    jest.mocked(deleteReply).mockResolvedValue(fail("failed") as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.removeReply(90);
    });
    expect(result.current.comments[0].replies).toHaveLength(1);

    jest.mocked(deleteReply).mockResolvedValue(ok({ id: 90 }) as never);
    await act(async () => {
      await result.current.removeReply(90);
    });
    expect(result.current.comments[0].replies).toEqual([]);
  });

  it("reloads on a conflict", async () => {
    jest.mocked(deleteReply).mockResolvedValue(fail("conflict") as never);
    const { result } = await mount();
    jest.mocked(getMyReview).mockClear();

    await act(async () => {
      await result.current.removeReply(90);
    });

    expect(getMyReview).toHaveBeenCalledTimes(1);
  });

  it("marks an edited reply as edited", async () => {
    jest.mocked(editReply).mockResolvedValue(
      ok({
        ...mine,
        body: "B",
        updatedAt: "2026-11-01T00:00:05.000Z",
      }) as never,
    );
    const { result } = await mount();

    await act(async () => {
      await result.current.editReply(90, "B");
    });

    expect(isEdited(result.current.comments[0].replies![0])).toBe(true);
  });

  it("a deleted own reply doesn't come back on reload", async () => {
    const posted = { ...mine, id: 91, body: "Posted here" };
    jest.mocked(replyToComment).mockResolvedValue(ok(posted) as never);
    jest.mocked(deleteReply).mockResolvedValue(ok({ id: 91 }) as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.reply(31, "Posted here");
    });
    await act(async () => {
      await result.current.removeReply(91);
    });
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.comments[0].replies!.map((r) => r.id)).toEqual([90]);
  });

  it("an edited posted reply the server no longer has is gone after a reload", async () => {
    const posted = { ...mine, id: 91, body: "Old" };
    jest.mocked(replyToComment).mockResolvedValue(ok(posted) as never);
    jest
      .mocked(editReply)
      .mockResolvedValue(ok({ ...posted, body: "New" }) as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.reply(31, "Old");
    });
    await act(async () => {
      await result.current.editReply(91, "New");
    });
    // The server no longer returns it
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.comments[0].replies!.map((r) => r.id)).toEqual([90]);
  });

  it.each(["delete", "edit"])(
    "a reload already in flight can't undo a %s",
    async (which) => {
      jest.mocked(deleteReply).mockResolvedValue(ok({ id: 90 }) as never);
      jest
        .mocked(editReply)
        .mockResolvedValue(ok({ ...mine, body: "Better" }) as never);
      const { result } = await mount();
      let land: (v: unknown) => void = () => {};
      jest
        .mocked(getMyReview)
        .mockReturnValue(new Promise((r) => (land = r)) as never);
      let reloading: Promise<unknown> = Promise.resolve();
      act(() => {
        reloading = result.current.reload();
      });

      await act(async () => {
        if (which === "delete") await result.current.removeReply(90);
        else await result.current.editReply(90, "Better");
      });
      await act(async () => {
        land(ok({ ...review, comments: [{ ...copy, replies: [mine] }] }));
        await reloading;
      });

      expect(result.current.comments[0].replies!.map((r) => r.body)).toEqual(
        which === "delete" ? [] : ["Better"],
      );
    },
  );
});

describe("ensureReview", () => {
  it("shares one open between concurrent callers and add reuses it", async () => {
    jest.mocked(getMyReview).mockResolvedValue(ok(null) as never);
    jest.mocked(getOrOpenReview).mockResolvedValue(ok(review) as never);
    jest.mocked(addComment).mockResolvedValue(ok(saved) as never);
    const { result } = await mount();

    let both: unknown;
    await act(async () => {
      both = await Promise.all([
        result.current.ensureReview(),
        result.current.ensureReview(),
      ]);
      await result.current.add(input);
    });

    expect(both).toEqual([
      { ok: true, data: review },
      { ok: true, data: review },
    ]);
    expect(result.current.review).toEqual(review);
    expect(getOrOpenReview).toHaveBeenCalledTimes(1);
    expect(addComment).toHaveBeenCalledWith(
      expect.objectContaining({ reviewId: 7 }),
    );
  });

  it("returns the error when opening fails, and tries again next time", async () => {
    jest.mocked(getMyReview).mockResolvedValue(ok(null) as never);
    jest
      .mocked(getOrOpenReview)
      .mockResolvedValueOnce(fail("forbidden") as never)
      .mockResolvedValueOnce(ok(review) as never);
    const { result } = await mount();

    let bad, good;
    await act(async () => {
      bad = await result.current.ensureReview();
      good = await result.current.ensureReview();
    });

    expect(bad).toEqual({ ok: false, error: "forbidden" });
    expect(good).toEqual({ ok: true, data: review });
  });
});
