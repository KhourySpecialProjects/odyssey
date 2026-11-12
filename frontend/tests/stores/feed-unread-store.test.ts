import { useFeedUnreadStore } from "@/stores/feed-unread-store";

beforeEach(() =>
  useFeedUnreadStore.setState({ serverCount: 4, feedCount: null }),
);

it("adjusts from the layout's count until the feed owns one, never below 0", () => {
  const { adjustFeedCount } = useFeedUnreadStore.getState();
  adjustFeedCount(-1);
  expect(useFeedUnreadStore.getState().feedCount).toBe(3);
  adjustFeedCount(-9);
  expect(useFeedUnreadStore.getState().feedCount).toBe(0);
});
