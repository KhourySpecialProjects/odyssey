import { ReactElement } from "react";
import FeedPage from "@/app/(general)/activity/page";
import { FeedCenterContent } from "@/components/feed/feed-center-content";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUserSocial } from "@/lib/requests/cached";
import { fetchAnnouncements } from "@/lib/requests/feed";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => "not-found"),
  redirect: jest.fn(),
}));

jest.mock("@/components/feed/feed-center-content", () => ({
  FeedCenterContent: jest.fn(() => null),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUserSocial: jest.fn(),
}));

jest.mock("@/lib/requests/feed", () => ({
  fetchAnnouncements: jest.fn(),
}));

const authUser = { id: 5, email: "a@b.edu", friendships: [] };
const feedPage = {
  data: [{ id: 1, type: "droplet", content: "x", firstCreated: new Date() }],
  pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
};

type Props = Record<string, unknown>;

/** Renders the page, then the streamed child inside its <Suspense>. */
async function renderPage(search: Record<string, string | string[]> = {}) {
  const page = (await FeedPage({
    searchParams: Promise.resolve(search),
  })) as ReactElement<{
    fallback: ReactElement<Props>;
    children: ReactElement;
  }>;
  const seeded = page.props.children as ReactElement<Props>;
  const streamed = (await (
    seeded.type as (props: Props) => Promise<ReactElement<Props>>
  )(seeded.props)) as ReactElement<Props>;
  return { page, streamed };
}

describe("Activity feed page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getCurrentUser).mockResolvedValue({
      id: 5,
      email: "a@b.edu",
    } as never);
    jest.mocked(getCachedUserSocial).mockResolvedValue(authUser as never);
    jest.mocked(fetchAnnouncements).mockResolvedValue(feedPage as never);
  });

  it("server-renders page 1 of the unread feed as initial data", async () => {
    const { page, streamed } = await renderPage();

    // Identity is resolved inside the action; no user is passed
    expect(fetchAnnouncements).toHaveBeenCalledTimes(1);
    expect(fetchAnnouncements).toHaveBeenCalledWith(
      1,
      ["droplet", "playlist", "group", "system", "friend", "kudos"],
      { archived: false },
    );
    expect(streamed.type).toBe(FeedCenterContent);
    expect(streamed.props).toEqual({
      authUser,
      initialFeed: {
        roles: ["droplet", "playlist", "group", "system", "friend", "kudos"],
        page: feedPage,
      },
    });
    // The shell streams first without fetching client-side
    expect(page.props.fallback.type).toBe(FeedCenterContent);
    expect(page.props.fallback.props).toEqual({ authUser, pending: true });
  });

  it("fetches for the URL's filters", async () => {
    const { streamed } = await renderPage({ filters: "friend.kudos" });

    expect(fetchAnnouncements).toHaveBeenCalledWith(1, ["friend", "kudos"], {
      archived: false,
    });
    expect((streamed.props.initialFeed as { roles: string[] }).roles).toEqual([
      "friend",
      "kudos",
    ]);
  });

  it("starts the feed fetch before the social graph resolves", async () => {
    jest
      .mocked(getCachedUserSocial)
      .mockReturnValue(new Promise(() => {}) as never);

    void FeedPage({ searchParams: Promise.resolve({}) });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getCachedUserSocial).toHaveBeenCalled();
    expect(fetchAnnouncements).toHaveBeenCalledTimes(1);
  });

  it("skips the fetch when every filter is off", async () => {
    const { streamed } = await renderPage({ filters: "" });

    expect(fetchAnnouncements).not.toHaveBeenCalled();
    expect(streamed.props.initialFeed).toBeUndefined();
  });

  it("leaves the fetch to the client when the server fetch fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    jest.mocked(fetchAnnouncements).mockRejectedValue(new Error("boom"));

    const { streamed } = await renderPage();

    expect(streamed.props.initialFeed).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error prefetching feed:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("returns notFound without a signed-in user", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(undefined);

    const result = await FeedPage({ searchParams: Promise.resolve({}) });

    expect(result).toBe("not-found");
    expect(fetchAnnouncements).not.toHaveBeenCalled();
  });
});
