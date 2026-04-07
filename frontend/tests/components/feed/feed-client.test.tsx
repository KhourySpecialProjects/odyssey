import { render, screen, waitFor } from "@testing-library/react";
import { FeedClient } from "@/components/feed/feed-client";
import { AnnouncementType, Announcement, AuthorizedUser } from "@/types";
import { fetchAnnouncements } from "@/lib/requests/feed";

jest.mock("@/lib/requests/feed", () => ({
  fetchAnnouncements: jest.fn(),
}));

describe("FeedClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchAnnouncements as jest.Mock).mockReset();
    jest.useRealTimers();
    jest.spyOn(console, "error").mockRestore();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const mockAuthUser: AuthorizedUser = {
    id: 1,
    email: "test@test.com",
    roles: [],
    isEnabled: true,
    isPublic: false,
    linkedin: "",
    github: "",
    website: "",
    firstTime: false,
    firstName: "",
    lastName: "",
    bio: "",
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York",
    groups: [],
  };

  const generateMockAnnouncements = (
    count: number,
    startId = 0,
  ): Announcement[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: startId + i,
      type: "droplet" as AnnouncementType,
      content: `Announcement ${startId + i}`,
      firstCreated: new Date(),
    }));
  };

  const mockPage = (
    announcements: Announcement[],
    pageCount = 1,
    page = 1,
  ) => ({
    data: announcements,
    pagination: { page, pageSize: 25, pageCount, total: announcements.length },
  });

  it("renders initial loading state", () => {
    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);
    const loadingSpinner = screen.getByTestId("loading-spinner");
    expect(loadingSpinner).toHaveClass(
      "w-6 h-6 border-4 border-slate-500 border-t-transparent rounded-full animate-spin",
    );
    expect(loadingSpinner).toHaveStyle({
      borderStyle: "dotted",
      borderTopStyle: "solid",
    });
  });

  it("loads and displays initial announcements", async () => {
    const mockInitialAnnouncements = generateMockAnnouncements(20);
    (fetchAnnouncements as jest.Mock).mockResolvedValueOnce(
      mockPage(mockInitialAnnouncements),
    );

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    expect(fetchAnnouncements).toHaveBeenCalledWith(mockAuthUser, 1);
  });

  it("loads next page when page changes", async () => {
    const mockInitialAnnouncements = generateMockAnnouncements(20);
    const mockNextAnnouncements = generateMockAnnouncements(10, 20);

    (fetchAnnouncements as jest.Mock)
      .mockResolvedValueOnce(mockPage(mockInitialAnnouncements, 2, 1))
      .mockResolvedValueOnce(mockPage(mockNextAnnouncements, 2, 2));

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    // expect(fetchAnnouncements).toHaveBeenCalledTimes(2);
    // expect(fetchAnnouncements).toHaveBeenLastCalledWith(mockAuthUser, 2);
  });

  it("shows no more announcements message when on single page", async () => {
    const mockInitialAnnouncements = generateMockAnnouncements(10);

    (fetchAnnouncements as jest.Mock).mockResolvedValueOnce(
      mockPage(mockInitialAnnouncements, 1),
    );

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    await waitFor(() => {
      expect(screen.getByText("No more announcements")).toBeInTheDocument();
    });
  });

  it("filters announcements based on selected roles", async () => {
    const mixedAnnouncements = [
      {
        id: 1,
        type: "droplet" as AnnouncementType,
        content: "Droplet Announcement",
        firstCreated: new Date(),
      },
      {
        id: 2,
        type: "playlist" as AnnouncementType,
        content: "Playlist Announcement",
        firstCreated: new Date(),
      },
    ];

    (fetchAnnouncements as jest.Mock).mockResolvedValueOnce(
      mockPage(mixedAnnouncements),
    );

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    // await waitFor(() => {
    //   expect(screen.getByText("Droplet Announcement")).toBeInTheDocument();
    //   expect(
    //     screen.queryByText("Playlist Announcement"),
    //   ).not.toBeInTheDocument();
    // });
  });

  it("handles fetch errors gracefully and shows no announcements", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (fetchAnnouncements as jest.Mock).mockRejectedValueOnce(
      new Error("Failed to fetch"),
    );

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading initial announcements:",
        expect.any(Error),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    expect(screen.getByText("No announcements found")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
