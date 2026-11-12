import { render, screen } from "@testing-library/react";
import { FeedLeftNav } from "@/components/feed/feed-left-nav";
import { latestUnlock } from "@/components/streaks/streak-feed-card";
import { useFeedUnreadStore } from "@/stores/feed-unread-store";
import { useStreakStore } from "@/stores/streak-store";
import { makeStreak } from "@/testing/mocks/streakMock";

let mockPath = "/activity";
jest.mock("next/navigation", () => ({ usePathname: () => mockPath }));

beforeEach(() => {
  mockPath = "/activity";
  localStorage.clear();
  useFeedUnreadStore.setState({
    serverCount: null,
    feedCount: null,
    streakReadKey: undefined,
  });
  useStreakStore.setState({ streak: null });
});

const feedLink = () => screen.getByRole("link", { name: /^My Feed/ });

it.each([
  [0, /^My Feed$/],
  [7, /^My Feed ?, 7 unread$/],
  [250, /^My Feed ?, 250 unread$/],
])("names the link with a count of %i", (count, name) => {
  render(<FeedLeftNav userId={7} unreadCount={count} />);
  expect(screen.getByRole("link", { name })).toBeInTheDocument();
});

it("shows 99+ and only on the My Feed row", () => {
  render(<FeedLeftNav userId={7} unreadCount={250} />);
  expect(feedLink()).toHaveTextContent("99+");
  expect(screen.getByRole("link", { name: "My Droplets" })).toHaveTextContent(
    /^My Droplets$/,
  );
});

it("prefers the feed's count, and adds the streak card while it's unread", () => {
  useFeedUnreadStore.setState({ feedCount: 2 });
  const streak = makeStreak({ current: 24, litToday: true });
  useStreakStore.setState({ streak });
  const { unmount } = render(<FeedLeftNav userId={7} unreadCount={9} />);
  expect(feedLink()).toHaveTextContent("3");
  unmount();

  // Read in the feed (same key the card saves): back to the feed's count
  localStorage.setItem("streak-card-read:7", latestUnlock(streak)!.key);
  render(<FeedLeftNav userId={7} unreadCount={9} />);
  expect(feedLink()).toHaveTextContent("2");
});

it("shows the layout's fresh count, not a stale store value", () => {
  useFeedUnreadStore.setState({ serverCount: 4 });
  render(<FeedLeftNav userId={7} unreadCount={7} />);
  expect(feedLink()).toHaveTextContent("7");
});
