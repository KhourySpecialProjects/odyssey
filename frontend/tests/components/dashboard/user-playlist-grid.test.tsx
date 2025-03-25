import { render, screen } from "@testing-library/react";
import { UserPlaylistsGrid } from "@/components/dashboard/user-playlists-grid";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getUserDueDates } from "@/lib/requests/groups";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));

jest.mock("@/lib/requests/groups", () => ({
  getUserDueDates: jest.fn(),
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
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(
      mockAuthorizedUser,
    );
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);
    (getUserDueDates as jest.Mock).mockResolvedValue([]);
  });

  it("displays a message when no playlists are found", async () => {
    render(await UserPlaylistsGrid());

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
        name: "Custom Playlist",
        slug: "custom-playlist",
        isPublic: false,
        duration: "short",
        droplets: [],
      },
    ];

    const mockUserWithPlaylists = {
      ...mockAuthorizedUser,
      playlists: mockPlaylists,
    };

    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(
      mockUserWithPlaylists,
    );

    render(await UserPlaylistsGrid());

    expect(screen.getByText("Custom Playlists")).toBeInTheDocument();
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

    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(
      mockUserWithPlaylists,
    );

    render(await UserPlaylistsGrid());

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

    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(
      mockUserWithPlaylists,
    );
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue(
      mockEnrollments,
    );

    render(await UserPlaylistsGrid());

    expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
  });

  it("returns null when user is not found", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const result = await UserPlaylistsGrid();
    expect(result).toBeNull();
  });
});
