import { useFeedUnreadStore } from "@/stores/feed-unread-store";

beforeEach(() =>
  useFeedUnreadStore.setState({ serverCount: 4, feedCount: null }),
);

it("adjusts from the layout's count until the feed owns one, unclamped so rollbacks are exact", () => {
  const { adjustFeedCount } = useFeedUnreadStore.getState();
  adjustFeedCount(-1);
  expect(useFeedUnreadStore.getState().feedCount).toBe(3);
  adjustFeedCount(-4);
  adjustFeedCount(1);
  expect(useFeedUnreadStore.getState().feedCount).toBe(0);
});
