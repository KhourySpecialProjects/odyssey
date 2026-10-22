import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { FeedClient } from "@/components/feed/feed-client";
import { AnnouncementType, Announcement, AuthorizedUser } from "@/types";
import { fetchAnnouncements, markAnnouncementRead } from "@/lib/requests/feed";
import { toast } from "sonner";

jest.mock("@/lib/requests/feed", () => ({
  fetchAnnouncements: jest.fn(),
  markAnnouncementRead: jest.fn(),
  markAnnouncementUnread: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

describe("FeedClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchAnnouncements as jest.Mock).mockReset();
    (fetchAnnouncements as jest.Mock).mockResolvedValue(mockPage([]));
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

    // No user is sent: the action resolves the viewer from the session
    expect(fetchAnnouncements).toHaveBeenCalledWith(1, ["droplet"], {
      archived: false,
    });
    expect(await screen.findByText("Announcement 0")).toBeInTheDocument();
  });

  it("loads next page when page changes", async () => {
    const mockInitialAnnouncements = generateMockAnnouncements(20);
    const mockNextAnnouncements = generateMockAnnouncements(10, 20);

    (fetchAnnouncements as jest.Mock)
      .mockResolvedValueOnce(mockPage(mockInitialAnnouncements, 2, 1))
      .mockResolvedValueOnce(mockPage(mockNextAnnouncements, 2, 2));

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    fireEvent.click(await screen.findByText("Next ›"));

    expect(await screen.findByText("Announcement 20")).toBeInTheDocument();
    expect(fetchAnnouncements).toHaveBeenCalledTimes(2);
    expect(fetchAnnouncements).toHaveBeenLastCalledWith(2, ["droplet"], {
      archived: false,
    });
  });

  it("does not show pagination when on a single page", async () => {
    const mockInitialAnnouncements = generateMockAnnouncements(10);

    (fetchAnnouncements as jest.Mock).mockResolvedValueOnce(
      mockPage(mockInitialAnnouncements, 1),
    );

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    await waitFor(() => {
      expect(screen.queryByText(/prev/i)).not.toBeInTheDocument();
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

    expect(screen.getByText("No unread announcements")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  describe("with server-rendered initial data", () => {
    const initialFeed = (roles: AnnouncementType[] = ["droplet"]) => ({
      roles,
      page: mockPage(generateMockAnnouncements(25), 3),
    });

    it("renders the initial page without fetching on mount", async () => {
      render(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );

      expect(screen.getByText("Announcement 0")).toBeInTheDocument();
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
      await act(async () => {});
      expect(fetchAnnouncements).not.toHaveBeenCalled();
    });

    it("fetches when the initial data was for different filters", async () => {
      (fetchAnnouncements as jest.Mock).mockResolvedValueOnce(mockPage([]));

      render(
        <FeedClient
          selectedRoles={["droplet", "friend"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed(["droplet"])}
        />,
      );

      await waitFor(() =>
        expect(fetchAnnouncements).toHaveBeenCalledWith(
          1,
          ["droplet", "friend"],
          { archived: false },
        ),
      );
    });

    it("does not refetch on re-render with an equal roles array or new authUser", async () => {
      const { rerender } = render(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );

      rerender(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={{ ...mockAuthUser }}
          initialFeed={initialFeed()}
        />,
      );
      await act(async () => {});

      expect(fetchAnnouncements).not.toHaveBeenCalled();
      expect(screen.getByText("Announcement 0")).toBeInTheDocument();
    });

    it("fetches the next page on pagination", async () => {
      (fetchAnnouncements as jest.Mock).mockResolvedValueOnce(
        mockPage(generateMockAnnouncements(25, 25), 3, 2),
      );
      render(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );

      fireEvent.click(screen.getByText("Next ›"));

      expect(await screen.findByText("Announcement 25")).toBeInTheDocument();
      expect(fetchAnnouncements).toHaveBeenCalledTimes(1);
      expect(fetchAnnouncements).toHaveBeenCalledWith(2, ["droplet"], {
        archived: false,
      });
    });

    it("fetches page 1 of the Read tab when switching tabs", async () => {
      (fetchAnnouncements as jest.Mock)
        .mockResolvedValueOnce(mockPage(generateMockAnnouncements(25, 25), 3))
        .mockResolvedValueOnce(mockPage(generateMockAnnouncements(2, 100)));
      render(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );
      fireEvent.click(screen.getByText("Next ›"));
      await screen.findByText("Announcement 25");

      fireEvent.click(screen.getByRole("button", { name: "Read" }));

      expect(await screen.findByText("Announcement 100")).toBeInTheDocument();
      // One fetch for the tab change (page reset to 1), not one per state change
      expect(fetchAnnouncements).toHaveBeenCalledTimes(2);
      expect(fetchAnnouncements).toHaveBeenLastCalledWith(1, ["droplet"], {
        archived: true,
      });
      expect(
        screen.getAllByRole("button", { name: "Mark as unread" }),
      ).toHaveLength(2);
    });

    it("fetches page 1 once when the role filter changes", async () => {
      (fetchAnnouncements as jest.Mock)
        .mockResolvedValueOnce(mockPage(generateMockAnnouncements(25, 25), 3))
        .mockResolvedValueOnce(mockPage(generateMockAnnouncements(1, 200)));
      const { rerender } = render(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );
      fireEvent.click(screen.getByText("Next ›"));
      await screen.findByText("Announcement 25");

      rerender(
        <FeedClient
          selectedRoles={["droplet", "kudos"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );

      expect(await screen.findByText("Announcement 200")).toBeInTheDocument();
      expect(fetchAnnouncements).toHaveBeenCalledTimes(2);
      expect(fetchAnnouncements).toHaveBeenLastCalledWith(
        1,
        ["droplet", "kudos"],
        { archived: false },
      );
    });

    it("shows the empty state without fetching when no roles are selected", async () => {
      render(<FeedClient selectedRoles={[]} authUser={mockAuthUser} />);

      expect(screen.getByText("No unread announcements")).toBeInTheDocument();
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      await act(async () => {});
      expect(fetchAnnouncements).not.toHaveBeenCalled();
    });

    it("mark read removes the item right away and quietly re-syncs the page", async () => {
      (markAnnouncementRead as jest.Mock).mockResolvedValueOnce({
        success: true,
      });
      let resolveRefresh: (value: unknown) => void = () => {};
      (fetchAnnouncements as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
      );
      render(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );

      fireEvent.click(
        screen.getAllByRole("button", { name: "Mark as read" })[0],
      );

      expect(screen.queryByText("Announcement 0")).not.toBeInTheDocument();
      await waitFor(() => expect(markAnnouncementRead).toHaveBeenCalledWith(0));
      await waitFor(() =>
        expect(fetchAnnouncements).toHaveBeenCalledWith(1, ["droplet"], {
          archived: false,
        }),
      );
      // Background refresh: the remaining list stays up, no spinner
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      expect(screen.getByText("Announcement 1")).toBeInTheDocument();

      // The next page's first item moves up into this page
      await act(async () => {
        resolveRefresh(
          mockPage(
            [
              ...generateMockAnnouncements(24, 1),
              ...generateMockAnnouncements(1, 25),
            ],
            2,
          ),
        );
      });
      expect(screen.getByText("Announcement 25")).toBeInTheDocument();
      expect(screen.getByText("1 of 2")).toBeInTheDocument();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("drops a refresh that started before a later mark read", async () => {
      (markAnnouncementRead as jest.Mock).mockResolvedValue({ success: true });
      let resolveFirst: (value: unknown) => void = () => {};
      (fetchAnnouncements as jest.Mock)
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
        )
        .mockResolvedValueOnce(mockPage(generateMockAnnouncements(23, 2), 1));
      render(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );

      fireEvent.click(
        screen.getAllByRole("button", { name: "Mark as read" })[0],
      );
      await waitFor(() => expect(fetchAnnouncements).toHaveBeenCalledTimes(1));
      // Second mark while the first refresh is still in flight
      fireEvent.click(
        screen.getAllByRole("button", { name: "Mark as read" })[0],
      );
      await act(async () => {
        // Stale: still contains item 1
        resolveFirst(mockPage(generateMockAnnouncements(24, 1), 1));
      });
      expect(screen.queryByText("Announcement 1")).not.toBeInTheDocument();

      await waitFor(() => expect(fetchAnnouncements).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("Announcement 24")).toBeInTheDocument();
      expect(screen.queryByText("Announcement 1")).not.toBeInTheDocument();
    });

    it("restores the list with a spinner refetch when mark read fails", async () => {
      (markAnnouncementRead as jest.Mock).mockResolvedValueOnce({
        success: false,
      });
      let resolveRefetch: (value: unknown) => void = () => {};
      (fetchAnnouncements as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRefetch = resolve;
        }),
      );
      render(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );

      fireEvent.click(
        screen.getAllByRole("button", { name: "Mark as read" })[0],
      );

      expect(await screen.findByTestId("loading-spinner")).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith("Failed to mark as read");
      expect(fetchAnnouncements).toHaveBeenCalledWith(1, ["droplet"], {
        archived: false,
      });
      await act(async () => {
        resolveRefetch(mockPage(generateMockAnnouncements(25), 3));
      });
      expect(screen.getByText("Announcement 0")).toBeInTheDocument();
    });

    it("moves back a page when a refresh finds the current page emptied", async () => {
      (markAnnouncementRead as jest.Mock).mockResolvedValueOnce({
        success: true,
      });
      (fetchAnnouncements as jest.Mock)
        .mockResolvedValueOnce(
          mockPage(generateMockAnnouncements(25, 25), 3, 2),
        )
        .mockResolvedValueOnce(mockPage(generateMockAnnouncements(1, 50), 3, 3))
        // Refresh after marking the only item on page 3 read
        .mockResolvedValueOnce(mockPage([], 2, 3))
        .mockResolvedValueOnce(
          mockPage(generateMockAnnouncements(25, 25), 2, 2),
        );
      render(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );
      fireEvent.click(screen.getByText("Next ›"));
      await screen.findByText("Announcement 25");
      fireEvent.click(screen.getByText("Next ›"));
      await screen.findByText("Announcement 50");

      fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));

      expect(await screen.findByText("2 of 2")).toBeInTheDocument();
      expect(await screen.findByText("Announcement 25")).toBeInTheDocument();
      expect(fetchAnnouncements).toHaveBeenCalledTimes(4);
      expect(fetchAnnouncements).toHaveBeenLastCalledWith(2, ["droplet"], {
        archived: false,
      });
    });

    it("quietly refetches when the friend list changes", async () => {
      (fetchAnnouncements as jest.Mock).mockResolvedValueOnce(
        mockPage(generateMockAnnouncements(3, 300)),
      );
      const { rerender } = render(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={mockAuthUser}
          initialFeed={initialFeed()}
        />,
      );

      rerender(
        <FeedClient
          selectedRoles={["droplet"]}
          authUser={{
            ...mockAuthUser,
            friendships: [
              {
                authorized_users: [mockAuthUser, { ...mockAuthUser, id: 2 }],
              },
            ],
          }}
          initialFeed={initialFeed()}
        />,
      );

      expect(await screen.findByText("Announcement 300")).toBeInTheDocument();
      expect(fetchAnnouncements).toHaveBeenCalledTimes(1);
    });
  });

  it("does not fetch while pending (Suspense fallback)", async () => {
    render(
      <FeedClient
        selectedRoles={["droplet"]}
        authUser={mockAuthUser}
        pending
      />,
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    await act(async () => {});
    expect(fetchAnnouncements).not.toHaveBeenCalled();
  });
});
