import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlaylistForm } from "@/components/playlists/playlist-form";
import { useRouter } from "next/navigation";
import { createPlaylist, updatePlaylist } from "@/lib/actions";
import { AuthorizedUser, DropletStatus, DropletType, FocusArea, Tag } from "@/types";
import { createPlaylistAnnouncement } from "@/lib/requests/feed";

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

    const mockDroplets = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `Droplet ${i + 1}`,
      slug: `droplet-${i + 1}`,
      isHidden: false,
      focusArea: "personal" as FocusArea,
      type: "knowledge" as DropletType,
      tags: [{ id: 1, name: "React" }] as Tag[],
      learningObjectives: [],
      status: "published" as DropletStatus,
      droplet_lessons: [],
    }));

    const mockAuthor: AuthorizedUser = {
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
        render(<PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />);
        expect(screen.getByText("Make this playlist public")).toBeInTheDocument();
      });
    
      it("shows error when submitting without name", async () => {
        render(<PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />);
        fireEvent.click(screen.getByText("Save Playlist"));
        expect(
          await screen.findByText("Please enter a playlist name"),
        ).toBeInTheDocument();
      });
    
      it("handles form submission validation", async () => {
        render(<PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />);
    
        fireEvent.submit(screen.getByRole("form"));
    
        expect(
          screen.getByText("Please enter a playlist name"),
        ).toBeInTheDocument();
      });
  

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




  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle droplet selection and reordering', () => {
    render(<PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />);
    
    const searchInput = screen.getByPlaceholderText('Search Droplets...');
    fireEvent.change(searchInput, { target: { value: 'Droplet 1' } });
    
    expect(screen.getByText('Droplet 1')).toBeInTheDocument();
  });

  it('should handle form submission for existing playlist', async () => {
    const existingPlaylist = {
      id: 1,
      name: 'Existing Playlist',
      slug: 'existing-playlist',
      isPublic: true,
      droplets: [mockDroplets[0]]
    };
    
    (updatePlaylist as jest.Mock).mockResolvedValue({ ok: true });
    
    render(
      <PlaylistForm 
        droplets={mockDroplets} 
        author={mockAuthor} 
        userId={1} 
        existingPlaylist={existingPlaylist}
      />
    );
    
    const submitButton = screen.getByText('Save Playlist');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(updatePlaylist).toHaveBeenCalled();
    });
  });

  it('should handle playlist announcement', async () => {
    const existingPlaylist = {
      id: 1,
      name: 'Existing Playlist',
      slug: 'existing-playlist',
      isPublic: true,
      droplets: [mockDroplets[0]]
    };
    
    render(
      <PlaylistForm 
        droplets={mockDroplets} 
        author={mockAuthor} 
        userId={1} 
        existingPlaylist={existingPlaylist}
      />
    );
    
    const submitButton = screen.getByText('Save Playlist');
    fireEvent.click(submitButton);
    
    // Wait for the dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Would you like to announce these changes to everyone enrolled in this playlist?')).toBeInTheDocument();
    });

    const shareButton = screen.getByRole('button', { name: /Share/i });
    fireEvent.click(shareButton);
    await waitFor(() => {
      expect(createPlaylistAnnouncement).toHaveBeenCalled();
    });
  });
});
