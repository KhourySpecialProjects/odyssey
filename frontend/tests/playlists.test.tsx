import { render, screen } from "@testing-library/react";
import { Playlists } from "@/components/admin/playlists/playlists";
import { getPlaylists } from "@/lib/requests/playlist";

// Mock dependencies
jest.mock("@/lib/requests/playlist", () => ({
  getPlaylists: jest.fn(),
}));

jest.mock("@/components/admin/playlists/create-playlist", () => ({
  CreatePlaylist: () => (
    <div data-testid="create-playlist">Create Playlist Button</div>
  ),
}));

jest.mock("@/components/admin/playlists/playlist-client", () => ({
  PlaylistClient: ({ playlists }: { playlists: any[] }) => (
    <div data-testid="playlist-client">
      Playlist Client with {playlists.length} playlists
    </div>
  ),
}));

describe("Playlists", () => {
  const mockPlaylists = [
    {
      id: 1,
      name: "Test Playlist",
      slug: "test-playlist",
      isPublic: false,
      droplets: [
        {
          id: 1,
          name: "Test Droplet",
          lessons: [{ id: 1, name: "Lesson 1", slug: "lesson-1" }],
        },
      ],
      authors: [{ id: 1, name: "Test Author" }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);
  });

  it("renders the component with correct heading", async () => {
    render(await Playlists());

    expect(screen.getByText("Playlists")).toBeInTheDocument();
    expect(
      screen.getByText("The following playlists have been created."),
    ).toBeInTheDocument();
  });

  it("includes the CreatePlaylist component", async () => {
    render(await Playlists());

    expect(screen.getByTestId("create-playlist")).toBeInTheDocument();
  });

  it("passes fetched playlists to PlaylistClient", async () => {
    render(await Playlists());

    expect(screen.getByTestId("playlist-client")).toBeInTheDocument();
    expect(
      screen.getByText("Playlist Client with 1 playlists"),
    ).toBeInTheDocument();
  });

  it("calls getPlaylists with correct parameters", async () => {
    render(await Playlists());

    expect(getPlaylists).toHaveBeenCalledTimes(1);
    expect(getPlaylists).toHaveBeenCalledWith({
      filters: {},
      populate: {
        droplets: {
          populate: {
            lessons: {
              fields: ["id", "name", "slug"],
            },
          },
        },
        authors: {
          fields: ["id", "name"],
        },
      },
    });
  });
});
