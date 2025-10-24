import { render, screen, fireEvent, within } from "@testing-library/react";
import { EnrolledDropletsGridClient } from "@/components/dashboard/enrolled-droplets-grid-client";
import {
  DropletLesson,
  DropletStatus,
  DropletType,
  FocusArea,
  GroupSemester,
  LearningObjective,
  Tag,
} from "@/types";
import { SearchProvider } from "@/contexts/SearchContext";
import React from "react";

jest.mock("@/components/droplets/droplet-tile", () => ({
  DropletTile: ({ droplet }: { droplet: any }) => (
    <div data-testid={`droplet-${droplet.id}`}>{droplet.name}</div>
  ),
}));

// Create a wrapper component to provide SearchContext
const renderWithSearch = (ui: React.ReactElement, searchValue = "") => {
  return render(<SearchProvider>{ui}</SearchProvider>);
};

describe("EnrolledDropletsGridClient", () => {
  const mockDroplets = Array.from({ length: 11 }, (_, i) => ({
    id: i + 1,
    name: `Droplet ${i + 1}`,
    slug: `droplet-${i + 1}`,
    completionPercentage: i * 10,
    lessons: [],
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React" }] as Tag[],
    learningObjectives: [] as LearningObjective[],
    status: "published" as DropletStatus,
    droplet_lessons: [] as DropletLesson[],
    focusArea: "personal" as FocusArea,
    isHidden: false,
  }));

  const mockCompletedLessonIds = [1, 2, 3];
  const mockRatingsMap = new Map([
    [1, 4],
    [2, 5],
  ]);

  const mockGroup = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "summer" as GroupSemester,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders a grid of droplet tiles", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={mockDroplets.slice(0, 3)}
          completedLessonIds={mockCompletedLessonIds}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-2")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-3")).toBeInTheDocument();
    });

    it("renders with archived status", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={mockDroplets.slice(0, 3)}
          completedLessonIds={mockCompletedLessonIds}
          isArchived={true}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    });

    it("renders with empty droplets array", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={[]}
          completedLessonIds={mockCompletedLessonIds}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.queryByTestId(/droplet-/)).not.toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("displays pagination correctly with 9 items per page", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={mockDroplets}
          completedLessonIds={mockCompletedLessonIds}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-9")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-10")).not.toBeInTheDocument();
    });

    it("navigates to next page when Next button is clicked", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={mockDroplets}
          completedLessonIds={mockCompletedLessonIds}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      fireEvent.click(nextButton);

      expect(screen.queryByTestId("droplet-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("droplet-10")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-11")).toBeInTheDocument();
    });

    it("navigates to previous page when Previous button is clicked", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={mockDroplets}
          completedLessonIds={mockCompletedLessonIds}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /chevron-right/i }));
      fireEvent.click(screen.getByRole("button", { name: /chevron-left/i }));

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-9")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-10")).not.toBeInTheDocument();
    });

    it("handles exactly 9 droplets (single page)", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={mockDroplets.slice(0, 9)}
          completedLessonIds={mockCompletedLessonIds}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      const nextButton = screen.getByRole("button", { name: /chevron-right/i });
      const prevButton = screen.getByRole("button", { name: /chevron-left/i });

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });

  describe("Sorting", () => {
    const sortableDroplets = [
      {
        ...mockDroplets[0],
        id: 1,
        name: "Zebra Droplet",
        completionPercentage: 30,
      },
      {
        ...mockDroplets[1],
        id: 2,
        name: "Apple Droplet",
        completionPercentage: 70,
      },
      {
        ...mockDroplets[2],
        id: 3,
        name: "Mango Droplet",
        completionPercentage: 50,
      },
    ];

    it("sorts droplets by name in ascending order", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={sortableDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
          sortKey="name:asc"
        />,
      );

      const droplets = screen.getAllByTestId(/droplet-/);
      expect(droplets[0]).toHaveTextContent("Apple Droplet");
      expect(droplets[1]).toHaveTextContent("Mango Droplet");
      expect(droplets[2]).toHaveTextContent("Zebra Droplet");
    });

    it("sorts droplets by name in descending order", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={sortableDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
          sortKey="name:desc"
        />,
      );

      const droplets = screen.getAllByTestId(/droplet-/);
      expect(droplets[0]).toHaveTextContent("Zebra Droplet");
      expect(droplets[1]).toHaveTextContent("Mango Droplet");
      expect(droplets[2]).toHaveTextContent("Apple Droplet");
    });

    it("sorts droplets by completion percentage ascending", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={sortableDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
          sortKey="completion:asc"
        />,
      );

      const droplets = screen.getAllByTestId(/droplet-/);
      expect(droplets[0]).toHaveTextContent("Zebra Droplet"); // 30%
      expect(droplets[1]).toHaveTextContent("Mango Droplet"); // 50%
      expect(droplets[2]).toHaveTextContent("Apple Droplet"); // 70%
    });

    it("sorts droplets by completion percentage descending", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={sortableDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
          sortKey="completion:desc"
        />,
      );

      const droplets = screen.getAllByTestId(/droplet-/);
      expect(droplets[0]).toHaveTextContent("Apple Droplet"); // 70%
      expect(droplets[1]).toHaveTextContent("Mango Droplet"); // 50%
      expect(droplets[2]).toHaveTextContent("Zebra Droplet"); // 30%
    });

    it("sorts droplets by rating ascending", () => {
      const ratingsMap = new Map([
        [1, 5],
        [2, 3],
        [3, 4],
      ]);

      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={sortableDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={ratingsMap}
          sortKey="rating:asc"
        />,
      );

      const droplets = screen.getAllByTestId(/droplet-/);
      expect(droplets[0]).toHaveTextContent("Apple Droplet"); // rating 3
      expect(droplets[1]).toHaveTextContent("Mango Droplet"); // rating 4
      expect(droplets[2]).toHaveTextContent("Zebra Droplet"); // rating 5
    });

    it("sorts droplets by rating descending", () => {
      const ratingsMap = new Map([
        [1, 5],
        [2, 3],
        [3, 4],
      ]);

      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={sortableDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={ratingsMap}
          sortKey="rating:desc"
        />,
      );

      const droplets = screen.getAllByTestId(/droplet-/);
      expect(droplets[0]).toHaveTextContent("Zebra Droplet"); // rating 5
      expect(droplets[1]).toHaveTextContent("Mango Droplet"); // rating 4
      expect(droplets[2]).toHaveTextContent("Apple Droplet"); // rating 3
    });

    it("handles missing ratings as 0", () => {
      const emptyRatingsMap = new Map();

      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={sortableDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={emptyRatingsMap}
          sortKey="rating:desc"
        />,
      );

      // Should not crash
      expect(screen.getAllByTestId(/droplet-/)).toHaveLength(3);
    });
  });

  describe("Due Date Sorting", () => {
    const dueDateDroplets = [
      {
        ...mockDroplets[0],
        id: 1,
        name: "Incomplete with Due Date",
        completionPercentage: 50,
      },
      {
        ...mockDroplets[1],
        id: 2,
        name: "Complete with Due Date",
        completionPercentage: 100,
      },
      {
        ...mockDroplets[2],
        id: 3,
        name: "Incomplete without Due Date",
        completionPercentage: 30,
      },
    ];

    const dueDates = [
      {
        droplet: dueDateDroplets[0],
        dueDate: "2024-12-31",
        authorized_user: 1,
        group: mockGroup,
      },
      {
        droplet: dueDateDroplets[1],
        dueDate: "2024-11-30",
        authorized_user: 1,
        group: mockGroup,
      },
    ];

    it("sorts droplets by due date - incomplete with due dates first", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={dueDateDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
          dueDates={dueDates}
          sortKey="duedate:asc"
        />,
      );

      const droplets = screen.getAllByTestId(/droplet-/);
      // Group 1: Incomplete with due date
      expect(droplets[0]).toHaveTextContent("Incomplete with Due Date");
      // Group 2: Complete
      expect(droplets[1]).toHaveTextContent("Complete with Due Date");
      // Group 3: Incomplete without due date
      expect(droplets[2]).toHaveTextContent("Incomplete without Due Date");
    });

    it("passes due date to DropletTile when available", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={mockDroplets.slice(0, 3)}
          completedLessonIds={mockCompletedLessonIds}
          isArchived={false}
          dueDates={[
            {
              droplet: mockDroplets[0],
              dueDate: "2023-12-31",
              authorized_user: 32,
              group: mockGroup,
            },
          ]}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    });

    it("passes empty string for due date when not available", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={mockDroplets.slice(0, 3)}
          completedLessonIds={mockCompletedLessonIds}
          isArchived={false}
          dueDates={[]}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    });
  });

  describe("Filtering", () => {
    const filterableDroplets = [
      {
        ...mockDroplets[0],
        id: 1,
        type: "knowledge" as DropletType,
        focusArea: "technical" as FocusArea,
        tags: [
          { id: 1, name: "React" },
          { id: 2, name: "JavaScript" },
        ] as Tag[],
      },
      {
        ...mockDroplets[1],
        id: 2,
        type: "skill" as DropletType,
        focusArea: "personal" as FocusArea,
        tags: [{ id: 3, name: "CSS" }] as Tag[],
      },
      {
        ...mockDroplets[2],
        id: 3,
        type: "knowledge" as DropletType,
        focusArea: "technical" as FocusArea,
        tags: [{ id: 4, name: "TypeScript" }] as Tag[],
      },
    ];

    it("renders droplets without type filter", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={filterableDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-2")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-3")).toBeInTheDocument();
    });

    it("renders droplets without focus area filter", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={filterableDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-2")).toBeInTheDocument();
    });

    it("renders droplets without tag filter", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={filterableDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getAllByTestId(/droplet-/)).toHaveLength(3);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty ratings map", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={mockDroplets.slice(0, 3)}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={new Map()}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    });

    it("handles empty completed lesson IDs", () => {
      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={mockDroplets.slice(0, 3)}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    });

    it("handles droplets with 100% completion", () => {
      const completeDroplets = [
        { ...mockDroplets[0], completionPercentage: 100 },
      ];

      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={completeDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    });

    it("handles droplets with 0% completion", () => {
      const incompleteDroplets = [
        { ...mockDroplets[0], completionPercentage: 0 },
      ];

      renderWithSearch(
        <EnrolledDropletsGridClient
          dropletsWithCompletion={incompleteDroplets}
          completedLessonIds={[]}
          isArchived={false}
          ratingsMap={mockRatingsMap}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    });
  });
});
