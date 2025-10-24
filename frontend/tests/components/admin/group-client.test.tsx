import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { GroupClient } from "@/components/admin/groups/group-client";
import { GroupSemester } from "@/types";

jest.mock("@/components/admin/groups/group-block", () => ({
  GroupBlock: ({ group }: { group: any }) => (
    <div data-testid={`group-${group.id}`}>{group.groupName}</div>
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

describe("GroupClient", () => {
  const mockGroups = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    groupName: `Group ${i + 1}`,
    slug: `group-${i + 1}`,
    isArchived: false,
    semester: "SPRING" as GroupSemester,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders a list of groups", () => {
      render(<GroupClient groups={mockGroups.slice(0, 5)} />);

      expect(screen.getByTestId("group-1")).toBeInTheDocument();
      expect(screen.getByTestId("group-5")).toBeInTheDocument();
    });

    it("renders search input", () => {
      render(<GroupClient groups={mockGroups} />);

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("renders first 10 groups by default", () => {
      render(<GroupClient groups={mockGroups} />);

      expect(screen.getByTestId("group-1")).toBeInTheDocument();
      expect(screen.getByTestId("group-10")).toBeInTheDocument();
      expect(screen.queryByTestId("group-11")).not.toBeInTheDocument();
    });

    it("displays correct total when groups are less than page size", () => {
      render(<GroupClient groups={mockGroups.slice(0, 5)} />);

      expect(screen.getByTestId("group-1")).toBeInTheDocument();
      expect(screen.getByTestId("group-5")).toBeInTheDocument();
      expect(screen.queryByTestId("group-6")).not.toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("displays pagination correctly", () => {
      render(<GroupClient groups={mockGroups} />);

      expect(screen.getByTestId("group-1")).toBeInTheDocument();
      expect(screen.getByTestId("group-10")).toBeInTheDocument();
      expect(screen.queryByTestId("group-11")).not.toBeInTheDocument();

      expect(screen.getByText("Next")).toBeInTheDocument();
      const prevButton = screen.getByText("Previous");
      expect(prevButton).toBeInTheDocument();
      expect(prevButton).toBeDisabled();
    });

    it("navigates to next page when Next button is clicked", () => {
      render(<GroupClient groups={mockGroups} />);

      fireEvent.click(screen.getByText("Next"));

      expect(screen.queryByTestId("group-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("group-11")).toBeInTheDocument();
      expect(screen.getByTestId("group-15")).toBeInTheDocument();

      expect(screen.getByText("Previous")).toBeInTheDocument();
      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).toBeDisabled();
    });

    it("navigates to previous page when Previous button is clicked", () => {
      render(<GroupClient groups={mockGroups} />);

      fireEvent.click(screen.getByText("Next"));
      fireEvent.click(screen.getByText("Previous"));

      expect(screen.getByTestId("group-1")).toBeInTheDocument();
      expect(screen.getByTestId("group-10")).toBeInTheDocument();
      expect(screen.queryByTestId("group-11")).not.toBeInTheDocument();
    });

    it("disables next button on last page", () => {
      render(<GroupClient groups={mockGroups} />);

      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);

      expect(nextButton).toBeDisabled();
    });

    it("disables previous button on first page", () => {
      render(<GroupClient groups={mockGroups} />);

      const prevButton = screen.getByText("Previous");
      expect(prevButton).toBeDisabled();
    });

    it("handles exactly 10 groups (single page)", () => {
      render(<GroupClient groups={mockGroups.slice(0, 10)} />);

      const nextButton = screen.getByText("Next");
      const prevButton = screen.getByText("Previous");

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    it("handles exactly 11 groups (two pages)", () => {
      render(<GroupClient groups={mockGroups.slice(0, 11)} />);

      const nextButton = screen.getByText("Next");
      expect(nextButton).not.toBeDisabled();

      fireEvent.click(nextButton);

      expect(screen.getByTestId("group-11")).toBeInTheDocument();
      expect(screen.queryByTestId("group-12")).not.toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("filters groups based on search input", async () => {
      const searchableGroups = [
        { ...mockGroups[0], id: 1, groupName: "React Study Group" },
        { ...mockGroups[1], id: 2, groupName: "TypeScript Learners" },
        { ...mockGroups[2], id: 3, groupName: "React Advanced" },
        { ...mockGroups[3], id: 4, groupName: "Node.js Backend" },
      ];

      render(<GroupClient groups={searchableGroups} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "React" } });
      });

      await waitFor(() => {
        expect(screen.getByText("React Study Group")).toBeInTheDocument();
        expect(screen.getByText("React Advanced")).toBeInTheDocument();
        expect(
          screen.queryByText("TypeScript Learners"),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Node.js Backend")).not.toBeInTheDocument();
      });
    });

    it("shows all groups when search is empty", async () => {
      render(<GroupClient groups={mockGroups} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Something" } });
      });

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "" } });
      });

      mockGroups.slice(0, 10).forEach((group) => {
        expect(screen.getByText(group.groupName)).toBeInTheDocument();
      });
    });

    it("handles case-insensitive search", async () => {
      const searchableGroups = [
        { ...mockGroups[0], id: 1, groupName: "React Study Group" },
        { ...mockGroups[1], id: 2, groupName: "TypeScript Learners" },
      ];

      render(<GroupClient groups={searchableGroups} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "react" } });
      });

      await waitFor(() => {
        expect(screen.getByText("React Study Group")).toBeInTheDocument();
        expect(
          screen.queryByText("TypeScript Learners"),
        ).not.toBeInTheDocument();
      });
    });

    it("shows no results message when search has no matches", async () => {
      render(<GroupClient groups={mockGroups} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, {
          target: { value: "NonexistentGroup" },
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText("There are no created groups."),
        ).toBeInTheDocument();
      });
    });

    it("resets to page 1 when search is performed", async () => {
      render(<GroupClient groups={mockGroups} />);

      // Go to page 2
      fireEvent.click(screen.getByText("Next"));
      expect(screen.getByTestId("group-11")).toBeInTheDocument();

      // Perform search
      const searchInput = screen.getByPlaceholderText("Search...");
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Group 1" } });
      });

      // Should be back on page 1 showing search results
      await waitFor(() => {
        expect(screen.getByText("Group 1")).toBeInTheDocument();
      });
    });

    it("updates search term in state", async () => {
      render(<GroupClient groups={mockGroups} />);

      const searchInput = screen.getByPlaceholderText(
        "Search...",
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Test Query" } });
      });

      expect(searchInput.value).toBe("Test Query");
    });

    it("handles whitespace-only search", async () => {
      render(<GroupClient groups={mockGroups} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "   " } });
      });

      mockGroups.slice(0, 10).forEach((group) => {
        expect(screen.getByText(group.groupName)).toBeInTheDocument();
      });
    });

    it("handles partial matches", async () => {
      const searchableGroups = [
        { ...mockGroups[0], id: 1, groupName: "React Basics" },
        { ...mockGroups[1], id: 2, groupName: "React Advanced" },
        { ...mockGroups[2], id: 3, groupName: "TypeScript" },
      ];

      render(<GroupClient groups={searchableGroups} />);

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
      const searchableGroups = [
        { ...mockGroups[0], id: 1, groupName: "C++ Study Group" },
        { ...mockGroups[1], id: 2, groupName: "C# Developers" },
        { ...mockGroups[2], id: 3, groupName: "JavaScript Learners" },
      ];

      render(<GroupClient groups={searchableGroups} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "C++" } });
      });

      await waitFor(() => {
        expect(screen.getByText("C++ Study Group")).toBeInTheDocument();
        expect(screen.queryByText("C# Developers")).not.toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    it("displays a message when there are no groups", () => {
      render(<GroupClient groups={[]} />);

      expect(
        screen.getByText("There are no created groups."),
      ).toBeInTheDocument();
    });

    it("does not show pagination when there are no groups", () => {
      render(<GroupClient groups={[]} />);

      expect(screen.queryByText("Next")).not.toBeInTheDocument();
      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    });

    it("shows search input even when there are no groups", () => {
      render(<GroupClient groups={[]} />);

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });
  });

  describe("Search and Pagination Integration", () => {
    it("paginates search results correctly", async () => {
      const manyGroups = Array.from({ length: 25 }, (_, i) => ({
        ...mockGroups[0],
        id: i + 1,
        groupName: `React Tutorial ${i + 1}`,
      }));

      render(<GroupClient groups={manyGroups} />);

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
    it("handles groups with undefined names gracefully", async () => {
      const groupsWithUndefinedName = [
        { ...mockGroups[0], groupName: undefined as any },
        { ...mockGroups[1], groupName: "Valid Group" },
      ];

      render(<GroupClient groups={groupsWithUndefinedName} />);

      expect(screen.getByText("Valid Group")).toBeInTheDocument();
    });

    it("handles very long group names", () => {
      const longNameGroup = {
        ...mockGroups[0],
        groupName: "A".repeat(200),
      };

      render(<GroupClient groups={[longNameGroup]} />);

      expect(screen.getByText("A".repeat(200))).toBeInTheDocument();
    });

    it("handles rapid search input changes", async () => {
      render(<GroupClient groups={mockGroups} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "G" } });
        fireEvent.change(searchInput, { target: { value: "Gr" } });
        fireEvent.change(searchInput, { target: { value: "Gro" } });
        fireEvent.change(searchInput, { target: { value: "Grou" } });
      });

      expect(screen.getByText("Group 1")).toBeInTheDocument();
    });
  });

  describe("Button Visibility Classes", () => {
    it("applies visibility hidden class to Previous button on first page", () => {
      render(<GroupClient groups={mockGroups} />);

      const prevButton = screen.getByText("Previous");
      expect(prevButton).toHaveClass("visibility: hidden");
    });

    it("applies visibility visible class to Next button when not on last page", () => {
      render(<GroupClient groups={mockGroups} />);

      const nextButton = screen.getByText("Next");
      expect(nextButton).toHaveClass("visibility: visible");
    });

    it("applies visibility hidden class to Next button on last page", () => {
      render(<GroupClient groups={mockGroups} />);

      fireEvent.click(screen.getByText("Next"));

      const nextButton = screen.getByText("Next");
      expect(nextButton).toHaveClass("visibility: hidden");
    });
  });
});
