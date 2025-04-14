import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlaylistForm } from "@/components/playlists/playlist-form";
import { useRouter } from "next/navigation";
import { createPlaylist, updatePlaylist } from "@/lib/actions";

jest.mock("react", () => {
  const actualReact = jest.requireActual("react");
  return {
    ...actualReact,
    useActionState: () => {
      return [{ ok: false, error: null }, jest.fn(), false];
    },
  };
});

jest.mock("@/lib/utils", () => ({
  uppercaseFirstChar: (text: string) => text,
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

jest.mock("flat", () => ({
  flatten: jest.fn((obj) => obj),
  unflatten: jest.fn((obj) => obj),
}));

jest.mock("@/lib/actions", () => ({
  createPlaylist: jest.fn(),
  updatePlaylist: jest.fn(),
  deletePlaylist: jest.fn(),
}));

jest.mock("@/lib/requests/feed", () => ({
  createPlaylistAnnouncement: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: () => "/test",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("react-dnd", () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{}, jest.fn()],
  DndProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-dnd-html5-backend", () => ({
  HTML5Backend: {},
}));

describe("PlaylistForm", () => {
  const mockProps = {
    droplets: [],
    author: { id: 1, name: "Test Author" },
    userId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form fields", () => {
    render(<PlaylistForm {...mockProps} />);
    expect(screen.getByText("Make this playlist public")).toBeInTheDocument();
  });

  it("shows error when submitting without name", async () => {
    render(<PlaylistForm {...mockProps} />);
    fireEvent.click(screen.getByText("Save Playlist"));
    expect(
      await screen.findByText("Please enter a playlist name"),
    ).toBeInTheDocument();
  });

  it("handles form submission validation", async () => {
    render(<PlaylistForm {...mockProps} />);

    fireEvent.submit(screen.getByRole("form"));

    expect(
      screen.getByText("Please enter a playlist name"),
    ).toBeInTheDocument();
  });

  jest.mock("@/lib/actions", () => ({
    createPlaylist: jest.fn(),
    updatePlaylist: jest.fn(),
    deletePlaylist: jest.fn(),
  }));

  jest.mock("@/lib/requests/feed", () => ({
    createPlaylistAnnouncement: jest.fn(),
  }));

  jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
    usePathname: () => "/test",
    useSearchParams: () => new URLSearchParams(),
  }));

  describe("PlaylistForm", () => {
    const mockRouter = {
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
    };

    const mockDroplets = [
      { id: 1, name: "Droplet 1", lessons: [{ id: 1 }, { id: 2 }] },
      { id: 2, name: "Droplet 2", lessons: [{ id: 3 }] },
    ];

    const mockAuthor = { id: 1 };

    beforeEach(() => {
      jest.clearAllMocks();
      (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    it("renders form with initial empty state", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      expect(
        screen.getByPlaceholderText("Enter playlist name"),
      ).toBeInTheDocument();
      expect(screen.getByText("Make this playlist public")).toBeInTheDocument();
    });

    it("validates required fields", async () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      fireEvent.submit(screen.getByRole("form"));

      expect(
        await screen.findByText("Please enter a playlist name"),
      ).toBeInTheDocument();
    });

    it("handles playlist updates", async () => {
      const existingPlaylist = {
        id: 1,
        name: "Existing Playlist",
        slug: "existing-playlist",
        isPublic: true,
        droplets: [mockDroplets[0]],
      };

      render(
        <PlaylistForm
          droplets={mockDroplets}
          author={mockAuthor}
          userId={1}
          existingPlaylist={existingPlaylist}
        />,
      );

      fireEvent.change(screen.getByPlaceholderText("Enter playlist name"), {
        target: { value: "Updated Playlist" },
      });

      await waitFor(() => {
        fireEvent.submit(screen.getByRole("form"));
      });

      expect(updatePlaylist).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: "Updated Playlist",
        }),
      );
    });
  });
});
