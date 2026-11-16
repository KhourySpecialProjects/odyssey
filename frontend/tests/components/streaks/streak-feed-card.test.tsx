import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  latestUnlock,
  useStreakFeedCard,
} from "@/components/streaks/streak-feed-card";
import { useFeedUnreadStore } from "@/stores/feed-unread-store";
import { useStreakStore } from "@/stores/streak-store";
import { makeStreak } from "@/testing/mocks/streakMock";

function Feed({ tab, shown }: { tab: "unread" | "read"; shown?: boolean }) {
  return <ul>{useStreakFeedCard(7, tab, shown)}</ul>;
}
const card = () => screen.queryByRole("listitem");

beforeEach(() => {
  localStorage.clear();
  useFeedUnreadStore.setState({ streakReadKey: undefined });
  useStreakStore.setState({
    streak: makeStreak({ current: 24, litToday: true }),
  });
});

it.each([
  [24, true, "Spilling Sack", "2026-11-10"],
  [23, false, "Tied Sack", "2026-11-08"],
])(
  "a %i-day streak (lit %s) last unlocked %s, on %s",
  (current, litToday, name, date) => {
    const unlock = latestUnlock(makeStreak({ current, litToday }));
    expect(unlock?.icon.name).toBe(name);
    expect(unlock?.date).toBe(date);
  },
);

it("has nothing to show without a streak", () => {
  expect(latestUnlock(makeStreak({ current: 0 }))).toBeNull();
});

describe("useStreakFeedCard", () => {
  it("shows the unlock on Unread, with what's next", () => {
    render(<Feed tab="unread" />);

    expect(
      screen.getByText(
        "You reached a 24-day streak and unlocked Spilling Sack!",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Next up: Two Sacks on day 26. Finish a lesson each day to keep it going.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("11/10/2026")).toBeInTheDocument();
  });

  it("moves to Read once marked, and stays there after a reload", async () => {
    const { unmount } = render(<Feed tab="unread" />);
    await userEvent.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(card()).not.toBeInTheDocument();
    unmount();

    render(<Feed tab="read" />);
    expect(card()).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Mark as unread" }),
    );
    expect(card()).not.toBeInTheDocument();
  });

  it("shows a new unlock as unread again", async () => {
    render(<Feed tab="unread" />);
    await userEvent.click(screen.getByRole("button", { name: "Mark as read" }));

    act(() =>
      useStreakStore.setState({
        streak: makeStreak({ current: 26, litToday: true }),
      }),
    );

    expect(screen.getByText(/unlocked Two Sacks!/)).toBeInTheDocument();
  });

  it("stays off later pages and off a broken streak", () => {
    const { rerender } = render(<Feed tab="unread" shown={false} />);
    expect(card()).not.toBeInTheDocument();

    act(() => useStreakStore.setState({ streak: makeStreak({ current: 0 }) }));
    rerender(<Feed tab="unread" />);
    expect(card()).not.toBeInTheDocument();
  });
});

it("shares the read marker, so marking it read in the feed updates the badge", async () => {
  render(<Feed tab="unread" />);
  await userEvent.click(screen.getByRole("button", { name: "Mark as read" }));
  expect(useFeedUnreadStore.getState().streakReadKey).toBe(
    latestUnlock(makeStreak({ current: 24, litToday: true }))?.key,
  );
});
