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

jest.mock("@/components/droplets/droplet-tile", () => ({
  DropletTile: ({ droplet }: { droplet: any }) => (
    <div data-testid={`droplet-${droplet.id}`}>
      {droplet.name} - {droplet.completionPercentage.toFixed(0)}%
    </div>
  ),
}));

describe("EnrolledDropletsGridClient", () => {
  const mockDroplets = Array.from({ length: 12 }, (_, i) => ({
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

  it("renders a grid of droplet tiles", () => {
    render(
      <EnrolledDropletsGridClient
        dropletsWithCompletion={mockDroplets.slice(0, 3)}
        completedLessonIds={mockCompletedLessonIds}
        isArchived={false}
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
      />,
    );

    const nextButton = screen.getByRole("button", { name: /chevron-right/i });
    fireEvent.click(nextButton);

    expect(screen.queryByTestId("droplet-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("droplet-10")).toBeInTheDocument();
    expect(screen.getByTestId("droplet-12")).toBeInTheDocument();
  });

  it("navigates to previous page when Previous button is clicked", () => {
    render(
      <EnrolledDropletsGridClient
        dropletsWithCompletion={mockDroplets}
        completedLessonIds={mockCompletedLessonIds}
        isArchived={false}
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
      />,
    );

    expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
  });
});
