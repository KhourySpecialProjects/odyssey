import { act, renderHook } from "@testing-library/react";
import {
  useViewedLessonIds,
  useViewedLessonsStore,
} from "@/stores/viewed-lessons-store";

describe("viewed-lessons-store", () => {
  beforeEach(() => {
    useViewedLessonsStore.setState({ pendingViewed: {} });
  });

  it("keeps pending ids per enrollment", () => {
    act(() => useViewedLessonsStore.getState().markViewed("1", 10));

    const a = renderHook(() => useViewedLessonIds("1", [])).result.current;
    const b = renderHook(() => useViewedLessonIds("2", [])).result.current;

    expect(a).toEqual([10]);
    expect(b).toEqual([]);
  });

  it("unmark removes only that enrollment's id", () => {
    const { markViewed, unmarkViewed } = useViewedLessonsStore.getState();
    act(() => {
      markViewed("1", 10);
      markViewed("2", 10);
      unmarkViewed("1", 10);
    });

    expect(useViewedLessonsStore.getState().pendingViewed["1"]).toEqual([]);
    expect(useViewedLessonsStore.getState().pendingViewed["2"]).toEqual([10]);
  });

  it("does not duplicate an id marked twice", () => {
    act(() => {
      useViewedLessonsStore.getState().markViewed("1", 10);
      useViewedLessonsStore.getState().markViewed("1", 10);
    });
    expect(useViewedLessonsStore.getState().pendingViewed["1"]).toEqual([10]);
  });

  it("merges server and pending ids without duplicates", () => {
    act(() => useViewedLessonsStore.getState().markViewed("1", 2));
    const { result } = renderHook(() => useViewedLessonIds("1", [1, 2]));
    expect(result.current).toEqual([1, 2]);
  });

  it("returns only server ids when there is no enrollment", () => {
    act(() => useViewedLessonsStore.getState().markViewed("1", 2));
    const { result } = renderHook(() => useViewedLessonIds(undefined, [1]));
    expect(result.current).toEqual([1]);
  });

  it("returns a referentially stable array when nothing changes", () => {
    const serverIds = [1];
    act(() => useViewedLessonsStore.getState().markViewed("1", 2));
    const { result, rerender } = renderHook(() =>
      useViewedLessonIds("1", serverIds),
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);

    // Another enrollment's change doesn't produce a new array
    act(() => useViewedLessonsStore.getState().markViewed("2", 5));
    expect(result.current).toBe(first);
  });
});
