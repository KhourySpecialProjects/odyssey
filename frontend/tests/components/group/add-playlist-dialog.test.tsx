import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddPlaylistDialog } from "@/components/group/add-playlist-dialog";
import { getPlaylists } from "@/lib/requests/playlist";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/requests/playlist", () => ({
  getPlaylists: jest.fn(),
}));

describe("AddPlaylistDialog", () => {
  const mockPlaylists = [{ id: 1, name: "Test Playlist", isPublic: true }];
  const mockOnAddPlaylists = jest.fn();

  beforeEach(() => {
    (getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);
  });

  it("renders add playlist button", () => {
    render(
      <AddPlaylistDialog
        currentPlaylists={[]}
        onAddPlaylists={mockOnAddPlaylists}
      />,
    );
    expect(screen.getByText("Add Playlist")).toBeInTheDocument();
  });

  it("shows dialog with playlists when clicked", async () => {
    render(
      <AddPlaylistDialog
        currentPlaylists={[]}
        onAddPlaylists={mockOnAddPlaylists}
      />,
    );

    fireEvent.click(screen.getByText("Add Playlist"));
    await waitFor(() => {
      expect(screen.getByText("Test Playlist")).toBeInTheDocument();
    });
  });

  describe("AddPlaylistDialog", () => {
    const mockPlaylists = [
      { id: 1, name: "Playlist 1", isPublic: true, duration: "weekly" },
      { id: 2, name: "Playlist 2", isPublic: false, duration: "monthly" },
    ];

    const mockOnAddPlaylists = jest.fn();

    beforeEach(() => {
      (getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);
    });

    it("filters playlists based on search input", async () => {
      render(
        <AddPlaylistDialog
          currentPlaylists={[]}
          onAddPlaylists={mockOnAddPlaylists}
        />,
      );

      await userEvent.click(screen.getByText("Add Playlist"));

      await waitFor(() => {
        expect(screen.getByText("Playlist 1")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search playlists...");
      await userEvent.type(searchInput, "2");

      expect(screen.queryByText("Playlist 1")).not.toBeInTheDocument();
      expect(screen.getByText("Playlist 2")).toBeInTheDocument();
    });

    it("handles adding playlists and updates UI accordingly", async () => {
      render(
        <AddPlaylistDialog
          currentPlaylists={[]}
          onAddPlaylists={mockOnAddPlaylists}
        />,
      );

      await userEvent.click(screen.getByText("Add Playlist"));

      await waitFor(() => {
        expect(screen.getByText("Playlist 1")).toBeInTheDocument();
      });

      const addButtons = screen.getAllByTestId("addPlaylist");
      await userEvent.click(addButtons[0]);

      const addSelectedButton = screen.getByText("Add 1 Playlist");
      expect(addSelectedButton).toBeEnabled();

      await userEvent.click(addSelectedButton);
      expect(mockOnAddPlaylists).toHaveBeenCalledWith([mockPlaylists[0]]);
    });
  });
});
