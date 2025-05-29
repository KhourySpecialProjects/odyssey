import { render, screen, fireEvent } from "@testing-library/react";
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

jest.mock("@/components/droplets/droplet-tile", () => ({
  DropletTile: ({ droplet }: { droplet: any }) => (
    <div data-testid={`droplet-${droplet.id}`}>{droplet.name}</div>
  ),
}));

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

  it("renders a grid of droplet tiles", () => {
    render(
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

  it("displays pagination correctly", () => {
    render(
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

    expect(
      screen.getByRole("button", { name: /chevron-right/i }),
    ).toBeInTheDocument();
  });

  it("navigates to next page when Next button is clicked", () => {
    render(
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
    render(
      <EnrolledDropletsGridClient
        dropletsWithCompletion={mockDroplets}
        completedLessonIds={mockCompletedLessonIds}
        isArchived={false}
        ratingsMap={mockRatingsMap}
      />,
    );

    const nextButton = screen.getByRole("button", { name: /chevron-right/i });
    fireEvent.click(nextButton);

    const prevButton = screen.getByRole("button", { name: /chevron-left/i });
    fireEvent.click(prevButton);

    expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    expect(screen.getByTestId("droplet-9")).toBeInTheDocument();
    expect(screen.queryByTestId("droplet-10")).not.toBeInTheDocument();
  });

  it("passes due date to DropletTile when available", () => {
    const mockGroups = [
      {
        id: 1,
        groupName: "Test Group",
        slug: "test-group",
        isArchived: false,
        semester: "summer" as GroupSemester,
      },
    ];
    const mockDueDates = [
      {
        droplet: mockDroplets[0],
        dueDate: "2023-12-31",
        authorized_user: 32,
        group: mockGroups[0],
      },
    ];

    render(
      <EnrolledDropletsGridClient
        dropletsWithCompletion={mockDroplets.slice(0, 3)}
        completedLessonIds={mockCompletedLessonIds}
        isArchived={false}
        dueDates={mockDueDates}
        ratingsMap={mockRatingsMap}
      />,
    );

    expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
  });

  describe("EnrolledDropletsGridClient", () => {
    const mockDroplets2 = [
      {
        id: 1,
        name: "Droplet 1",
        slug: "droplet-1",
        focusArea: "programming" as FocusArea,
        tags: [{ name: "javascript" }] as Tag[],
        completionPercentage: 50,
        lessons: [],
        type: "knowledge" as DropletType,
        learningObjectives: [] as LearningObjective[],
        status: "published" as DropletStatus,
        droplet_lessons: [] as DropletLesson[],
        isHidden: false,
      },
      {
        id: 2,
        name: " Droplet 2",
        slug: "droplet-2",
        focusArea: "design" as FocusArea,
        tags: [{ name: "css" }] as Tag[],
        completionPercentage: 75,
        lessons: [],
        type: "knowledge" as DropletType,
        learningObjectives: [] as LearningObjective[],
        status: "published" as DropletStatus,
        droplet_lessons: [] as DropletLesson[],
        isHidden: false,
      },
    ];

    const defaultProps = {
      dropletsWithCompletion: mockDroplets2,
      completedLessonIds: [],
      isArchived: false,
      ratingsMap: mockRatingsMap,
    };

    it("sorts droplets by name in ascending order", () => {
      render(
        <SearchProvider>
          <EnrolledDropletsGridClient {...defaultProps} sortKey="name:asc" />
        </SearchProvider>,
      );

      const droplets = screen.getAllByText(/Droplet/);
      expect(droplets[0]).toHaveTextContent("Droplet 2");
      expect(droplets[1]).toHaveTextContent("Droplet 1");
    });

    it("sorts droplets by completion percentage", () => {
      render(
        <SearchProvider>
          <EnrolledDropletsGridClient
            {...defaultProps}
            sortKey="completion:desc"
          />
        </SearchProvider>,
      );

      const droplets = screen.getAllByText(/Droplet/);
      expect(droplets[0]).toHaveTextContent("Droplet 2");
      expect(droplets[1]).toHaveTextContent("Droplet 1");
    });

    it("sorts droplets by rating", () => {
      render(
        <SearchProvider>
          <EnrolledDropletsGridClient {...defaultProps} sortKey="rating:desc" />
        </SearchProvider>,
      );

      const droplets = screen.getAllByText(/Droplet/);
      expect(droplets[0]).toHaveTextContent("Droplet 2");
      expect(droplets[1]).toHaveTextContent("Droplet 1");
    });
  });
});
