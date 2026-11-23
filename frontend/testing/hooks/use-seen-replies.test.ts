import { act, renderHook } from "@testing-library/react";
import { useSeenReplies } from "@/hooks/use-seen-replies";

const KEY = "review-seen-replies-3";

beforeEach(() => localStorage.clear());

describe("useSeenReplies", () => {
  it("persists across a remount", () => {
    const first = renderHook(() => useSeenReplies(3));
    act(() => first.result.current.markSeen([5, 6]));
    first.unmount();

    const second = renderHook(() => useSeenReplies(3));
    expect([...second.result.current.seen]).toEqual([5, 6]);
  });

  it.each(["not json", '{"a":1}', '["x",null]'])(
    "treats %s as empty",
    (bad) => {
      localStorage.setItem(KEY, bad);
      const { result } = renderHook(() => useSeenReplies(3));
      expect(result.current.seen.size).toBe(0);
    },
  );

  it("ignores temp ids and keeps only the newest 2000", () => {
    const { result } = renderHook(() => useSeenReplies(3));
    const ids = Array.from({ length: 2005 }, (_, i) => i + 1);
    act(() => result.current.markSeen([-1, ...ids]));
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    expect(stored).toHaveLength(2000);
    expect(stored[0]).toBe(6);
    expect(result.current.seen.has(-1)).toBe(false);
  });

  it("keeps working when storage throws", () => {
    const spy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    const { result } = renderHook(() => useSeenReplies(3));
    act(() => result.current.markSeen([5]));
    expect(result.current.seen.has(5)).toBe(true);
    spy.mockRestore();
  });

  it("keeps the same set when an event adds nothing", () => {
    const a = renderHook(() => useSeenReplies(3));
    act(() => a.result.current.markSeen([9]));
    const before = a.result.current.seen;
    act(() => {
      window.dispatchEvent(
        new CustomEvent("review-seen-replies-changed", { detail: 3 }),
      );
    });
    expect(a.result.current.seen).toBe(before);
  });

  it("shares a mark with another instance of the droplet", () => {
    const a = renderHook(() => useSeenReplies(3));
    const b = renderHook(() => useSeenReplies(3));
    act(() => a.result.current.markSeen([9]));
    expect(b.result.current.seen.has(9)).toBe(true);
  });
});
