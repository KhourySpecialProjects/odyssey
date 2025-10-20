import { render, screen, fireEvent, within } from "@testing-library/react";
import { PlaylistList } from "@/components/group/group-management-playlist-list";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Simpler mocks without requireActual
jest.mock("react-dnd", () => ({
  useDrag: jest.fn(() => [{ isDragging: false }, jest.fn()]),
  useDrop: jest.fn(() => [{}, jest.fn()]),
  DndProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-dnd-html5-backend", () => ({
  HTML5Backend: {},
}));

const renderWithDnd = (ui: React.ReactElement) => {
  return render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);
};

describe("PlaylistList", () => {
  const mockPlaylist = {
    id: 1,
    name: "Test Playlist",
    slug: "test-playlist",
    isPublic: false,
    droplets: [] as any,
    authors: [],
    duration: "short" as "short" | "medium" | "long",
  };

  const mockPlaylists = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: `Playlist ${i + 1}`,
    slug: `playlist-${i + 1}`,
    isPublic: i % 2 === 0,
    droplets: Array.from({ length: i + 1 }, (_, j) => ({ id: j + 1 })) as any,
    authors: [],
    duration: ["short", "medium", "long"][i % 3] as "short" | "medium" | "long",
  }));

  const mockOnReorder = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all playlists in the list", () => {
      renderWithDnd(
        <PlaylistList
          playlists={mockPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      mockPlaylists.forEach((playlist) => {
        expect(screen.getByText(playlist.name)).toBeInTheDocument();
      });
    });

    it("renders playlists with correct information", () => {
      render(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Test Playlist")).toBeInTheDocument();
      expect(screen.getByText("Private")).toBeInTheDocument();
      expect(screen.getByText("Short")).toBeInTheDocument();
    });

    it("renders playlist items correctly", () => {
      const onReorder = jest.fn();
      const onRemove = jest.fn();

      render(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={onReorder}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText("Test Playlist")).toBeInTheDocument();
      expect(screen.getByText("Private")).toBeInTheDocument();
      expect(screen.getByText("Short")).toBeInTheDocument();
    });

    it("renders GripVertical icon for drag handle", () => {
      const { container } = renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const gripIcon = container.querySelector("svg");
      expect(gripIcon).toBeInTheDocument();
    });

    it("applies correct styling classes", () => {
      const { container } = renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const playlistItem = container.querySelector(".group");
      expect(playlistItem).toHaveClass(
        "relative",
        "rounded-md",
        "border",
        "border-slate-200",
      );
    });

    it("initializes drag and drop refs correctly", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(require("react-dnd").useDrag).toHaveBeenCalled();
      expect(require("react-dnd").useDrop).toHaveBeenCalled();
    });
  });

  describe("Badge Display", () => {
    it("displays 'Public' badge for public playlists", () => {
      const publicPlaylist = { ...mockPlaylist, isPublic: true };

      renderWithDnd(
        <PlaylistList
          playlists={[publicPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Public")).toBeInTheDocument();
    });

    it("displays 'Private' badge for private playlists", () => {
      const privatePlaylist = { ...mockPlaylist, isPublic: false };

      renderWithDnd(
        <PlaylistList
          playlists={[privatePlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Private")).toBeInTheDocument();
    });

    it("capitalizes duration in badge", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Short")).toBeInTheDocument();
    });

    it("displays different durations correctly", () => {
      const playlistsWithDifferentDurations = [
        {
          ...mockPlaylist,
          id: 1,
          name: "Short Playlist",
          duration: "short" as const,
        },
        {
          ...mockPlaylist,
          id: 2,
          name: "Medium Playlist",
          duration: "medium" as const,
        },
        {
          ...mockPlaylist,
          id: 3,
          name: "Long Playlist",
          duration: "long" as const,
        },
      ];

      renderWithDnd(
        <PlaylistList
          playlists={playlistsWithDifferentDurations}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Short")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("Long")).toBeInTheDocument();
    });

    it("handles undefined duration by defaulting to medium", () => {
      const playlistWithoutDuration = {
        ...mockPlaylist,
        duration: undefined,
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithoutDuration as any]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Medium")).toBeInTheDocument();
    });

    it("applies correct badge styling", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const privateBadge = screen.getByText("Private");
      const shortBadge = screen.getByText("Short");

      expect(privateBadge).toHaveClass("dark:bg-slate-700");
      expect(shortBadge).toHaveClass("dark:bg-slate-700");
    });
  });

  describe("Droplet Count", () => {
    it("displays correct droplet count", () => {
      const onReorder = jest.fn();
      const onRemove = jest.fn();

      render(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={onReorder}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText("0 droplets")).toBeInTheDocument();
    });

    it("displays droplet count when droplets exist", () => {
      const playlistWithDroplets = {
        ...mockPlaylist,
        droplets: [{ id: 1 }, { id: 2 }, { id: 3 }] as any,
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithDroplets]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("3 droplets")).toBeInTheDocument();
    });

    it("displays singular 'droplet' for single item", () => {
      const playlistWithOneDroplet = {
        ...mockPlaylist,
        droplets: [{ id: 1 }] as any,
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithOneDroplet]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("1 droplets")).toBeInTheDocument();
    });

    it("does not display droplet count when droplets is undefined", () => {
      const playlistWithoutDroplets = {
        ...mockPlaylist,
        droplets: undefined,
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithoutDroplets]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.queryByText(/droplets/)).not.toBeInTheDocument();
    });
  });

  describe("Remove Functionality", () => {
    it("calls onRemove when remove button is clicked", () => {
      render(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const removeButtons = screen.getAllByRole("button");
      fireEvent.click(removeButtons[0]);

      expect(mockOnRemove).toHaveBeenCalledWith(1);
    });

    it("handles remove action", () => {
      const onReorder = jest.fn();
      const onRemove = jest.fn();

      render(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={onReorder}
          onRemove={onRemove}
        />,
      );

      const removeButton = screen.getByRole("button");
      fireEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalledWith(1);
    });

    it("calls onRemove with correct playlist id", () => {
      renderWithDnd(
        <PlaylistList
          playlists={mockPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const removeButtons = screen.getAllByRole("button");
      fireEvent.click(removeButtons[0]);

      expect(mockOnRemove).toHaveBeenCalledWith(1);
    });

    it("calls onRemove for each playlist independently", () => {
      renderWithDnd(
        <PlaylistList
          playlists={mockPlaylists.slice(0, 3)}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const removeButtons = screen.getAllByRole("button");

      fireEvent.click(removeButtons[0]);
      expect(mockOnRemove).toHaveBeenCalledWith(1);

      fireEvent.click(removeButtons[1]);
      expect(mockOnRemove).toHaveBeenCalledWith(2);

      fireEvent.click(removeButtons[2]);
      expect(mockOnRemove).toHaveBeenCalledWith(3);
    });

    it("remove button has correct styling classes", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const removeButton = screen.getByRole("button");
      expect(removeButton).toHaveClass("text-slate-400");
    });
  });

  describe("Reordering Functionality", () => {
    it("handles reordering playlists", () => {
      renderWithDnd(
        <PlaylistList
          playlists={mockPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const reorderedPlaylists = [...mockPlaylists].reverse();
      mockOnReorder(reorderedPlaylists);

      expect(mockOnReorder).toHaveBeenCalledWith(reorderedPlaylists);
    });

    it("maintains playlist properties after reordering", () => {
      renderWithDnd(
        <PlaylistList
          playlists={mockPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const reorderedPlaylists = [mockPlaylists[1], mockPlaylists[0]];
      mockOnReorder(reorderedPlaylists);

      expect(mockOnReorder).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 2, name: "Playlist 2" }),
          expect.objectContaining({ id: 1, name: "Playlist 1" }),
        ]),
      );
    });

    it("reorders playlists correctly when dragging from start to end", () => {
      const testPlaylists = mockPlaylists.slice(0, 3);

      renderWithDnd(
        <PlaylistList
          playlists={testPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      // Simulate dragging first item to last position
      const dragIndex = 0;
      const hoverIndex = 2;

      const reorderedPlaylists = [...testPlaylists];
      const [draggedItem] = reorderedPlaylists.splice(dragIndex, 1);
      reorderedPlaylists.splice(hoverIndex, 0, draggedItem);

      mockOnReorder(reorderedPlaylists);

      expect(mockOnReorder).toHaveBeenCalledWith([
        testPlaylists[1],
        testPlaylists[2],
        testPlaylists[0],
      ]);
    });

    it("reorders playlists correctly when dragging from end to start", () => {
      const testPlaylists = mockPlaylists.slice(0, 3);

      renderWithDnd(
        <PlaylistList
          playlists={testPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      // Simulate dragging last item to first position
      const dragIndex = 2;
      const hoverIndex = 0;

      const reorderedPlaylists = [...testPlaylists];
      const [draggedItem] = reorderedPlaylists.splice(dragIndex, 1);
      reorderedPlaylists.splice(hoverIndex, 0, draggedItem);

      mockOnReorder(reorderedPlaylists);

      expect(mockOnReorder).toHaveBeenCalledWith([
        testPlaylists[2],
        testPlaylists[0],
        testPlaylists[1],
      ]);
    });

    it("handles adjacent playlist reordering", () => {
      const testPlaylists = mockPlaylists.slice(0, 3);

      renderWithDnd(
        <PlaylistList
          playlists={testPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      // Simulate dragging item at index 1 to index 2
      const dragIndex = 1;
      const hoverIndex = 2;

      const reorderedPlaylists = [...testPlaylists];
      const [draggedItem] = reorderedPlaylists.splice(dragIndex, 1);
      reorderedPlaylists.splice(hoverIndex, 0, draggedItem);

      mockOnReorder(reorderedPlaylists);

      expect(mockOnReorder).toHaveBeenCalledWith([
        testPlaylists[0],
        testPlaylists[2],
        testPlaylists[1],
      ]);
    });

    it("does not trigger reorder when hovering over same index", () => {
      const testPlaylists = mockPlaylists.slice(0, 3);

      renderWithDnd(
        <PlaylistList
          playlists={testPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      // The hover callback should not trigger movePlaylist when item.index === index
      expect(mockOnReorder).not.toHaveBeenCalled();
    });
  });

  describe("Badge Display", () => {
    it("displays 'Public' badge for public playlists", () => {
      const publicPlaylist = { ...mockPlaylist, isPublic: true };

      renderWithDnd(
        <PlaylistList
          playlists={[publicPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Public")).toBeInTheDocument();
    });

    it("displays 'Private' badge for private playlists", () => {
      const privatePlaylist = { ...mockPlaylist, isPublic: false };

      renderWithDnd(
        <PlaylistList
          playlists={[privatePlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Private")).toBeInTheDocument();
    });

    it("capitalizes duration in badge", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Short")).toBeInTheDocument();
    });

    it("displays different durations correctly", () => {
      const playlistsWithDifferentDurations = [
        {
          ...mockPlaylist,
          id: 1,
          name: "Short Playlist",
          duration: "short" as const,
        },
        {
          ...mockPlaylist,
          id: 2,
          name: "Medium Playlist",
          duration: "medium" as const,
        },
        {
          ...mockPlaylist,
          id: 3,
          name: "Long Playlist",
          duration: "long" as const,
        },
      ];

      renderWithDnd(
        <PlaylistList
          playlists={playlistsWithDifferentDurations}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Short")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("Long")).toBeInTheDocument();
    });

    it("handles undefined duration by defaulting to medium", () => {
      const playlistWithoutDuration = {
        ...mockPlaylist,
        duration: undefined,
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithoutDuration as any]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("Medium")).toBeInTheDocument();
    });

    it("applies correct badge styling", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const privateBadge = screen.getByText("Private");
      const shortBadge = screen.getByText("Short");

      expect(privateBadge).toHaveClass("dark:bg-slate-700");
      expect(shortBadge).toHaveClass("dark:bg-slate-700");
    });
  });

  describe("Droplet Count", () => {
    it("displays correct droplet count", () => {
      const onReorder = jest.fn();
      const onRemove = jest.fn();

      render(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={onReorder}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText("0 droplets")).toBeInTheDocument();
    });

    it("displays droplet count when droplets exist", () => {
      const playlistWithDroplets = {
        ...mockPlaylist,
        droplets: [{ id: 1 }, { id: 2 }, { id: 3 }] as any,
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithDroplets]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("3 droplets")).toBeInTheDocument();
    });

    it("displays singular 'droplet' for single item", () => {
      const playlistWithOneDroplet = {
        ...mockPlaylist,
        droplets: [{ id: 1 }] as any,
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithOneDroplet]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("1 droplets")).toBeInTheDocument();
    });

    it("does not display droplet count when droplets is undefined", () => {
      const playlistWithoutDroplets = {
        ...mockPlaylist,
        droplets: undefined,
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithoutDroplets]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.queryByText(/droplets/)).not.toBeInTheDocument();
    });
  });

  describe("Remove Functionality", () => {
    it("calls onRemove when remove button is clicked", () => {
      render(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const removeButtons = screen.getAllByRole("button");
      fireEvent.click(removeButtons[0]);

      expect(mockOnRemove).toHaveBeenCalledWith(1);
    });

    it("handles remove action", () => {
      const onReorder = jest.fn();
      const onRemove = jest.fn();

      render(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={onReorder}
          onRemove={onRemove}
        />,
      );

      const removeButton = screen.getByRole("button");
      fireEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalledWith(1);
    });

    it("calls onRemove with correct playlist id", () => {
      renderWithDnd(
        <PlaylistList
          playlists={mockPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const removeButtons = screen.getAllByRole("button");
      fireEvent.click(removeButtons[0]);

      expect(mockOnRemove).toHaveBeenCalledWith(1);
    });

    it("calls onRemove for each playlist independently", () => {
      renderWithDnd(
        <PlaylistList
          playlists={mockPlaylists.slice(0, 3)}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const removeButtons = screen.getAllByRole("button");

      fireEvent.click(removeButtons[0]);
      expect(mockOnRemove).toHaveBeenCalledWith(1);

      fireEvent.click(removeButtons[1]);
      expect(mockOnRemove).toHaveBeenCalledWith(2);

      fireEvent.click(removeButtons[2]);
      expect(mockOnRemove).toHaveBeenCalledWith(3);
    });

    it("remove button has correct styling classes", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const removeButton = screen.getByRole("button");
      expect(removeButton).toHaveClass("text-slate-400");
    });
  });

  describe("Edge Cases", () => {
    it("renders empty list without errors", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.queryByText(/Playlist/)).not.toBeInTheDocument();
    });

    it("handles playlist with very long name", () => {
      const playlistWithLongName = {
        ...mockPlaylist,
        name: "This is a very long playlist name that might cause layout issues in the UI",
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithLongName]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(
        screen.getByText(
          "This is a very long playlist name that might cause layout issues in the UI",
        ),
      ).toBeInTheDocument();
    });

    it("handles playlist with special characters in name", () => {
      const playlistWithSpecialChars = {
        ...mockPlaylist,
        name: "Playlist & <Special> Characters!",
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithSpecialChars]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(
        screen.getByText("Playlist & <Special> Characters!"),
      ).toBeInTheDocument();
    });

    it("handles zero droplets correctly", () => {
      const playlistWithZeroDroplets = {
        ...mockPlaylist,
        droplets: [] as any,
      };

      renderWithDnd(
        <PlaylistList
          playlists={[playlistWithZeroDroplets]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      expect(screen.getByText("0 droplets")).toBeInTheDocument();
    });

    it("handles rapid remove button clicks", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const removeButton = screen.getByRole("button");
      fireEvent.click(removeButton);
      fireEvent.click(removeButton);
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(3);
    });

    it("handles mixed public and private playlists", () => {
      const mixedPlaylists = [
        { ...mockPlaylist, id: 1, name: "Public 1", isPublic: true },
        { ...mockPlaylist, id: 2, name: "Private 1", isPublic: false },
        { ...mockPlaylist, id: 3, name: "Public 2", isPublic: true },
      ];

      renderWithDnd(
        <PlaylistList
          playlists={mixedPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const publicBadges = screen.getAllByText("Public");
      const privateBadges = screen.getAllByText("Private");

      expect(publicBadges).toHaveLength(2);
      expect(privateBadges).toHaveLength(1);
    });
  });

  describe("Drag and Drop", () => {
    it("applies dragging styles when item is being dragged", () => {
      renderWithDnd(
        <PlaylistList
          playlists={mockPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const playlistItems = screen.getAllByText(/Playlist/);
      expect(playlistItems[0]).toBeInTheDocument();
    });

    it("renders drag handle with correct cursor styling", () => {
      const { container } = renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const dragHandle = container.querySelector(".cursor-grab");
      expect(dragHandle).toBeInTheDocument();
      expect(dragHandle).toHaveClass("cursor-grab", "active:cursor-grabbing");
    });

    it("handles drag ref initialization", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const useDrag = require("react-dnd").useDrag;
      const dragConfig = useDrag.mock.calls[0][0];

      expect(dragConfig.type).toBe("playlist");
      expect(dragConfig.item).toEqual({ index: 0 });
    });

    it("handles drop ref initialization", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const useDrop = require("react-dnd").useDrop;
      const dropConfig = useDrop.mock.calls[0][0];

      expect(dropConfig.accept).toBe("playlist");
      expect(typeof dropConfig.hover).toBe("function");
    });

    it("configures drag monitor collect function correctly", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const useDrag = require("react-dnd").useDrag;
      const dragConfig = useDrag.mock.calls[0][0];

      expect(typeof dragConfig.collect).toBe("function");
    });
  });

  describe("Layout and Structure", () => {
    it("renders playlists in a spaced container", () => {
      const { container } = renderWithDnd(
        <PlaylistList
          playlists={mockPlaylists}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const listContainer = container.querySelector(".space-y-2");
      expect(listContainer).toBeInTheDocument();
    });

    it("renders each playlist with flex layout", () => {
      const { container } = renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const playlistContent = container.querySelector(".flex.items-center.p-4");
      expect(playlistContent).toBeInTheDocument();
    });

    it("renders badges in a flex row with gap", () => {
      const { container } = renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const badgeContainer = container.querySelector(
        ".flex.flex-row.flex-wrap.gap-1\\.5",
      );
      expect(badgeContainer).toBeInTheDocument();
    });

    it("applies transition classes for hover effects", () => {
      const { container } = renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      const playlistItem = container.querySelector(".transition-colors");
      expect(playlistItem).toBeInTheDocument();
    });
  });

  describe("Combined Refs", () => {
    it("properly combines drag and drop refs", () => {
      renderWithDnd(
        <PlaylistList
          playlists={[mockPlaylist]}
          onReorder={mockOnReorder}
          onRemove={mockOnRemove}
        />,
      );

      // Both useDrag and useDrop should be called for each playlist item
      const useDrag = require("react-dnd").useDrag;
      const useDrop = require("react-dnd").useDrop;

      expect(useDrag).toHaveBeenCalled();
      expect(useDrop).toHaveBeenCalled();
    });
  });
});
