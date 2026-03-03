import { render, screen } from "@testing-library/react";
import { UserPlaylistsGrid } from "@/components/dashboard/user-playlists-grid";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCachedUserDashboardFull,
  getCachedEnrollmentsFavorites,
  getCachedUserDueDates,
} from "@/lib/requests/cached";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUserDashboardFull: jest.fn(),
  getCachedEnrollmentsFavorites: jest.fn(),
  getCachedUserDueDates: jest.fn(),
}));

jest.mock("@/components/playlists/playlist-card", () => ({
  PlaylistCard: ({ playlist }: { playlist: any }) => (
    <div data-testid={`playlist-${playlist.id}`}>{playlist.name}</div>
  ),
}));

jest.mock("@/components/message", () => ({
  Message: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  MessageHeader: ({ title }: { title: string; subtitle: string }) => (
    <h2>{title}</h2>
  ),
  MessageDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

describe("UserPlaylistsGrid", () => {
  const mockUser = {
    email: "test@example.com",
  };

  const mockAuthorizedUser = {
    id: 1,
    email: "test@example.com",
    playlists: [],
    groups: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCachedUserDashboardFull as jest.Mock).mockResolvedValue(
      mockAuthorizedUser,
    );
    (getCachedEnrollmentsFavorites as jest.Mock).mockResolvedValue([]);
    (getCachedUserDueDates as jest.Mock).mockResolvedValue([]);
  });

  it("displays a message when no playlists are found", async () => {
    render(await UserPlaylistsGrid({}));

    expect(screen.getByText("No Saved Playlists")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You haven't saved any playlists yet. Browse the explore page to find playlists to save.",
      ),
    ).toBeInTheDocument();
  });

  it("renders custom playlists section when custom playlists exist", async () => {
    const mockPlaylists = [
      {
        id: 1,
        name: "Private Playlist",
        slug: "private-playlist",
        isPublic: false,
        duration: "short",
        droplets: [],
      },
    ];

    const mockUserWithPlaylists = {
      ...mockAuthorizedUser,
      playlists: mockPlaylists,
    };

    (getCachedUserDashboardFull as jest.Mock).mockResolvedValue(
      mockUserWithPlaylists,
    );

    render(await UserPlaylistsGrid({}));

    expect(screen.getByText("Private Playlists")).toBeInTheDocument();
    expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
  });

  it("renders public playlists section when public playlists exist", async () => {
    const mockPlaylists = [
      {
        id: 2,
        name: "Public Playlist",
        slug: "public-playlist",
        isPublic: true,
        duration: "medium",
        droplets: [],
      },
    ];

    const mockUserWithPlaylists = {
      ...mockAuthorizedUser,
      playlists: mockPlaylists,
    };

    (getCachedUserDashboardFull as jest.Mock).mockResolvedValue(
      mockUserWithPlaylists,
    );

    render(await UserPlaylistsGrid({}));

    expect(screen.getByText("Public Playlists")).toBeInTheDocument();
    expect(screen.getByTestId("playlist-2")).toBeInTheDocument();
  });

  it("calculates completion percentage for playlists", async () => {
    const mockPlaylists = [
      {
        id: 1,
        name: "Test Playlist",
        slug: "test-playlist",
        isPublic: true,
        duration: "short",
        droplets: [
          {
            id: 1,
            lessons: [{ id: 1 }, { id: 2 }],
          },
        ],
      },
    ];

    const mockUserWithPlaylists = {
      ...mockAuthorizedUser,
      playlists: mockPlaylists,
    };

    const mockEnrollments = [
      {
        viewedLessons: [{ id: 1 }],
      },
    ];

    (getCachedUserDashboardFull as jest.Mock).mockResolvedValue(
      mockUserWithPlaylists,
    );
    (getCachedEnrollmentsFavorites as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    render(await UserPlaylistsGrid({}));

    expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
  });

  it("returns null when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const result = await UserPlaylistsGrid({});
    expect(result).toBeNull();
  });

  describe("UserPlaylistsGrid", () => {
    const mockUser = {
      id: 1,
      email: "test@example.com",
    };

    const mockPlaylists = [
      {
        id: 1,
        name: "Public Playlist",
        isPublic: true,
        droplets: [{ lessons: [{ id: 1 }] }],
      },
      {
        id: 2,
        name: "Private Playlist",
        isPublic: false,
        droplets: [{ lessons: [{ id: 2 }] }],
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (getCachedUserDashboardFull as jest.Mock).mockResolvedValue({
        ...mockUser,
        playlists: mockPlaylists,
      });
      (getCachedEnrollmentsFavorites as jest.Mock).mockResolvedValue([]);
      (getCachedUserDueDates as jest.Mock).mockResolvedValue([]);
    });

    it("should render public and private playlists correctly", async () => {
      render(await UserPlaylistsGrid({}));

      expect(screen.getByText("Public Playlist")).toBeInTheDocument();
      expect(screen.getByText("Private Playlist")).toBeInTheDocument();
    });
  });
});
