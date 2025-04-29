import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import { FeedClient } from "@/components/feed/feed-client";
import { AnnouncementType, Announcement, AuthorizedUser } from "@/types";
import { fetchAnnouncements } from "@/lib/requests/feed";

jest.mock("@/lib/requests/feed", () => ({
  fetchAnnouncements: jest.fn(),
}));

describe("FeedClient", () => {
  const mockIntersectionObserver = jest.fn();
  let intersectionObserverCallback: (
    entries: { isIntersecting: boolean }[],
  ) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    (fetchAnnouncements as jest.Mock).mockReset();

    mockIntersectionObserver.mockReset();
    mockIntersectionObserver.mockImplementation((callback) => {
      intersectionObserverCallback = callback;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });
    window.IntersectionObserver = mockIntersectionObserver;
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
    linkedin: "",
    github: "",
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
      mockInitialAnnouncements,
    );

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    await waitFor(() => {
      expect(screen.getByText("Announcement 0")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Announcement/)).toHaveLength(20);
    expect(fetchAnnouncements).toHaveBeenCalledWith(mockAuthUser, 1);
  });

  it("loads more announcements when scrolling to bottom", async () => {
    const mockInitialAnnouncements = generateMockAnnouncements(20);
    const mockNextAnnouncements = generateMockAnnouncements(10, 20);

    (fetchAnnouncements as jest.Mock)
      .mockResolvedValueOnce(mockInitialAnnouncements)
      .mockResolvedValueOnce(mockNextAnnouncements);

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    await waitFor(() => {
      expect(screen.getByText("Announcement 0")).toBeInTheDocument();
    });

    act(() => {
      intersectionObserverCallback([{ isIntersecting: true }]);
    });

    await waitFor(() => {
      expect(screen.getByText("Announcement 20")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Announcement/)).toHaveLength(30);
    expect(fetchAnnouncements).toHaveBeenCalledTimes(2);
    expect(fetchAnnouncements).toHaveBeenLastCalledWith(mockAuthUser, 2);
  });

  it("shows no more announcements message when all are loaded", async () => {
    const mockInitialAnnouncements = generateMockAnnouncements(10);
    const mockEmptyNextPage: Announcement[] = [];

    (fetchAnnouncements as jest.Mock)
      .mockResolvedValueOnce(mockInitialAnnouncements)
      .mockResolvedValueOnce(mockEmptyNextPage);

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    await waitFor(() => {
      expect(screen.getByText("Announcement 0")).toBeInTheDocument();
    });

    act(() => {
      intersectionObserverCallback([{ isIntersecting: true }]);
    });

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

    (fetchAnnouncements as jest.Mock).mockResolvedValueOnce(mixedAnnouncements);

    render(<FeedClient selectedRoles={["droplet"]} authUser={mockAuthUser} />);

    await waitFor(() => {
      expect(screen.getByText("Droplet Announcement")).toBeInTheDocument();
      expect(
        screen.queryByText("Playlist Announcement"),
      ).not.toBeInTheDocument();
    });
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
