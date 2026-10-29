import { act, renderHook, waitFor } from "@testing-library/react";
import { useSentFeedback } from "@/hooks/use-sent-feedback";
import { getReviewForDroplet, markAddressed } from "@/lib/requests/reviews";

jest.mock("@/lib/requests/reviews", () => ({
  getReviewForDroplet: jest.fn(),
  markAddressed: jest.fn(),
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

async function mount(enabled = true) {
  const hook = renderHook(({ on }) => useSentFeedback(3, on), {
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
