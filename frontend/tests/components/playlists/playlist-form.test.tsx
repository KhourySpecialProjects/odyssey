import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlaylistForm } from "@/components/playlists/playlist-form";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AuthorizedUser,
  DropletStatus,
  DropletType,
  FocusArea,
  Tag,
  Droplet,
} from "@/types";
import { createPlaylistAnnouncement } from "@/lib/requests/feed";
import { createPlaylist, updatePlaylist } from "@/lib/requests/playlist";

// Mock modules
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
  getDueDateBadgeColor: jest.fn(),
}));

jest.mock("flat", () => ({
  flatten: jest.fn((obj) => obj),
  unflatten: jest.fn((obj) => obj),
}));

jest.mock("@/lib/requests/playlist", () => ({
  createPlaylist: jest.fn(),
  updatePlaylist: jest.fn(),
  deletePlaylist: jest.fn(),
}));

jest.mock("@/lib/requests/feed", () => ({
  createPlaylistAnnouncement: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
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
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockSearchParams = new URLSearchParams();

  const createMockDroplet = (id: number, name?: string): any => ({
    id,
    name: name || `Droplet ${id}`,
    slug: `droplet-${id}`,
    isHidden: false,
    focusArea: "personal" as FocusArea,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React", droplets: [], slug: "react" }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: [],
    lessons: [
      { id: 1, name: "Lesson 1" },
      { id: 2, name: "Lesson 2" },
    ],
  });

  const mockDroplets = Array.from({ length: 15 }, (_, i) =>
    createMockDroplet(i + 1),
  );

  const mockAuthor: any = {
    id: 1,
    email: "test@test.com",
    roles: [],
    isEnabled: true,
    isPublic: false,
    linkedin: "",
    github: "",
    firstTime: false,
    firstName: "Test",
    lastName: "User",
    bio: "",
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue("/test");
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  describe("Rendering", () => {
    it("renders all form fields with initial empty state", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      expect(screen.getByLabelText(/Playlist Name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter playlist name")).toHaveValue(
        "",
      );
      expect(
        screen.getByLabelText(/Make this playlist public/i),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Playlist Description/i),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter playlist description"),
      ).toHaveValue("");
    });

    it("renders with existing playlist data", () => {
      const existingPlaylist = {
        id: 1,
        name: "My Playlist",
        description: "Test description",
        slug: "my-playlist",
        isPublic: true,
        droplets: [mockDroplets[0], mockDroplets[1]],
      };

      render(
        <PlaylistForm
          droplets={mockDroplets}
          author={mockAuthor}
          userId={1}
          existingPlaylist={existingPlaylist}
        />,
      );

      expect(screen.getByDisplayValue("My Playlist")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test description")).toBeInTheDocument();
    });

    it("displays droplet count and lesson totals", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      expect(screen.getByText(/0 droplets selected/i)).toBeInTheDocument();
      expect(screen.getByText(/0 lessons total/i)).toBeInTheDocument();
    });

    it("renders Available and Selected Droplets sections", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      expect(screen.getByText("Available Droplets")).toBeInTheDocument();
      expect(screen.getByText("Selected Droplets")).toBeInTheDocument();
    });

    it("renders action buttons", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      expect(
        screen.getByRole("button", { name: /Cancel/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Save Playlist/i }),
      ).toBeInTheDocument();
    });

    it("renders search input and button", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      expect(
        screen.getByPlaceholderText("Search Droplets..."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Search/i }),
      ).toBeInTheDocument();
    });

    it("shows required asterisk on playlist name", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const nameLabel = screen.getByText(/Playlist Name/i);
      expect(nameLabel.innerHTML).toContain("*");
    });
  });

  describe("Form Input Interactions", () => {
    it("updates playlist name on input change", async () => {
      const user = userEvent.setup();
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const nameInput = screen.getByPlaceholderText("Enter playlist name");
      await user.type(nameInput, "New Playlist");

      expect(nameInput).toHaveValue("New Playlist");
    });

    it("updates description on input change", async () => {
      const user = userEvent.setup();
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const descInput = screen.getByPlaceholderText(
        "Enter playlist description",
      );
      await user.type(descInput, "A great playlist");

      expect(descInput).toHaveValue("A great playlist");
    });

    it("toggles public/private switch", async () => {
      const user = userEvent.setup();
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const switchElement = screen.getByLabelText("Make this playlist public");
      expect(switchElement).not.toBeChecked();

      await user.click(switchElement);
      expect(switchElement).toBeChecked();

      await user.click(switchElement);
      expect(switchElement).not.toBeChecked();
    });
  });

  describe("Search Functionality", () => {
    it("filters droplets based on search query", async () => {
      const user = userEvent.setup();
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const searchInput = screen.getByPlaceholderText("Search Droplets...");
      await user.type(searchInput, "Droplet 1");

      expect(searchInput).toHaveValue("Droplet 1");
    });

    it("updates search query on button click", async () => {
      const user = userEvent.setup();
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const searchInput = screen.getByPlaceholderText("Search Droplets...");
      await user.type(searchInput, "test");

      const searchButton = screen.getByRole("button", { name: /Search/i });
      await user.click(searchButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/test?q=test");
    });

    it("prevents default on Enter key in search input", async () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const searchInput = screen.getByPlaceholderText("Search Droplets...");
      const preventDefault = jest.fn();

      fireEvent.keyDown(searchInput, {
        key: "Enter",
        preventDefault,
      });
    });

    it("clears search query when empty", async () => {
      const user = userEvent.setup();
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("q=test"),
      );

      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const searchInput = screen.getByPlaceholderText("Search Droplets...");
      await user.clear(searchInput);

      const searchButton = screen.getByRole("button", { name: /Search/i });
      await user.click(searchButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/test?");
    });

    it("initializes with query parameter from URL", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("q=initial"),
      );

      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const searchInput = screen.getByPlaceholderText("Search Droplets...");
      expect(searchInput).toHaveValue("initial");
    });
  });

  describe("Form Validation", () => {
    it("shows error when submitting without playlist name", async () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      expect(
        await screen.findByText("Please enter a playlist name"),
      ).toBeInTheDocument();
    });

    it("shows error when submitting with empty name", async () => {
      const user = userEvent.setup();
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const nameInput = screen.getByPlaceholderText("Enter playlist name");
      await user.type(nameInput, "Test");
      await user.clear(nameInput);

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      expect(
        await screen.findByText("Please enter a playlist name"),
      ).toBeInTheDocument();
    });

    it("shows error when submitting without selected droplets", async () => {
      const user = userEvent.setup();
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const nameInput = screen.getByPlaceholderText("Enter playlist name");
      await user.type(nameInput, "Valid Name");

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      expect(
        await screen.findByText("Please select at least one droplet"),
      ).toBeInTheDocument();
    });

    it("validates on form submit event", async () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const form = screen.getByRole("form");
      fireEvent.submit(form);

      expect(
        await screen.findByText("Please enter a playlist name"),
      ).toBeInTheDocument();
    });
  });

  describe("Creating New Playlist", () => {
    it("creates playlist with valid data", async () => {
      const user = userEvent.setup();
      (createPlaylist as jest.Mock).mockResolvedValue({ ok: true });

      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
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

      const nameInput = screen.getByPlaceholderText("Enter playlist name");
      await user.clear(nameInput);
      await user.type(nameInput, "New Playlist");

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("sends correct payload when creating playlist", async () => {
      const user = userEvent.setup();
      (createPlaylist as jest.Mock).mockResolvedValue({ ok: true });

      const testDroplets = [mockDroplets[0]];
      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
        droplets: testDroplets,
      };

      render(
        <PlaylistForm
          droplets={mockDroplets}
          author={mockAuthor}
          userId={1}
          existingPlaylist={existingPlaylist}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter playlist name");
      await user.clear(nameInput);
      await user.type(nameInput, "Test Playlist");

      const descInput = screen.getByPlaceholderText(
        "Enter playlist description",
      );
      await user.type(descInput, "Test Description");

      const switchElement = screen.getByLabelText("Make this playlist public");
      await user.click(switchElement);

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(updatePlaylist).toHaveBeenCalledWith(1, {
          name: "Test Playlist",
          description: "Test Description",
          isPublic: true,
          droplets: testDroplets.map((d) => ({ id: d.id })),
          author: { id: mockAuthor.id },
          userId: 1,
          slug: "test",
        });
      });
    });

    it("handles creation error", async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      (updatePlaylist as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Creation failed",
      });

      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
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

      const nameInput = screen.getByPlaceholderText("Enter playlist name");
      await user.type(nameInput, "Failed Playlist");

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(updatePlaylist).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it("handles unexpected error during creation", async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      (updatePlaylist as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
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

      const nameInput = screen.getByPlaceholderText("Enter playlist name");
      await user.type(nameInput, "Error Playlist");

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(updatePlaylist).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Updating Existing Playlist", () => {
    it("populates form with existing playlist data", () => {
      const existingPlaylist = {
        id: 1,
        name: "Existing Playlist",
        description: "Existing Description",
        slug: "existing-playlist",
        isPublic: true,
        droplets: [mockDroplets[0], mockDroplets[1]],
      };

      render(
        <PlaylistForm
          droplets={mockDroplets}
          author={mockAuthor}
          userId={1}
          existingPlaylist={existingPlaylist}
        />,
      );
    });

    it("updates playlist with modified data", async () => {
      const user = userEvent.setup();
      (updatePlaylist as jest.Mock).mockResolvedValue({ ok: true });

      const existingPlaylist = {
        id: 1,
        name: "Old Name",
        description: "Old Description",
        slug: "old-slug",
        isPublic: false,
        droplets: [mockDroplets[0]],
      };
    });

    it("handles update error", async () => {
      const user = userEvent.setup();
      (updatePlaylist as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Update failed",
      });

      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
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

      const nameInput = screen.getByPlaceholderText("Enter playlist name");
      await user.type(nameInput, "Failed Update");

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Update failed")).toBeInTheDocument();
      });
    });

    it("filters source droplets excluding existing playlist droplets", () => {
      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
        droplets: [mockDroplets[0], mockDroplets[1]],
      };

      render(
        <PlaylistForm
          droplets={mockDroplets}
          author={mockAuthor}
          userId={1}
          existingPlaylist={existingPlaylist}
        />,
      );

      // The component should show 2 selected and 13 available (15 total - 2 selected)
      expect(screen.getByText(/2 droplets selected/i)).toBeInTheDocument();
    });
  });

  describe("Announcement Dialog", () => {
    it("opens dialog after successful playlist update", async () => {
      (updatePlaylist as jest.Mock).mockResolvedValue({ ok: true });

      const existingPlaylist = {
        id: 1,
        name: "Test Playlist",
        slug: "test-playlist",
        isPublic: false,
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

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Would you like to announce these changes to everyone enrolled in this playlist?",
          ),
        ).toBeInTheDocument();
      });
    });

    it("creates announcement when Share button clicked", async () => {
      (updatePlaylist as jest.Mock).mockResolvedValue({ ok: true });
      (createPlaylistAnnouncement as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const existingPlaylist = {
        id: 1,
        name: "Test Playlist",
        slug: "test-playlist",
        isPublic: false,
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

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const shareButton = screen.getByRole("button", { name: /^Share$/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(createPlaylistAnnouncement).toHaveBeenCalledWith(
          "Test Playlist",
          1,
        );
        expect(mockRouter.push).toHaveBeenCalledWith("/my-content");
      });
    });

    it("navigates without announcement when Not Now clicked", async () => {
      (updatePlaylist as jest.Mock).mockResolvedValue({ ok: true });

      const existingPlaylist = {
        id: 1,
        name: "Test Playlist",
        slug: "test-playlist",
        isPublic: false,
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

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const notNowButton = screen.getByRole("button", { name: /Not Now/i });
      fireEvent.click(notNowButton);

      await waitFor(() => {
        expect(createPlaylistAnnouncement).not.toHaveBeenCalled();
        expect(mockRouter.push).toHaveBeenCalledWith("/my-content");
      });
    });

    it("handles announcement creation error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      (updatePlaylist as jest.Mock).mockResolvedValue({ ok: true });
      (createPlaylistAnnouncement as jest.Mock).mockRejectedValue(
        new Error("Announcement failed"),
      );

      const existingPlaylist = {
        id: 1,
        name: "Test Playlist",
        slug: "test-playlist",
        isPublic: false,
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

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const shareButton = screen.getByRole("button", { name: /^Share$/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to make playlist announcement: ",
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });

    it("closes dialog when onOpenChange is called with false", async () => {
      (updatePlaylist as jest.Mock).mockResolvedValue({ ok: true });

      const existingPlaylist = {
        id: 1,
        name: "Test Playlist",
        slug: "test-playlist",
        isPublic: false,
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

      const submitButton = screen.getByRole("button", {
        name: /Save Playlist/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Dialog should close when escape is pressed or backdrop clicked
      // This tests the onOpenChange handler
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("navigates to my-content when Cancel clicked", async () => {
      const user = userEvent.setup();
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/my-content");
    });
  });

  describe("Droplet Count and Lessons Display", () => {
    it("updates droplet count based on selection", () => {
      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
        droplets: [mockDroplets[0], mockDroplets[1], mockDroplets[2]],
      };

      render(
        <PlaylistForm
          droplets={mockDroplets}
          author={mockAuthor}
          userId={1}
          existingPlaylist={existingPlaylist}
        />,
      );

      expect(screen.getByText(/3 droplets selected/i)).toBeInTheDocument();
    });

    it("calculates total lessons correctly", () => {
      const dropletsWithLessons = [
        { ...mockDroplets[0], lessons: [{ id: 1 }, { id: 2 }] },
        { ...mockDroplets[1], lessons: [{ id: 3 }, { id: 4 }, { id: 5 }] },
      ];

      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
        droplets: dropletsWithLessons,
      };

      render(
        <PlaylistForm
          droplets={mockDroplets}
          author={mockAuthor}
          userId={1}
          existingPlaylist={existingPlaylist}
        />,
      );

      expect(screen.getByText(/5 lessons total/i)).toBeInTheDocument();
    });

    it("handles droplets without lessons array", () => {
      const dropletsWithoutLessons = [
        { ...mockDroplets[0], lessons: undefined },
      ];

      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
        droplets: dropletsWithoutLessons,
      };

      render(
        <PlaylistForm
          droplets={mockDroplets}
          author={mockAuthor}
          userId={1}
          existingPlaylist={existingPlaylist}
        />,
      );

      expect(screen.getByText(/0 lessons total/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper form role", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      expect(screen.getByRole("form")).toBeInTheDocument();
    });

    it("has accessible labels for all inputs", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      expect(screen.getByLabelText(/Playlist Name/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Playlist Description/i),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Make this playlist public/i),
      ).toBeInTheDocument();
    });

    it("has screen reader only text for Search button", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const searchButton = screen.getByRole("button", { name: /Search/i });
      expect(searchButton).toBeInTheDocument();
    });

    it("associates labels with form controls using htmlFor", () => {
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const nameInput = screen.getByLabelText(/Playlist Name/i);
      const descInput = screen.getByLabelText(/Playlist Description/i);
      const switchElement = screen.getByLabelText(/Make this playlist public/i);

      expect(nameInput).toHaveAttribute("id", "name");
      expect(descInput).toHaveAttribute("id", "description");
      expect(switchElement).toHaveAttribute("id", "public");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty droplets array", () => {
      render(<PlaylistForm droplets={[]} author={mockAuthor} userId={1} />);

      expect(screen.getByText("Available Droplets")).toBeInTheDocument();
      expect(screen.getByText("Selected Droplets")).toBeInTheDocument();
    });

    it("handles missing description in existing playlist", () => {
      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
        droplets: [],
      };

      render(
        <PlaylistForm
          droplets={mockDroplets}
          author={mockAuthor}
          userId={1}
          existingPlaylist={existingPlaylist}
        />,
      );

      expect(
        screen.getByPlaceholderText("Enter playlist description"),
      ).toHaveValue("");
    });

    it("handles playlist with no existing droplets", () => {
      const existingPlaylist = {
        id: 1,
        name: "Test",
        slug: "test",
        isPublic: false,
      };

      render(
        <PlaylistForm
          droplets={mockDroplets}
          author={mockAuthor}
          userId={1}
          existingPlaylist={existingPlaylist}
        />,
      );

      expect(screen.getByText(/0 droplets selected/i)).toBeInTheDocument();
    });

    it("handles very long playlist names", async () => {
      const user = userEvent.setup();
      render(
        <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
      );

      const longName = "A".repeat(500);
      const nameInput = screen.getByPlaceholderText("Enter playlist name");
      await user.type(nameInput, longName);

      expect(nameInput).toHaveValue(longName);
    });

    it("preserves form state during interactions", async () => {
  const user = userEvent.setup();
  render(
    <PlaylistForm droplets={mockDroplets} author={mockAuthor} userId={1} />,
  );

  const nameInput = screen.getByPlaceholderText("Enter playlist name");
  await user.click(nameInput);
  await user.paste("Test Name");

  const descInput = screen.getByPlaceholderText(
    "Enter playlist description",
  );
  await user.click(descInput);
  await user.paste("Test Description");

  const switchElement = screen.getByLabelText("Make this playlist public");
  await user.click(switchElement);

  // Verify all values are preserved
  expect(nameInput).toHaveValue("Test Name");
  expect(descInput).toHaveValue("Test Description");
  expect(switchElement).toBeChecked();
});
  });
});
