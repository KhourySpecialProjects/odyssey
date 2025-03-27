import { render, screen } from "@testing-library/react";
import { PlaylistsGrid } from "@/components/explore/playlists-grid";
import { getPlaylists } from "@/lib/requests/playlist";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getUserDueDates } from "@/lib/requests/groups";

jest.mock("@/lib/requests/playlist", () => ({
  getPlaylists: jest.fn(),
}));

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

describe("PlaylistsGrid", () => {
  const mockPlaylists = [
    {
      id: 1,
      name: "Test Playlist",
      isPublic: true,
      droplets: [],
    },
  ];

  beforeEach(() => {
    (getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
  });

  it("renders playlists when available", async () => {
    render(await PlaylistsGrid({}));
    expect(screen.getByText("Test Playlist")).toBeInTheDocument();
  });

  it("shows no results message when no playlists found", async () => {
    (getPlaylists as jest.Mock).mockResolvedValue([]);
    render(await PlaylistsGrid({}));
    expect(screen.getByText("No Public Playlists")).toBeInTheDocument();
  });

  describe("PlaylistsGrid", () => {
    const mockPlaylists = [
      {
        id: 1,
        name: "Playlist 1",
        droplets: [
          {
            id: 1,
            lessons: [{ id: 1 }, { id: 2 }],
          },
        ],
      },
    ];

    beforeEach(() => {
      (getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);
      (getCurrentUser as jest.Mock).mockResolvedValue({
        email: "test@test.com",
      });
      (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue({ id: 1 });
      (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([
        { viewedLessons: [{ id: 1 }] },
      ]);
      (getUserDueDates as jest.Mock).mockResolvedValue([
        { playlist: { id: 1 }, dueDate: "2024-01-01" },
      ]);
    });

    it("calculates completion percentage correctly", async () => {
      const { container } = await render(await PlaylistsGrid({}));

      expect(container).toHaveTextContent("Playlist 11 droplets");
    });

    it("sorts playlists by name correctly", async () => {
      const mockSortedPlaylists = [
        { id: 1, name: "A Playlist" },
        { id: 2, name: "B Playlist" },
      ];
      (getPlaylists as jest.Mock).mockResolvedValue(mockSortedPlaylists);

      await render(await PlaylistsGrid({ sortKey: "name:asc" }));
      const playlistNames = screen.getAllByText(/Playlist/);
      expect(playlistNames[0]).toHaveTextContent("A Playlist");
      expect(playlistNames[1]).toHaveTextContent("B Playlist");
    });

    it("sorts playlists by completion correctly", async () => {
      const mockSortedPlaylists = [
        { id: 1, name: "A Playlist" },
        { id: 2, name: "B Playlist" },
      ];
      (getPlaylists as jest.Mock).mockResolvedValue(mockSortedPlaylists);

      await render(await PlaylistsGrid({ sortKey: "completion:asc" }));
      const playlistNames = screen.getAllByText(/Playlist/);
      expect(playlistNames[0]).toHaveTextContent("A Playlist");
      expect(playlistNames[1]).toHaveTextContent("B Playlist");
    });

    it("displays empty state message when no playlists", async () => {
      (getPlaylists as jest.Mock).mockResolvedValue([]);

      await render(await PlaylistsGrid({}));
      expect(screen.getByText("No Public Playlists")).toBeInTheDocument();
    });
  });
});
