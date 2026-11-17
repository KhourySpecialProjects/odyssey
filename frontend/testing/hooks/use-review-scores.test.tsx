import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useReviewScores } from "@/hooks/use-review-scores";
import {
  ReviewCommentsProvider,
  useSharedReviewComments,
} from "@/components/draft/review/review-comments-context";
import {
  acceptAiScores,
  addComment,
  getMyReview,
  getOrOpenReview,
  saveReviewScore,
  unconfirmScores,
} from "@/lib/requests/reviews";
import type { PanelScore } from "@/lib/review-panel/model";

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/lib/requests/reviews", () => ({
  getMyReview: jest.fn(),
  getOrOpenReview: jest.fn(),
  addComment: jest.fn(),
  editComment: jest.fn(),
  deleteComment: jest.fn(),
  resolveComment: jest.fn(),
  acceptAiScores: jest.fn(),
  unconfirmScores: jest.fn(),
  saveReviewScore: jest.fn(),
}));

const ok = <T,>(data: T) => ({ ok: true as const, error: null, data });
const fail = (error: string) => ({ ok: false as const, error, data: null });
const review = { id: 7, round: 1, key: "3:9:1", state: "open" as const };

const row = (
  lessonId: number | null,
  criterionId: number,
  value: number | null,
  aiValue: number | null,
): PanelScore => ({ lessonId, criterionId, value, aiValue });

const server = [row(4, 1, null, 2), row(4, 2, null, 5), row(null, 1, 3, 3)];

const wrapper = ({ children }: { children: ReactNode }) => (
  <ReviewCommentsProvider dropletId={3} enabled>
    {children}
  </ReviewCommentsProvider>
);

async function mount(initial: PanelScore[] = server) {
  const hook = renderHook(
    ({ scores }) => ({
      s: useReviewScores(scores),
      c: useSharedReviewComments()!,
    }),
    { wrapper, initialProps: { scores: initial } },
  );
  await waitFor(() => expect(hook.result.current.c.isLoading).toBe(false));
  return hook;
}

const valueOf = (scores: PanelScore[], lessonId: number | null, id: number) =>
  scores.find((s) => s.lessonId === lessonId && s.criterionId === id)?.value;

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  (getMyReview as jest.Mock).mockResolvedValue(ok(null));
  (getOrOpenReview as jest.Mock).mockResolvedValue(ok(review));
});

describe("confirm", () => {
  it("shows the AI values at once, opens the review, then reconciles", async () => {
    let finish!: (v: unknown) => void;
    (acceptAiScores as jest.Mock).mockReturnValue(
      new Promise((r) => (finish = r)),
    );
    const { result } = await mount();

    let done!: Promise<void>;
    act(() => {
      done = result.current.s.confirm(4);
    });
    expect(valueOf(result.current.s.scores, 4, 1)).toBe(2);
    expect(valueOf(result.current.s.scores, 4, 2)).toBe(5);
    expect(result.current.s.pendingScope.has(4)).toBe(true);

    await waitFor(() => expect(acceptAiScores).toHaveBeenCalledWith(7, 4));
    expect(getOrOpenReview).toHaveBeenCalledWith(3);
    await act(async () => {
      finish(
        ok([
          { id: 1, key: "7:4:1", criterionName: "Tone", value: 3, aiValue: 2 },
          { id: 2, key: "7:4:2", criterionName: "Style", value: 5, aiValue: 5 },
        ]),
      );
      await done;
    });
    expect(result.current.s.pendingScope.size).toBe(0);
    // The server's value replaces the optimistic one
    expect(valueOf(result.current.s.scores, 4, 1)).toBe(3);
    expect(valueOf(result.current.s.scores, 4, 2)).toBe(5);
  });

  it.each([
    ["an { ok: false }", () => Promise.resolve(fail("failed"))],
    ["a throw", () => Promise.reject(new Error("offline"))],
  ])("rolls back and toasts on %s", async (_, outcome) => {
    (acceptAiScores as jest.Mock).mockImplementation(outcome);
    const rows = [...server, row(4, 3, 4, 5), row(9, 1, null, 2)];
    const { result } = await mount(rows);

    await act(async () => {
      await result.current.s.confirm(4);
    });
    expect(result.current.s.scores).toEqual(rows);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(result.current.s.pendingScope.size).toBe(0);
  });

  it("rolls back when the review can't be opened", async () => {
    (getOrOpenReview as jest.Mock).mockResolvedValue(fail("not_in_review"));
    const { result } = await mount();

    await act(async () => {
      await result.current.s.confirm(4);
    });
    expect(acceptAiScores).not.toHaveBeenCalled();
    expect(valueOf(result.current.s.scores, 4, 1)).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it("ignores a second confirm on the same scope while pending", async () => {
    (acceptAiScores as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = await mount();

    act(() => {
      void result.current.s.confirm(4);
      void result.current.s.confirm(4);
    });
    await waitFor(() => expect(acceptAiScores).toHaveBeenCalledTimes(1));
  });

  it("opens the review once when a comment is added alongside", async () => {
    (acceptAiScores as jest.Mock).mockResolvedValue(ok([]));
    (addComment as jest.Mock).mockResolvedValue(
      ok({ id: 21, body: "x", field: "blocks", resolvedAt: null }),
    );
    const { result } = await mount();

    await act(async () => {
      await Promise.all([
        result.current.s.confirm(4),
        result.current.c.add({
          field: "blocks",
          lessonId: 4,
          anchor: { v: 1, field: "blocks", blockId: "b1" },
          body: "x",
        }),
      ]);
    });
    expect(getOrOpenReview).toHaveBeenCalledTimes(1);
  });
});

describe("undo", () => {
  const confirmed = [row(4, 1, 2, 2), row(4, 2, 4, 5)];

  it("clears values equal to the AI's and reconciles", async () => {
    (unconfirmScores as jest.Mock).mockResolvedValue(
      ok([
        { id: 1, key: "7:4:1", criterionName: "Tone", value: null, aiValue: 2 },
      ]),
    );
    const { result } = await mount(confirmed);

    await act(async () => {
      await result.current.s.undo(4);
    });
    expect(unconfirmScores).toHaveBeenCalledWith(7, 4);
    expect(valueOf(result.current.s.scores, 4, 1)).toBeNull();
    expect(valueOf(result.current.s.scores, 4, 2)).toBe(4);
  });

  it("restores the values and toasts on failure", async () => {
    (unconfirmScores as jest.Mock).mockResolvedValue(fail("failed"));
    const rows = [...confirmed, row(4, 3, 4, 5), row(9, 1, 2, 2)];
    const { result } = await mount(rows);

    await act(async () => {
      await result.current.s.undo(4);
    });
    expect(result.current.s.scores).toEqual(rows);
    expect(toast.error).toHaveBeenCalled();
  });
});

describe("change", () => {
  it("saves the value through saveReviewScore", async () => {
    (saveReviewScore as jest.Mock).mockResolvedValue(
      ok({ id: 1, key: "7:4:1", criterionName: "Tone", value: 4, aiValue: 2 }),
    );
    const { result } = await mount();

    await act(async () => {
      await result.current.s.change(1, 4, 4);
    });
    expect(saveReviewScore).toHaveBeenCalledWith({
      reviewId: 7,
      lessonId: 4,
      criterionId: 1,
      value: 4,
    });
    expect(valueOf(result.current.s.scores, 4, 1)).toBe(4);
  });

  it("restores the old value on failure", async () => {
    (saveReviewScore as jest.Mock).mockResolvedValue(fail("failed"));
    const rows = [...server, row(4, 3, 4, 5), row(9, 1, null, 2)];
    const { result } = await mount(rows);

    await act(async () => {
      await result.current.s.change(1, 4, 4);
    });
    expect(result.current.s.scores).toEqual(rows);
    expect(toast.error).toHaveBeenCalled();
  });

  it("scores a criterion that had no row, and removes it on failure", async () => {
    (saveReviewScore as jest.Mock).mockResolvedValue(fail("failed"));
    const { result } = await mount([]);

    await act(async () => {
      await result.current.s.change(9, null, 3);
    });
    expect(result.current.s.scores).toEqual([]);
  });
});

describe("overall scope", () => {
  it("confirms the Overall Score and tracks it as pending", async () => {
    (acceptAiScores as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = await mount([row(null, 1, null, 4), row(4, 1, null, 2)]);

    act(() => {
      void result.current.s.confirm(null);
    });
    expect(valueOf(result.current.s.scores, null, 1)).toBe(4);
    expect(valueOf(result.current.s.scores, 4, 1)).toBeNull();
    expect(result.current.s.pendingScope.has("overall")).toBe(true);

    await waitFor(() => expect(acceptAiScores).toHaveBeenCalledWith(7, null));
  });

  it("applies the server's Overall value over the optimistic one", async () => {
    (acceptAiScores as jest.Mock).mockResolvedValue(
      ok([
        {
          id: 1,
          key: "7:overall:1",
          criterionName: "Tone",
          value: 2,
          aiValue: 4,
        },
      ]),
    );
    const { result } = await mount([row(null, 1, null, 4), row(4, 1, null, 2)]);

    await act(async () => {
      await result.current.s.confirm(null);
    });
    expect(valueOf(result.current.s.scores, null, 1)).toBe(2);
    expect(valueOf(result.current.s.scores, 4, 1)).toBeNull();
  });

  it("saves a changed Overall value under the overall scope", async () => {
    (saveReviewScore as jest.Mock).mockResolvedValue(
      ok({
        id: 1,
        key: "7:overall:1",
        criterionName: "Tone",
        value: 5,
        aiValue: 4,
      }),
    );
    const { result } = await mount([row(null, 1, null, 4), row(4, 1, null, 2)]);

    await act(async () => {
      await result.current.s.change(1, null, 5);
    });
    expect(saveReviewScore).toHaveBeenCalledWith({
      reviewId: 7,
      lessonId: null,
      criterionId: 1,
      value: 5,
    });
    expect(valueOf(result.current.s.scores, null, 1)).toBe(5);
    expect(valueOf(result.current.s.scores, 4, 1)).toBeNull();
  });

  it("undoes the Overall Score only", async () => {
    (unconfirmScores as jest.Mock).mockResolvedValue(ok([]));
    const { result } = await mount([row(null, 1, 4, 4), row(4, 1, 2, 2)]);

    await act(async () => {
      await result.current.s.undo(null);
    });
    expect(unconfirmScores).toHaveBeenCalledWith(7, null);
    expect(valueOf(result.current.s.scores, null, 1)).toBeNull();
    expect(valueOf(result.current.s.scores, 4, 1)).toBe(2);
  });
});

describe("failure messages", () => {
  const refused = (error: string, message?: string) => ({
    ok: false as const,
    error,
    data: null,
    message,
  });

  it("toasts the action's own message for a refusal", async () => {
    (acceptAiScores as jest.Mock).mockResolvedValue(
      refused("review_closed", "This review was already sent."),
    );
    const { result } = await mount();

    await act(async () => {
      await result.current.s.confirm(4);
    });
    expect(toast.error).toHaveBeenCalledWith("This review was already sent.");
  });

  it("uses the shared text for forbidden and the fixed text for a throw", async () => {
    (unconfirmScores as jest.Mock).mockResolvedValueOnce(refused("forbidden"));
    (saveReviewScore as jest.Mock).mockRejectedValueOnce(new Error("offline"));
    const { result } = await mount([row(4, 1, 2, 2)]);

    await act(async () => {
      await result.current.s.undo(4);
    });
    expect(toast.error).toHaveBeenLastCalledWith("You can't do this.");

    await act(async () => {
      await result.current.s.change(1, 4, 3);
    });
    expect(toast.error).toHaveBeenLastCalledWith(
      "Couldn't save the score. Try again.",
    );
  });
});

describe("new server props", () => {
  it("reset the scores, and a late answer changes nothing", async () => {
    let finish!: (v: unknown) => void;
    (acceptAiScores as jest.Mock).mockReturnValue(
      new Promise((r) => (finish = r)),
    );
    const { result, rerender } = await mount();
    let done!: Promise<void>;
    act(() => {
      done = result.current.s.confirm(4);
    });
    expect(valueOf(result.current.s.scores, 4, 1)).toBe(2);

    const next = [row(4, 1, null, 3)];
    rerender({ scores: next });
    expect(result.current.s.scores).toEqual(next);
    expect(result.current.s.pendingScope.size).toBe(0);

    await act(async () => {
      finish(fail("failed"));
      await done;
    });
    expect(result.current.s.scores).toEqual(next);
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("without a review provider", () => {
  it("rolls back and toasts", async () => {
    const rows = [row(4, 1, null, 2)];
    const { result } = renderHook(() => useReviewScores(rows));

    await act(async () => {
      await result.current.confirm(4);
    });
    expect(acceptAiScores).not.toHaveBeenCalled();
    expect(result.current.scores).toEqual(rows);
    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't confirm the scores. Try again.",
    );
  });
});
