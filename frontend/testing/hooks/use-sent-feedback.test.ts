import { act, renderHook, waitFor } from "@testing-library/react";
import { useSentFeedback } from "@/hooks/use-sent-feedback";
import { isEdited } from "@/lib/review-threads";
import {
  getReviewForDroplet,
  markAddressed,
  replyToComment,
  editReply,
  deleteReply,
} from "@/lib/requests/reviews";

jest.mock("@/lib/requests/reviews", () => ({
  getReviewForDroplet: jest.fn(),
  markAddressed: jest.fn(),
  replyToComment: jest.fn(),
  editReply: jest.fn(),
  deleteReply: jest.fn(),
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

  it("re-reads when a read began during the mark and landed before it settled", async () => {
    const { result } = await mount();
    let save: (v: unknown) => void = () => {};
    jest
      .mocked(markAddressed)
      .mockReturnValue(new Promise((r) => (save = r)) as never);
    let write: Promise<unknown> = Promise.resolve();
    act(() => {
      write = result.current.markAddressed(21);
    });
    // This read began after the mark did, and has the old state
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.comments[0].addressedAt).toBeNull();
    const addressedAt = "2026-10-29T09:00:00.000Z";
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue(
        ok({ ...sent, comments: [{ ...comment, addressedAt }] }) as never,
      );

    await act(async () => {
      save(ok(comment));
      await write;
    });

    expect(result.current.comments[0].addressedAt).toBe(addressedAt);
  });

  it("a read already in flight can't undo the mark, and one reload follows", async () => {
    const { result } = await mount();
    let land: (v: unknown) => void = () => {};
    jest
      .mocked(getReviewForDroplet)
      .mockReturnValueOnce(new Promise((r) => (land = r)) as never);
    let reloading: Promise<unknown> = Promise.resolve();
    act(() => {
      reloading = result.current.reload();
    });
    const addressedAt = "2026-10-29T09:00:00.000Z";
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue(
        ok({ ...sent, comments: [{ ...comment, addressedAt }] }) as never,
      );

    await act(async () => {
      await result.current.markAddressed(21);
    });
    await act(async () => {
      land(ok(sent));
      await reloading;
    });

    expect(result.current.comments[0].addressedAt).toBe(addressedAt);
    expect(getReviewForDroplet).toHaveBeenCalledTimes(3);
  });

  it("doesn't reload after marking addressed when no read was in flight", async () => {
    const { result } = await mount();

    await act(async () => {
      await result.current.markAddressed(21);
    });

    expect(getReviewForDroplet).toHaveBeenCalledTimes(1);
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

  it("a reply deleted elsewhere stays gone after a reload that began later", async () => {
    const savedReply = {
      ...comment,
      id: 90,
      body: "On it",
      parent: { id: 21 },
    };
    jest.mocked(replyToComment).mockResolvedValue(ok(savedReply) as never);
    const { result } = await mount();
    await act(async () => {
      await result.current.reply(21, "On it");
    });
    expect(result.current.comments[0].replies!.map((r) => r.id)).toEqual([90]);

    // The server no longer returns it
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.comments[0].replies ?? []).toEqual([]);
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

describe("editReply and removeReply", () => {
  const mine = {
    ...comment,
    id: 90,
    body: "Mine",
    mine: true,
    parent: { id: 21 },
    createdAt: "2026-11-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest
      .mocked(getReviewForDroplet)
      .mockResolvedValue(
        ok({ ...sent, comments: [{ ...comment, replies: [mine] }] }) as never,
      );
  });

  const shown = (r: { current: ReturnType<typeof useSentFeedback> }) =>
    r.current.comments[0].replies;

  it("shows an edit at once and keeps the saved row", async () => {
    let finish: (v: unknown) => void = () => {};
    jest
      .mocked(editReply)
      .mockReturnValue(new Promise((r) => (finish = r)) as never);
    const { result } = await mount();

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.editReply(90, "Better");
    });
    expect(shown(result)![0].body).toBe("Better");

    await act(async () => {
      finish(ok({ ...mine, body: "Better", updatedAt: "2026-11-02" }));
      await pending;
    });
    expect(editReply).toHaveBeenCalledWith(90, "Better");
    expect(shown(result)![0]).toMatchObject({ body: "Better", mine: true });
  });

  it("rolls an edit back when refused", async () => {
    jest.mocked(editReply).mockResolvedValue(fail("review_closed") as never);
    const { result } = await mount();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.editReply(90, "Better");
    });

    expect(outcome).toEqual({ ok: false, error: "review_closed" });
    expect(shown(result)![0].body).toBe("Mine");
  });

  it("removes a reply, restoring it when refused", async () => {
    jest.mocked(deleteReply).mockResolvedValue(fail("failed") as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.removeReply(90);
    });
    expect(shown(result)).toEqual([expect.objectContaining({ id: 90 })]);

    jest.mocked(deleteReply).mockResolvedValue(ok({ id: 90 }) as never);
    await act(async () => {
      await result.current.removeReply(90);
    });
    expect(shown(result)).toEqual([]);
  });

  it("reloads on a conflict", async () => {
    jest.mocked(editReply).mockResolvedValue(fail("conflict") as never);
    const { result } = await mount();
    jest.mocked(getReviewForDroplet).mockClear();

    await act(async () => {
      await result.current.editReply(90, "x");
    });

    expect(getReviewForDroplet).toHaveBeenCalledTimes(1);
  });

  it("doesn't bring a deleted own reply back on reload", async () => {
    jest
      .mocked(replyToComment)
      .mockResolvedValue(ok({ ...mine, id: 91 }) as never);
    jest.mocked(deleteReply).mockResolvedValue(ok({ id: 91 }) as never);
    const { result } = await mount();

    await act(async () => {
      await result.current.reply(21, "Mine");
    });
    await act(async () => {
      await result.current.removeReply(91);
    });
    await act(async () => {
      await result.current.reload();
    });

    expect(shown(result)!.map((r) => r.id)).toEqual([90]);
  });

  it("returns not_found for an unknown reply", async () => {
    const { result } = await mount();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.removeReply(5);
    });

    expect(outcome).toEqual({ ok: false, error: "not_found" });
    expect(deleteReply).not.toHaveBeenCalled();
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

    expect(isEdited(shown(result)![0])).toBe(true);
  });

  it.each(["delete", "edit"])(
    "a reload already in flight can't undo a %s",
    async (which) => {
      const edited = {
        ...mine,
        body: "Better",
        updatedAt: "2026-11-01T00:00:05.000Z",
      };
      jest.mocked(deleteReply).mockResolvedValue(ok({ id: 90 }) as never);
      jest.mocked(editReply).mockResolvedValue(ok(edited) as never);
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
        if (which === "delete") await result.current.removeReply(90);
        else await result.current.editReply(90, "Better");
      });
      await act(async () => {
        land(ok({ ...sent, comments: [{ ...comment, replies: [mine] }] }));
        await reloading;
      });

      expect(shown(result)!.map((r) => r.body)).toEqual(
        which === "delete" ? [] : ["Better"],
      );
    },
  );
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
