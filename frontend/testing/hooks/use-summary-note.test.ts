import { act, renderHook } from "@testing-library/react";
import { useSummaryNote } from "@/hooks/use-summary-note";

beforeEach(() => localStorage.clear());

describe("useSummaryNote", () => {
  it("restores a stored note for the review", () => {
    localStorage.setItem("review-note:70", "Saved");

    const { result } = renderHook(() => useSummaryNote(70));

    expect(result.current.note).toBe("Saved");
  });

  it("stores edits and removes an emptied note", () => {
    const { result } = renderHook(() => useSummaryNote(70));

    act(() => result.current.setNote("Hello"));
    expect(localStorage.getItem("review-note:70")).toBe("Hello");

    act(() => result.current.setNote(""));
    expect(localStorage.getItem("review-note:70")).toBeNull();
  });

  it("keeps a note typed before the review opens, and stores it", () => {
    const { result, rerender } = renderHook(({ id }) => useSummaryNote(id), {
      initialProps: { id: null as number | null },
    });

    act(() => result.current.setNote("Typed early"));
    expect(result.current.note).toBe("Typed early");

    rerender({ id: 70 });

    expect(result.current.note).toBe("Typed early");
    expect(localStorage.getItem("review-note:70")).toBe("Typed early");
  });

  it("prefers a stored note over one typed early", () => {
    localStorage.setItem("review-note:70", "Stored");
    const { result, rerender } = renderHook(({ id }) => useSummaryNote(id), {
      initialProps: { id: null as number | null },
    });

    act(() => result.current.setNote("Typed early"));
    rerender({ id: 70 });

    expect(result.current.note).toBe("Stored");
  });

  it("starts empty for another review", () => {
    localStorage.setItem("review-note:70", "Saved");
    const { result, rerender } = renderHook(({ id }) => useSummaryNote(id), {
      initialProps: { id: 70 as number | null },
    });
    expect(result.current.note).toBe("Saved");

    rerender({ id: 71 });

    expect(result.current.note).toBe("");
  });
});
