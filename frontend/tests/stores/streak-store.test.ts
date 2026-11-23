import { useStreakStore } from "@/stores/streak-store";
import { makeStreak } from "@/testing/mocks/streakMock";

beforeEach(() => useStreakStore.setState({ streak: null }));

describe("useStreakStore", () => {
  it("ignores an equal streak, so a re-render's copy notifies no one", () => {
    const listener = jest.fn();
    useStreakStore.getState().setStreak(makeStreak());
    const unsubscribe = useStreakStore.subscribe(listener);

    useStreakStore.getState().setStreak(makeStreak());
    expect(listener).not.toHaveBeenCalled();

    useStreakStore.getState().setStreak(makeStreak({ litToday: true }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(useStreakStore.getState().streak?.litToday).toBe(true);
    unsubscribe();
  });
});
