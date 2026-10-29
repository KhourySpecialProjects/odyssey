import { act, renderHook } from "@testing-library/react";
import { useDismissedFindings } from "@/hooks/use-dismissed-findings";

const stored = (id: number) =>
  JSON.parse(localStorage.getItem(`review-dismissed:${id}`) ?? "null");

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe("useDismissedFindings", () => {
  it("dismisses and undismisses, storing under the review's key", () => {
    const { result } = renderHook(() => useDismissedFindings(7));

    act(() => result.current.dismiss("8-1"));
    act(() => result.current.dismiss("8-2"));
    expect(result.current.dismissed.has("8-1")).toBe(true);
    expect(stored(7)).toEqual(["8-1", "8-2"]);

    act(() => result.current.undismiss("8-1"));
    expect(result.current.dismissed.has("8-1")).toBe(false);
    expect(stored(7)).toEqual(["8-2"]);
  });

  it("reads the stored dismissals back on remount", () => {
    localStorage.setItem("review-dismissed:7", JSON.stringify(["8-1", 3]));

    const { result } = renderHook(() => useDismissedFindings(7));

    expect([...result.current.dismissed]).toEqual(["8-1"]);
  });

  it("keeps each review's dismissals apart", () => {
    localStorage.setItem("review-dismissed:7", JSON.stringify(["8-1"]));

    const { result } = renderHook(() => useDismissedFindings(8));

    expect(result.current.dismissed.size).toBe(0);
  });

  it("merges in-memory dismissals into storage once a review id appears", () => {
    localStorage.setItem("review-dismissed:7", JSON.stringify(["old"]));
    const { result, rerender } = renderHook(
      ({ id }: { id: number | null }) => useDismissedFindings(id),
      { initialProps: { id: null as number | null } },
    );

    act(() => result.current.dismiss("8-1"));
    expect(localStorage.length).toBe(1);

    rerender({ id: 7 });

    expect([...result.current.dismissed].sort()).toEqual(["8-1", "old"]);
    expect(stored(7).sort()).toEqual(["8-1", "old"]);
  });

  it("doesn't crash when localStorage throws", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });

    const { result } = renderHook(() => useDismissedFindings(7));
    act(() => result.current.dismiss("8-1"));

    expect(result.current.dismissed.has("8-1")).toBe(true);
  });
});
