import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { PlaylistClient } from "@/components/admin/playlists/playlist-client";

jest.mock("@/components/admin/playlists/playlist-block", () => ({
  PlaylistBlock: ({ playlist }: { playlist: any }) => (
    <div data-testid={`playlist-${playlist.id}`}>{playlist.name}</div>
  ),
}));

// Mock lodash debounce to execute immediately in tests
jest.mock("lodash", () => {
  const actual = jest.requireActual("lodash");
  return {
    ...actual,
    debounce: (fn: any) => {
      const debounced = fn;
      debounced.cancel = jest.fn();
      return debounced;
    },
  };
});

describe("PlaylistClient", () => {
  const mockPlaylists = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    name: `Playlist ${i + 1}`,
    slug: `playlist-${i + 1}`,
    isPublic: i % 2 === 0,
    droplets: [],
    authors: [],
    duration: "short" as "short" | "medium" | "long",
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders a list of playlists", () => {
      render(<PlaylistClient playlists={mockPlaylists.slice(0, 5)} />);

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-5")).toBeInTheDocument();
    });

    it("renders search input", () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("renders first 10 playlists by default", () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-10")).toBeInTheDocument();
      expect(screen.queryByTestId("playlist-11")).not.toBeInTheDocument();
    });

    it("displays correct total when playlists are less than page size", () => {
      render(<PlaylistClient playlists={mockPlaylists.slice(0, 5)} />);

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-5")).toBeInTheDocument();
      expect(screen.queryByTestId("playlist-6")).not.toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("displays pagination correctly", () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-10")).toBeInTheDocument();
      expect(screen.queryByTestId("playlist-11")).not.toBeInTheDocument();

      expect(screen.getByText("Next")).toBeInTheDocument();
      const prevButton = screen.getByText("Previous");
      expect(prevButton).toBeInTheDocument();
      expect(prevButton).toBeDisabled();
    });

    it("navigates to next page when Next button is clicked", () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      fireEvent.click(screen.getByText("Next"));

      expect(screen.queryByTestId("playlist-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("playlist-11")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-15")).toBeInTheDocument();

      expect(screen.getByText("Previous")).toBeInTheDocument();
      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).toBeDisabled();
    });

    it("navigates to previous page when Previous button is clicked", () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      fireEvent.click(screen.getByText("Next"));
      fireEvent.click(screen.getByText("Previous"));

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-10")).toBeInTheDocument();
      expect(screen.queryByTestId("playlist-11")).not.toBeInTheDocument();
    });

    it("disables next button on last page", () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);

      expect(nextButton).toBeDisabled();
    });

    it("disables previous button on first page", () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      const prevButton = screen.getByText("Previous");
      expect(prevButton).toBeDisabled();
    });

    it("handles exactly 10 playlists (single page)", () => {
      render(<PlaylistClient playlists={mockPlaylists.slice(0, 10)} />);

      const nextButton = screen.getByText("Next");
      const prevButton = screen.getByText("Previous");

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    it("handles exactly 11 playlists (two pages)", () => {
      render(<PlaylistClient playlists={mockPlaylists.slice(0, 11)} />);

      const nextButton = screen.getByText("Next");
      expect(nextButton).not.toBeDisabled();

      fireEvent.click(nextButton);

      expect(screen.getByTestId("playlist-11")).toBeInTheDocument();
      expect(screen.queryByTestId("playlist-12")).not.toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("filters playlists based on search input", async () => {
      const searchablePlaylists = [
        { ...mockPlaylists[0], id: 1, name: "React Learning Path" },
        { ...mockPlaylists[1], id: 2, name: "TypeScript Mastery" },
        { ...mockPlaylists[2], id: 3, name: "React Advanced Topics" },
        { ...mockPlaylists[3], id: 4, name: "Node.js Backend" },
      ];

      render(<PlaylistClient playlists={searchablePlaylists} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "React" } });
      });

      await waitFor(() => {
        expect(screen.getByText("React Learning Path")).toBeInTheDocument();
        expect(screen.getByText("React Advanced Topics")).toBeInTheDocument();
        expect(
          screen.queryByText("TypeScript Mastery"),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Node.js Backend")).not.toBeInTheDocument();
      });
    });

    it("shows all playlists when search is empty", async () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Something" } });
      });

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "" } });
      });

      mockPlaylists.slice(0, 10).forEach((playlist) => {
        expect(screen.getByText(playlist.name)).toBeInTheDocument();
      });
    });

    it("handles case-insensitive search", async () => {
      const searchablePlaylists = [
        { ...mockPlaylists[0], id: 1, name: "React Learning Path" },
        { ...mockPlaylists[1], id: 2, name: "TypeScript Mastery" },
      ];

      render(<PlaylistClient playlists={searchablePlaylists} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "react" } });
      });

      await waitFor(() => {
        expect(screen.getByText("React Learning Path")).toBeInTheDocument();
        expect(
          screen.queryByText("TypeScript Mastery"),
        ).not.toBeInTheDocument();
      });
    });

    it("shows no results message when search has no matches", async () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, {
          target: { value: "NonexistentPlaylist" },
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText("There are no created playlists."),
        ).toBeInTheDocument();
      });
    });

    it("resets to page 1 when search is performed", async () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      // Go to page 2
      fireEvent.click(screen.getByText("Next"));
      expect(screen.getByTestId("playlist-11")).toBeInTheDocument();

      // Perform search
      const searchInput = screen.getByPlaceholderText("Search...");
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Playlist 1" } });
      });

      // Should be back on page 1 showing search results
      await waitFor(() => {
        expect(screen.getByText("Playlist 1")).toBeInTheDocument();
      });
    });

    it("updates search term in state", async () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      const searchInput = screen.getByPlaceholderText(
        "Search...",
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Test Query" } });
      });

      expect(searchInput.value).toBe("Test Query");
    });

    it("handles whitespace-only search", async () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "   " } });
      });

      mockPlaylists.slice(0, 10).forEach((playlist) => {
        expect(screen.getByText(playlist.name)).toBeInTheDocument();
      });
    });

    it("handles partial matches", async () => {
      const searchablePlaylists = [
        { ...mockPlaylists[0], id: 1, name: "React Basics" },
        { ...mockPlaylists[1], id: 2, name: "React Advanced" },
        { ...mockPlaylists[2], id: 3, name: "TypeScript" },
      ];

      render(<PlaylistClient playlists={searchablePlaylists} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Reac" } });
      });

      await waitFor(() => {
        expect(screen.getByText("React Basics")).toBeInTheDocument();
        expect(screen.getByText("React Advanced")).toBeInTheDocument();
        expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
      });
    });

    it("handles search with special characters", async () => {
      const searchablePlaylists = [
        { ...mockPlaylists[0], id: 1, name: "C++ Programming" },
        { ...mockPlaylists[1], id: 2, name: "C# Development" },
        { ...mockPlaylists[2], id: 3, name: "JavaScript Basics" },
      ];

      render(<PlaylistClient playlists={searchablePlaylists} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "C++" } });
      });

      await waitFor(() => {
        expect(screen.getByText("C++ Programming")).toBeInTheDocument();
        expect(screen.queryByText("C# Development")).not.toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    it("displays a message when there are no playlists", () => {
      render(<PlaylistClient playlists={[]} />);

      expect(
        screen.getByText("There are no created playlists."),
      ).toBeInTheDocument();
    });

    it("does not show pagination when there are no playlists", () => {
      render(<PlaylistClient playlists={[]} />);

      expect(screen.queryByText("Next")).not.toBeInTheDocument();
      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    });

    it("shows search input even when there are no playlists", () => {
      render(<PlaylistClient playlists={[]} />);

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });
  });

  describe("Search and Pagination Integration", () => {
    it("paginates search results correctly", async () => {
      const manyPlaylists = Array.from({ length: 25 }, (_, i) => ({
        ...mockPlaylists[0],
        id: i + 1,
        name: `React Tutorial ${i + 1}`,
      }));

      render(<PlaylistClient playlists={manyPlaylists} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "React" } });
      });

      await waitFor(() => {
        expect(screen.getByText("React Tutorial 1")).toBeInTheDocument();
        expect(screen.getByText("React Tutorial 10")).toBeInTheDocument();
        expect(screen.queryByText("React Tutorial 11")).not.toBeInTheDocument();
      });

      // Navigate to next page of search results
      fireEvent.click(screen.getByText("Next"));

      expect(screen.getByText("React Tutorial 11")).toBeInTheDocument();
      expect(screen.getByText("React Tutorial 20")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles playlists with undefined names gracefully", async () => {
      const playlistsWithUndefinedName = [
        { ...mockPlaylists[0], name: undefined as any },
        { ...mockPlaylists[1], name: "Valid Playlist" },
      ];

      render(<PlaylistClient playlists={playlistsWithUndefinedName} />);

      expect(screen.getByText("Valid Playlist")).toBeInTheDocument();
    });

    it("handles very long playlist names", () => {
      const longNamePlaylist = {
        ...mockPlaylists[0],
        name: "A".repeat(200),
      };

      render(<PlaylistClient playlists={[longNamePlaylist]} />);

      expect(screen.getByText("A".repeat(200))).toBeInTheDocument();
    });

    it("handles rapid search input changes", async () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "P" } });
        fireEvent.change(searchInput, { target: { value: "Pl" } });
        fireEvent.change(searchInput, { target: { value: "Pla" } });
        fireEvent.change(searchInput, { target: { value: "Play" } });
      });

      expect(screen.getByText("Playlist 1")).toBeInTheDocument();
    });

    it("handles playlists with different durations", () => {
      const mixedDurationPlaylists = [
        { ...mockPlaylists[0], duration: "short" as const },
        { ...mockPlaylists[1], duration: "medium" as const },
        { ...mockPlaylists[2], duration: "long" as const },
      ];

      render(<PlaylistClient playlists={mixedDurationPlaylists} />);

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-2")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-3")).toBeInTheDocument();
    });

    it("handles mix of public and private playlists", () => {
      const mixedVisibilityPlaylists = [
        { ...mockPlaylists[0], isPublic: true },
        { ...mockPlaylists[1], isPublic: false },
      ];

      render(<PlaylistClient playlists={mixedVisibilityPlaylists} />);

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-2")).toBeInTheDocument();
    });
  });

  describe("Button Visibility Classes", () => {
    it("applies visibility hidden class to Previous button on first page", () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      const prevButton = screen.getByText("Previous");
      expect(prevButton).toHaveClass("visibility: hidden");
    });

    it("applies visibility visible class to Next button when not on last page", () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      const nextButton = screen.getByText("Next");
      expect(nextButton).toHaveClass("visibility: visible");
    });

    it("applies visibility hidden class to Next button on last page", () => {
      render(<PlaylistClient playlists={mockPlaylists} />);

      fireEvent.click(screen.getByText("Next"));

      const nextButton = screen.getByText("Next");
      expect(nextButton).toHaveClass("visibility: hidden");
    });
  });
});
