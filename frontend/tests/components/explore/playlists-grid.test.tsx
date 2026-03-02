import { render, screen } from "@testing-library/react";
import { PlaylistsGrid } from "@/components/explore/playlists-grid";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getUserDueDates } from "@/lib/requests/groups";
import { Playlist, DueDate } from "@/types";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));

jest.mock("@/lib/requests/groups", () => ({
  getUserDueDates: jest.fn(),
}));

// Mock the SortedPlaylistsGrid component
jest.mock("@/components/explore/sorted-playlists-grid", () => ({
  SortedPlaylistsGrid: ({ playlistsWithCompletion, dueDates }: any) => (
    <div data-testid="sorted-playlists-grid">
      {playlistsWithCompletion.map((playlist: any) => (
        <div key={playlist.id} data-testid={`playlist-${playlist.id}`}>
          <h3>{playlist.name}</h3>
          <p>Completion: {playlist.completionPercentage.toFixed(1)}%</p>
        </div>
      ))}
      <div data-testid="due-dates-count">{dueDates.length}</div>
    </div>
  ),
}));

describe("PlaylistsGrid", () => {
  const mockGetCurrentUser = getCurrentUser as jest.Mock;
  const mockGetCachedUser = getCachedUser as jest.Mock;
  const mockGetEnrollmentsByAuthorizedUser =
    getEnrollmentsByAuthorizedUser as jest.Mock;
  const mockGetUserDueDates = getUserDueDates as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("No user authenticated", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue(null);
    });

    it("renders playlists without completion data when no user is authenticated", async () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 1,
          name: "Test Playlist",
          slug: "test-playlist",
          isPublic: true,
          duration: "short" as const,
          droplets: [],
        },
      ];

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(screen.getByText("Test Playlist")).toBeInTheDocument();
      expect(screen.getByText("Completion: 0.0%")).toBeInTheDocument();
      expect(mockGetCachedUser).not.toHaveBeenCalled();
      expect(mockGetEnrollmentsByAuthorizedUser).not.toHaveBeenCalled();
    });

    it("renders empty message when no playlists are provided", async () => {
      const component = await PlaylistsGrid({ playlists: [] });
      render(component);

      expect(screen.getByText("No Public Playlists")).toBeInTheDocument();
      expect(
        screen.getByText(
          "There are no public playlists available at this time.",
        ),
      ).toBeInTheDocument();
    });

    it("renders empty message when playlists array is undefined", async () => {
      const component = await PlaylistsGrid({ playlists: undefined as any });
      render(component);

      expect(screen.getByText("No Public Playlists")).toBeInTheDocument();
    });

    it("calculates 0% completion for playlists without droplets", async () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 1,
          name: "Empty Playlist",
          slug: "empty-playlist",
          isPublic: true,
          duration: "short" as const,
          droplets: [],
        },
      ];

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(screen.getByText("Completion: 0.0%")).toBeInTheDocument();
    });
  });

  describe("User authenticated", () => {
    const mockUser = { email: "test@example.com" };
    const mockAuthorizedUser: any = {
      id: 1,
      email: "test@example.com",
      roles: [{ id: 1, title: "student" }],
      firstName: "Test",
      lastName: "User",
    };

    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetCachedUser.mockResolvedValue(mockAuthorizedUser);
      mockGetEnrollmentsByAuthorizedUser.mockResolvedValue([]);
      mockGetUserDueDates.mockResolvedValue([]);
    });

    it("fetches user data and enrollments when user is authenticated", async () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 1,
          name: "Test Playlist",
          slug: "test-playlist",
          isPublic: true,
          duration: "medium" as const,
          droplets: [],
        },
      ];

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockGetCachedUser).toHaveBeenCalledWith("test@example.com");
      expect(mockGetEnrollmentsByAuthorizedUser).toHaveBeenCalledWith(1);
      expect(mockGetUserDueDates).toHaveBeenCalledWith(1);
    });

    it("calculates completion percentage correctly with partial completion", async () => {
      const mockPlaylists: any[] = [
        {
          id: 1,
          name: "Playlist 1",
          slug: "playlist-1",
          isPublic: true,
          duration: "short" as const,
          droplets: [
            {
              id: 1,
              name: "Droplet 1",
              slug: "droplet-1",
              lessons: [
                { id: 1, name: "Lesson 1", slug: "lesson-1" },
                { id: 2, name: "Lesson 2", slug: "lesson-2" },
                { id: 3, name: "Lesson 3", slug: "lesson-3" },
                { id: 4, name: "Lesson 4", slug: "lesson-4" },
              ],
            },
          ],
        },
      ];

      mockGetEnrollmentsByAuthorizedUser.mockResolvedValue([
        {
          id: 1,
          viewedLessons: [
            { id: 1, name: "Lesson 1", slug: "lesson-1" },
            { id: 2, name: "Lesson 2", slug: "lesson-2" },
          ],
        },
      ]);

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(screen.getByText("Completion: 50.0%")).toBeInTheDocument();
    });

    it("calculates 100% completion when all lessons are viewed", async () => {
      const mockPlaylists: any[] = [
        {
          id: 1,
          name: "Complete Playlist",
          slug: "complete-playlist",
          isPublic: true,
          duration: "long" as const,
          droplets: [
            {
              id: 1,
              name: "Droplet 1",
              slug: "droplet-1",
              lessons: [
                { id: 1, name: "Lesson 1", slug: "lesson-1" },
                { id: 2, name: "Lesson 2", slug: "lesson-2" },
              ],
            },
          ],
        },
      ];

      mockGetEnrollmentsByAuthorizedUser.mockResolvedValue([
        {
          id: 1,
          viewedLessons: [
            { id: 1, name: "Lesson 1", slug: "lesson-1" },
            { id: 2, name: "Lesson 2", slug: "lesson-2" },
          ],
        },
      ]);

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(screen.getByText("Completion: 100.0%")).toBeInTheDocument();
    });

    it("calculates completion across multiple droplets in a playlist", async () => {
      const mockPlaylists: any[] = [
        {
          id: 1,
          name: "Multi-Droplet Playlist",
          slug: "multi-droplet",
          isPublic: true,
          duration: "medium" as const,
          droplets: [
            {
              id: 1,
              name: "Droplet 1",
              slug: "droplet-1",
              lessons: [
                { id: 1, name: "Lesson 1", slug: "lesson-1" },
                { id: 2, name: "Lesson 2", slug: "lesson-2" },
              ],
            },
            {
              id: 2,
              name: "Droplet 2",
              slug: "droplet-2",
              lessons: [
                { id: 3, name: "Lesson 3", slug: "lesson-3" },
                { id: 4, name: "Lesson 4", slug: "lesson-4" },
              ],
            },
          ],
        },
      ];

      mockGetEnrollmentsByAuthorizedUser.mockResolvedValue([
        {
          id: 1,
          viewedLessons: [
            { id: 1, name: "Lesson 1", slug: "lesson-1" },
            { id: 3, name: "Lesson 3", slug: "lesson-3" },
          ],
        },
      ]);

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(screen.getByText("Completion: 50.0%")).toBeInTheDocument();
    });

    it("handles droplets without lessons array", async () => {
      const mockPlaylists: any[] = [
        {
          id: 1,
          name: "Playlist with Empty Droplet",
          slug: "empty-droplet",
          isPublic: true,
          duration: "short" as const,
          droplets: [
            {
              id: 1,
              name: "Empty Droplet",
              slug: "empty-droplet",
              lessons: undefined,
            },
          ],
        },
      ];

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(screen.getByText("Completion: 0.0%")).toBeInTheDocument();
    });

    it("handles enrollments with null viewedLessons", async () => {
      const mockPlaylists: any[] = [
        {
          id: 1,
          name: "Test Playlist",
          slug: "test-playlist",
          isPublic: true,
          duration: "short" as const,
          droplets: [
            {
              id: 1,
              name: "Droplet 1",
              slug: "droplet-1",
              lessons: [{ id: 1, name: "Lesson 1", slug: "lesson-1" }],
            },
          ],
        },
      ];

      mockGetEnrollmentsByAuthorizedUser.mockResolvedValue([
        {
          id: 1,
          viewedLessons: null,
        },
      ]);

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(screen.getByText("Completion: 0.0%")).toBeInTheDocument();
    });

    it("passes due dates to SortedPlaylistsGrid", async () => {
      const mockDueDates: any[] = [
        {
          id: 1,
          dueDate: "2024-12-31T23:59:59Z",
          playlist: { id: 1 },
        },
        {
          id: 2,
          dueDate: "2024-12-15T23:59:59Z",
          playlist: { id: 2 },
        },
      ];

      mockGetUserDueDates.mockResolvedValue(mockDueDates);

      const mockPlaylists: Playlist[] = [
        {
          id: 1,
          name: "Playlist 1",
          slug: "playlist-1",
          isPublic: true,
          duration: "short" as const,
          droplets: [],
        },
      ];

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(screen.getByTestId("due-dates-count")).toHaveTextContent("2");
    });
  });

  describe("Sorting functionality", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue(null);
    });

    it("sorts playlists by name in ascending order", async () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 1,
          name: "Zebra Playlist",
          slug: "zebra",
          isPublic: true,
          duration: "short" as const,
          droplets: [],
        },
        {
          id: 2,
          name: "Alpha Playlist",
          slug: "alpha",
          isPublic: true,
          duration: "medium" as const,
          droplets: [],
        },
        {
          id: 3,
          name: "Beta Playlist",
          slug: "beta",
          isPublic: true,
          duration: "long" as const,
          droplets: [],
        },
      ];

      const component = await PlaylistsGrid({
        playlists: mockPlaylists,
        sortKey: "name:asc",
      });
      render(component);

      const playlistElements = screen.getAllByTestId(/^playlist-/);
      expect(playlistElements[0]).toHaveTextContent("Alpha Playlist");
      expect(playlistElements[1]).toHaveTextContent("Beta Playlist");
      expect(playlistElements[2]).toHaveTextContent("Zebra Playlist");
    });

    it("sorts playlists by name in descending order", async () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 1,
          name: "Alpha Playlist",
          slug: "alpha",
          isPublic: true,
          duration: "short" as const,
          droplets: [],
        },
        {
          id: 2,
          name: "Beta Playlist",
          slug: "beta",
          isPublic: true,
          duration: "medium" as const,
          droplets: [],
        },
        {
          id: 3,
          name: "Zebra Playlist",
          slug: "zebra",
          isPublic: true,
          duration: "long" as const,
          droplets: [],
        },
      ];

      const component = await PlaylistsGrid({
        playlists: mockPlaylists,
        sortKey: "name:desc",
      });
      render(component);

      const playlistElements = screen.getAllByTestId(/^playlist-/);
      expect(playlistElements[0]).toHaveTextContent("Zebra Playlist");
      expect(playlistElements[1]).toHaveTextContent("Beta Playlist");
      expect(playlistElements[2]).toHaveTextContent("Alpha Playlist");
    });

    it("sorts playlists by completion percentage in ascending order", async () => {
      const mockUser = { email: "test@example.com" };
      const mockAuthorizedUser: any = {
        id: 1,
        email: "test@example.com",
        roles: [{ id: 1, title: "student" }],
        firstName: "Test",
        lastName: "User",
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetCachedUser.mockResolvedValue(mockAuthorizedUser);
      mockGetUserDueDates.mockResolvedValue([]);

      const mockPlaylists: any[] = [
        {
          id: 1,
          name: "Playlist 1",
          slug: "playlist-1",
          isPublic: true,
          duration: "short" as const,
          droplets: [
            {
              id: 1,
              name: "Droplet 1",
              slug: "droplet-1",
              lessons: [
                { id: 1, name: "Lesson 1", slug: "lesson-1" },
                { id: 2, name: "Lesson 2", slug: "lesson-2" },
              ],
            },
          ],
        },
        {
          id: 2,
          name: "Playlist 2",
          slug: "playlist-2",
          isPublic: true,
          duration: "medium" as const,
          droplets: [
            {
              id: 2,
              name: "Droplet 2",
              slug: "droplet-2",
              lessons: [
                { id: 3, name: "Lesson 3", slug: "lesson-3" },
                { id: 4, name: "Lesson 4", slug: "lesson-4" },
              ],
            },
          ],
        },
      ];

      // User has completed 1 lesson from Playlist 1 (50%) and 0 from Playlist 2 (0%)
      mockGetEnrollmentsByAuthorizedUser.mockResolvedValue([
        {
          id: 1,
          viewedLessons: [{ id: 1, name: "Lesson 1", slug: "lesson-1" }],
        },
      ]);

      const component = await PlaylistsGrid({
        playlists: mockPlaylists,
        sortKey: "completion:asc",
      });
      render(component);

      const playlistElements = screen.getAllByTestId(/^playlist-/);
      expect(playlistElements[0]).toHaveTextContent("Playlist 2");
      expect(playlistElements[0]).toHaveTextContent("0.0%");
      expect(playlistElements[1]).toHaveTextContent("Playlist 1");
      expect(playlistElements[1]).toHaveTextContent("50.0%");
    });

    it("sorts playlists by completion percentage in descending order", async () => {
      const mockUser = { email: "test@example.com" };
      const mockAuthorizedUser: any = {
        id: 1,
        email: "test@example.com",
        roles: [{ id: 1, title: "student" }],
        firstName: "Test",
        lastName: "User",
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetCachedUser.mockResolvedValue(mockAuthorizedUser);
      mockGetUserDueDates.mockResolvedValue([]);

      const mockPlaylists: any[] = [
        {
          id: 1,
          name: "Playlist 1",
          slug: "playlist-1",
          isPublic: true,
          duration: "short" as const,
          droplets: [
            {
              id: 1,
              name: "Droplet 1",
              slug: "droplet-1",
              lessons: [
                { id: 1, name: "Lesson 1", slug: "lesson-1" },
                { id: 2, name: "Lesson 2", slug: "lesson-2" },
              ],
            },
          ],
        },
        {
          id: 2,
          name: "Playlist 2",
          slug: "playlist-2",
          isPublic: true,
          duration: "medium" as const,
          droplets: [
            {
              id: 2,
              name: "Droplet 2",
              slug: "droplet-2",
              lessons: [
                { id: 3, name: "Lesson 3", slug: "lesson-3" },
                { id: 4, name: "Lesson 4", slug: "lesson-4" },
              ],
            },
          ],
        },
      ];

      // User has completed 0 lessons from Playlist 1 (0%) and 2 from Playlist 2 (100%)
      mockGetEnrollmentsByAuthorizedUser.mockResolvedValue([
        {
          id: 1,
          viewedLessons: [
            { id: 3, name: "Lesson 3", slug: "lesson-3" },
            { id: 4, name: "Lesson 4", slug: "lesson-4" },
          ],
        },
      ]);

      const component = await PlaylistsGrid({
        playlists: mockPlaylists,
        sortKey: "completion:desc",
      });
      render(component);

      const playlistElements = screen.getAllByTestId(/^playlist-/);
      expect(playlistElements[0]).toHaveTextContent("Playlist 2");
      expect(playlistElements[0]).toHaveTextContent("100.0%");
      expect(playlistElements[1]).toHaveTextContent("Playlist 1");
      expect(playlistElements[1]).toHaveTextContent("0.0%");
    });

    it("does not sort when sortKey is not provided", async () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 3,
          name: "Zebra Playlist",
          slug: "zebra",
          isPublic: true,
          duration: "short" as const,
          droplets: [],
        },
        {
          id: 1,
          name: "Alpha Playlist",
          slug: "alpha",
          isPublic: true,
          duration: "medium" as const,
          droplets: [],
        },
      ];

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      const playlistElements = screen.getAllByTestId(/^playlist-/);
      expect(playlistElements[0]).toHaveTextContent("Zebra Playlist");
      expect(playlistElements[1]).toHaveTextContent("Alpha Playlist");
    });

    it("handles sorting with special characters in playlist names", async () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 1,
          name: "123 Numbers First",
          slug: "numbers",
          isPublic: true,
          duration: "short" as const,
          droplets: [],
        },
        {
          id: 2,
          name: "!Special Characters",
          slug: "special",
          isPublic: true,
          duration: "medium" as const,
          droplets: [],
        },
        {
          id: 3,
          name: "Regular Name",
          slug: "regular",
          isPublic: true,
          duration: "long" as const,
          droplets: [],
        },
      ];

      const component = await PlaylistsGrid({
        playlists: mockPlaylists,
        sortKey: "name:asc",
      });
      render(component);

      expect(screen.getByTestId("sorted-playlists-grid")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue(null);
    });

    it("handles playlists with undefined droplets array", async () => {
      const mockPlaylists: any[] = [
        {
          id: 1,
          name: "Playlist with undefined droplets",
          slug: "undefined-droplets",
          isPublic: true,
          duration: "short" as const,
          droplets: undefined,
        },
      ];

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(screen.getByText("Completion: 0.0%")).toBeInTheDocument();
    });

    it("handles multiple playlists with varying completion percentages", async () => {
      const mockUser = { email: "test@example.com" };
      const mockAuthorizedUser: any = {
        id: 1,
        email: "test@example.com",
        roles: [{ id: 1, title: "student" }],
        firstName: "Test",
        lastName: "User",
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetCachedUser.mockResolvedValue(mockAuthorizedUser);
      mockGetUserDueDates.mockResolvedValue([]);

      const mockPlaylists: any[] = [
        {
          id: 1,
          name: "Empty Playlist",
          slug: "empty",
          isPublic: true,
          duration: "short" as const,
          droplets: [],
        },
        {
          id: 2,
          name: "Partial Playlist",
          slug: "partial",
          isPublic: true,
          duration: "medium" as const,
          droplets: [
            {
              id: 1,
              name: "Droplet 1",
              slug: "droplet-1",
              lessons: [
                { id: 1, name: "Lesson 1", slug: "lesson-1" },
                { id: 2, name: "Lesson 2", slug: "lesson-2" },
              ],
            },
          ],
        },
        {
          id: 3,
          name: "Complete Playlist",
          slug: "complete",
          isPublic: true,
          duration: "long" as const,
          droplets: [
            {
              id: 2,
              name: "Droplet 2",
              slug: "droplet-2",
              lessons: [{ id: 3, name: "Lesson 3", slug: "lesson-3" }],
            },
          ],
        },
      ];

      mockGetEnrollmentsByAuthorizedUser.mockResolvedValue([
        {
          id: 1,
          viewedLessons: [
            { id: 1, name: "Lesson 1", slug: "lesson-1" },
            { id: 3, name: "Lesson 3", slug: "lesson-3" },
          ],
        },
      ]);

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(screen.getByText("Empty Playlist")).toBeInTheDocument();
      expect(screen.getByText("Partial Playlist")).toBeInTheDocument();
      expect(screen.getByText("Complete Playlist")).toBeInTheDocument();

      const completionTexts = screen.getAllByText(/Completion:/);
      expect(completionTexts).toHaveLength(3);
    });

    it("handles user with no email", async () => {
      mockGetCurrentUser.mockResolvedValue({ email: undefined });

      const mockPlaylists: Playlist[] = [
        {
          id: 1,
          name: "Test Playlist",
          slug: "test",
          isPublic: true,
          duration: "short" as const,
          droplets: [],
        },
      ];

      const component = await PlaylistsGrid({ playlists: mockPlaylists });
      render(component);

      expect(mockGetCachedUser).not.toHaveBeenCalled();
      expect(screen.getByText("Test Playlist")).toBeInTheDocument();
    });

    const mockPlaylists: any[] = [
      {
        id: 1,
        name: "Test Playlist",
        slug: "test",
        isPublic: true,
        duration: "medium" as const,
        droplets: [
          {
            id: 1,
            name: "Droplet 1",
            slug: "droplet-1",
            lessons: [
              { id: 1, name: "Lesson 1", slug: "lesson-1" },
              { id: 2, name: "Lesson 2", slug: "lesson-2" },
              { id: 3, name: "Lesson 3", slug: "lesson-3" },
            ],
          },
        ],
      },
    ];

    mockGetEnrollmentsByAuthorizedUser.mockResolvedValue([
      {
        id: 1,
        viewedLessons: [{ id: 1, name: "Lesson 1", slug: "lesson-1" }],
      },
      {
        id: 2,
        viewedLessons: [{ id: 2, name: "Lesson 2", slug: "lesson-2" }],
      },
    ]);
  });
});
