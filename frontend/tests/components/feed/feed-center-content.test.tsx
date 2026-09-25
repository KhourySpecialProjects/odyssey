import { fireEvent, render, screen } from "@testing-library/react";
import { FeedCenterContent } from "@/components/feed/feed-center-content";
import { FeedClient } from "@/components/feed/feed-client";
import { AuthorizedUser } from "@/types";

let mockSearch = "";

jest.mock("next/navigation", () => ({
  usePathname: () => "/activity",
  // A fresh object every render, like after a router refresh
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

jest.mock("@/components/feed/feed-client", () => ({
  FeedClient: jest.fn(() => null),
}));

const mockFeedClient = FeedClient as unknown as jest.Mock;
const lastFeedClientProps = () => mockFeedClient.mock.lastCall?.[0];

const authUser = { id: 1, email: "a@b.edu" } as AuthorizedUser;

describe("FeedCenterContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = "";
  });

  it("passes every role when the URL has no filters", () => {
    render(<FeedCenterContent authUser={authUser} />);

    expect(lastFeedClientProps().selectedRoles).toEqual([
      "droplet",
      "playlist",
      "group",
      "system",
      "friend",
      "kudos",
    ]);
  });

  it("maps URL filters to feed roles and keeps the array stable across re-renders", () => {
    mockSearch = "filters=droplet.friend";
    const { rerender } = render(<FeedCenterContent authUser={authUser} />);
    const first = lastFeedClientProps().selectedRoles;

    rerender(<FeedCenterContent authUser={{ ...authUser }} />);

    expect(first).toEqual(["droplet", "friend"]);
    expect(lastFeedClientProps().selectedRoles).toBe(first);
  });

  it("passes the initial feed and pending state through", () => {
    const initialFeed = {
      roles: ["droplet" as const],
      page: {
        data: [],
        pagination: { page: 1, pageSize: 25, pageCount: 1, total: 0 },
      },
    };
    const { rerender } = render(
      <FeedCenterContent authUser={authUser} initialFeed={initialFeed} />,
    );
    expect(lastFeedClientProps().initialFeed).toBe(initialFeed);

    rerender(<FeedCenterContent authUser={authUser} pending />);
    expect(lastFeedClientProps().pending).toBe(true);
  });

  it("updates the URL in place when a filter is toggled", () => {
    const replaceState = jest.spyOn(window.history, "replaceState");
    mockSearch = "filters=droplet";
    render(<FeedCenterContent authUser={authUser} />);

    fireEvent.click(screen.getByRole("button", { name: "Friend" }));
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/activity?filters=droplet.friend",
    );

    fireEvent.click(screen.getByRole("button", { name: "Droplet" }));
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/activity?filters=",
    );
    replaceState.mockRestore();
  });

  it("drops the filters param when every role is selected", () => {
    const replaceState = jest.spyOn(window.history, "replaceState");
    mockSearch = "filters=droplet.playlist.group.system.friend";
    render(<FeedCenterContent authUser={authUser} />);

    fireEvent.click(screen.getByRole("button", { name: "Kudos" }));

    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/activity");
    replaceState.mockRestore();
  });
});
