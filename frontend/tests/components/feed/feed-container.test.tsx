import { render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { FeedContainer } from "@/components/feed/feed-container";
import { FeedSectionTabs } from "@/components/feed/feed-left-nav";
import { makeAuthorizedUser } from "@/lib/testing/mock-helpers";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

// Uses Server Actions; not what these tests are about
jest.mock("@/components/friends/friend-request-feed-block", () => ({
  FriendRequestFeedBlock: () => <div data-testid="friend-request" />,
}));

describe("FeedContainer layout", () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/activity/droplets");
  });

  it("shows the side nav from lg and the friends column from xl", () => {
    render(
      <FeedContainer authUser={makeAuthorizedUser()}>
        <p>content</p>
      </FeedContainer>,
    );

    const sideNav = screen.getByRole("navigation", {
      name: "Content navigation",
    });
    expect(sideNav).toHaveClass("hidden", "lg:block");
    expect(sideNav).not.toHaveClass("md:block");
    expect(sideNav.nextElementSibling).toHaveClass("lg:ml-[260px]");
    expect(sideNav.nextElementSibling).not.toHaveClass("md:ml-[260px]");

    const friendsColumn = screen
      .getByRole("heading", { name: "Friends" })
      .closest(".shrink-0");
    expect(friendsColumn).toHaveClass("hidden", "xl:flex");
    expect(friendsColumn).not.toHaveClass("md:flex");
  });

  it("gives the side nav a Friends link, hidden once the friends column shows", () => {
    render(
      <FeedContainer
        authUser={makeAuthorizedUser({
          received_requests: [makeAuthorizedUser({ id: 2 })],
        })}
      >
        <p>content</p>
      </FeedContainer>,
    );

    const sideNav = screen.getByRole("navigation", {
      name: "Content navigation",
    });
    const friendsLink = within(sideNav).getByRole("link", {
      name: /friends/i,
    });
    expect(friendsLink).toHaveAttribute(
      "href",
      "/settings/friends?tab=recieved_requests",
    );
    expect(friendsLink).toHaveAccessibleName("Friends 1 pending request");
    expect(friendsLink.closest("li")).toHaveClass("xl:hidden");
  });
});

describe("FeedSectionTabs", () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/activity/archived");
  });

  it("lists every Activity section plus Friends, marking the current one", () => {
    render(<FeedSectionTabs pendingRequestCount={0} className="lg:hidden" />);

    const nav = screen.getByRole("navigation", { name: "Activity sections" });
    expect(nav).toHaveClass("lg:hidden");
    expect(
      within(nav)
        .getAllByRole("link")
        .map((l) => l.getAttribute("href")),
    ).toEqual([
      "/activity",
      "/activity/droplets",
      "/activity/playlists",
      "/activity/voyages",
      "/activity/favorited",
      "/activity/archived",
      "/settings/friends",
    ]);
    expect(screen.getByRole("link", { name: "Archived" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("points Friends at pending requests and shows their count", () => {
    render(<FeedSectionTabs pendingRequestCount={3} />);

    expect(
      screen.getByRole("link", { name: "Friends 3 pending requests" }),
    ).toHaveAttribute("href", "/settings/friends?tab=recieved_requests");
  });
});
