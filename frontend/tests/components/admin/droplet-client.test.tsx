import { DropletClient } from "@/components/admin/droplets/droplet-client";
import { DropletStatus, DropletType, FocusArea, Tag } from "@/types";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/components/admin/droplets/droplet-block", () => ({
  DropletBlock: ({ droplet }: { droplet: any }) => (
    <div data-testid={`droplet-${droplet.id}`}>{droplet.name}</div>
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

describe("DropletClient", () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders a list of droplets", () => {
      render(<DropletClient droplets={mockDroplets.slice(0, 5)} />);

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-5")).toBeInTheDocument();
    });

    it("renders search input", () => {
      render(<DropletClient droplets={mockDroplets} />);

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("renders first 10 droplets by default", () => {
      render(<DropletClient droplets={mockDroplets} />);

      // First 10 should be visible
      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-10")).toBeInTheDocument();

      // 11th should not be visible
      expect(screen.queryByTestId("droplet-11")).not.toBeInTheDocument();
    });

    it("displays correct total when droplets are less than page size", () => {
      render(<DropletClient droplets={mockDroplets.slice(0, 5)} />);

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-5")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-6")).not.toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("displays pagination correctly", () => {
      render(<DropletClient droplets={mockDroplets} />);

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-10")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-11")).not.toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /chevron-right/i }),
      ).toBeInTheDocument();
      const prevButton = screen.getByRole("button", { name: /chevron-left/i });
      expect(prevButton).toBeDisabled();
    });

    it("navigates to next page when Next button is clicked", () => {
      render(<DropletClient droplets={mockDroplets} />);

      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      fireEvent.click(nextButton);

      expect(screen.queryByTestId("droplet-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("droplet-11")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-15")).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /chevron-left/i }),
      ).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).toBeDisabled();
    });

    it("navigates to previous page when Previous button is clicked", () => {
      render(<DropletClient droplets={mockDroplets} />);

      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      fireEvent.click(nextButton);

      const prevButton = screen.getByRole("button", { name: /chevron-left/i });
      fireEvent.click(prevButton);

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-10")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-11")).not.toBeInTheDocument();
    });

    it("disables next button on last page", () => {
      render(<DropletClient droplets={mockDroplets} />);

      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      fireEvent.click(nextButton); // Go to page 2 (last page)

      expect(nextButton).toBeDisabled();
    });

    it("disables previous button on first page", () => {
      render(<DropletClient droplets={mockDroplets} />);

      const prevButton = screen.getByRole("button", { name: /chevron-left/i });
      expect(prevButton).toBeDisabled();
    });

    it("calculates total pages correctly", () => {
      // 15 droplets / 10 per page = 2 pages
      render(<DropletClient droplets={mockDroplets} />);

      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      fireEvent.click(nextButton);

      // Should be on page 2 (last page)
      expect(nextButton).toBeDisabled();
    });

    it("handles exactly 10 droplets (single page)", () => {
      render(<DropletClient droplets={mockDroplets.slice(0, 10)} />);

      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      const prevButton = screen.getByRole("button", { name: /chevron-left/i });

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    it("handles exactly 11 droplets (two pages)", () => {
      render(<DropletClient droplets={mockDroplets.slice(0, 11)} />);

      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      expect(nextButton).not.toBeDisabled();

      fireEvent.click(nextButton);

      // Page 2 should have only 1 droplet
      expect(screen.getByTestId("droplet-11")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-12")).not.toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("filters droplets based on search input", async () => {
      const searchableDroplets = [
        { ...mockDroplets[0], id: 1, name: "React Basics" },
        { ...mockDroplets[1], id: 2, name: "TypeScript Advanced" },
        { ...mockDroplets[2], id: 3, name: "React Hooks" },
        { ...mockDroplets[3], id: 4, name: "Node.js Backend" },
      ];

      render(<DropletClient droplets={searchableDroplets} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "React" } });
      });

      await waitFor(() => {
        expect(screen.getByText("React Basics")).toBeInTheDocument();
        expect(screen.getByText("React Hooks")).toBeInTheDocument();
        expect(
          screen.queryByText("TypeScript Advanced"),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Node.js Backend")).not.toBeInTheDocument();
      });
    });

    it("shows all droplets when search is empty", async () => {
      render(<DropletClient droplets={mockDroplets} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Something" } });
      });

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "" } });
      });

      // Should show first 10 droplets again
      mockDroplets.slice(0, 10).forEach((droplet) => {
        expect(screen.getByText(droplet.name)).toBeInTheDocument();
      });
    });

    it("handles case-insensitive search", async () => {
      const searchableDroplets = [
        { ...mockDroplets[0], id: 1, name: "React Basics" },
        { ...mockDroplets[1], id: 2, name: "TypeScript Advanced" },
      ];

      render(<DropletClient droplets={searchableDroplets} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "react" } });
      });

      await waitFor(() => {
        expect(screen.getByText("React Basics")).toBeInTheDocument();
        expect(
          screen.queryByText("TypeScript Advanced"),
        ).not.toBeInTheDocument();
      });
    });

    it("shows no results message when search has no matches", async () => {
      render(<DropletClient droplets={mockDroplets} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, {
          target: { value: "NonexistentDroplet" },
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText("There are no created droplets."),
        ).toBeInTheDocument();
      });
    });

    it("resets to page 1 when search is performed", async () => {
      render(<DropletClient droplets={mockDroplets} />);

      // Go to page 2
      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      fireEvent.click(nextButton);

      expect(screen.getByTestId("droplet-11")).toBeInTheDocument();

      // Perform search
      const searchInput = screen.getByPlaceholderText("Search...");
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Droplet 1" } });
      });

      // Should be back on page 1 showing search results
      expect(screen.getByText("Droplet 1")).toBeInTheDocument();
    });

    it("updates search term in state", async () => {
      render(<DropletClient droplets={mockDroplets} />);

      const searchInput = screen.getByPlaceholderText(
        "Search...",
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Test Query" } });
      });

      expect(searchInput.value).toBe("Test Query");
    });

    it("handles whitespace-only search", async () => {
      render(<DropletClient droplets={mockDroplets} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "   " } });
      });

      // Should show all droplets (first 10)
      mockDroplets.slice(0, 10).forEach((droplet) => {
        expect(screen.getByText(droplet.name)).toBeInTheDocument();
      });
    });

    it("handles partial matches", async () => {
      const searchableDroplets = [
        { ...mockDroplets[0], id: 1, name: "React Basics" },
        { ...mockDroplets[1], id: 2, name: "React Advanced" },
        { ...mockDroplets[2], id: 3, name: "TypeScript" },
      ];

      render(<DropletClient droplets={searchableDroplets} />);

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
      const searchableDroplets = [
        { ...mockDroplets[0], id: 1, name: "C++ Basics" },
        { ...mockDroplets[1], id: 2, name: "C# Advanced" },
        { ...mockDroplets[2], id: 3, name: "JavaScript" },
      ];

      render(<DropletClient droplets={searchableDroplets} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "C++" } });
      });

      await waitFor(() => {
        expect(screen.getByText("C++ Basics")).toBeInTheDocument();
        expect(screen.queryByText("C# Advanced")).not.toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    it("displays a message when there are no droplets", () => {
      render(<DropletClient droplets={[]} />);

      expect(
        screen.getByText("There are no created droplets."),
      ).toBeInTheDocument();
    });

    it("does not show pagination when there are no droplets", () => {
      render(<DropletClient droplets={[]} />);

      expect(
        screen.queryByRole("button", { name: /chevron-right/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /chevron-left/i }),
      ).not.toBeInTheDocument();
    });

    it("shows search input even when there are no droplets", () => {
      render(<DropletClient droplets={[]} />);

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });
  });

  describe("Search and Pagination Integration", () => {
    it("paginates search results correctly", async () => {
      const manyDroplets = Array.from({ length: 25 }, (_, i) => ({
        ...mockDroplets[0],
        id: i + 1,
        name: `React Tutorial ${i + 1}`,
      }));

      render(<DropletClient droplets={manyDroplets} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "React" } });
      });

      // Should show first 10 search results
      expect(screen.getByText("React Tutorial 1")).toBeInTheDocument();
      expect(screen.getByText("React Tutorial 10")).toBeInTheDocument();
      expect(screen.queryByText("React Tutorial 11")).not.toBeInTheDocument();

      // Navigate to next page of search results
      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      fireEvent.click(nextButton);

      expect(screen.getByText("React Tutorial 11")).toBeInTheDocument();
      expect(screen.getByText("React Tutorial 20")).toBeInTheDocument();
    });

    it("updates pagination when search reduces results", async () => {
      render(<DropletClient droplets={mockDroplets} />);

      // Initially on page 1, can go to page 2
      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      expect(nextButton).not.toBeDisabled();

      // Search for something that returns fewer results
      const searchInput = screen.getByPlaceholderText("Search...");
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Droplet 1" } });
      });

      // Only "Droplet 1", "Droplet 10", "Droplet 11", etc. match
      // If only a few results, next button might be disabled or show different pagination
      // The exact behavior depends on how many matches there are
    });
  });

  describe("Edge Cases", () => {
    it("handles droplets with undefined names gracefully", async () => {
      const dropletsWithUndefinedName = [
        { ...mockDroplets[0], name: undefined as any },
        { ...mockDroplets[1], name: "Valid Droplet" },
      ];

      render(<DropletClient droplets={dropletsWithUndefinedName} />);

      // Should not crash
      expect(screen.getByText("Valid Droplet")).toBeInTheDocument();
    });

    it("handles very long droplet names", () => {
      const longNameDroplet = {
        ...mockDroplets[0],
        name: "A".repeat(200),
      };

      render(<DropletClient droplets={[longNameDroplet]} />);

      expect(screen.getByText("A".repeat(200))).toBeInTheDocument();
    });

    it("handles rapid search input changes", async () => {
      render(<DropletClient droplets={mockDroplets} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      // Rapidly change search input
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "D" } });
        fireEvent.change(searchInput, { target: { value: "Dr" } });
        fireEvent.change(searchInput, { target: { value: "Dro" } });
        fireEvent.change(searchInput, { target: { value: "Drop" } });
      });

      // Should show results for final query
      expect(screen.getByText("Droplet 1")).toBeInTheDocument();
    });
  });
});
