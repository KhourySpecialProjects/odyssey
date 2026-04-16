import { render, screen } from "@testing-library/react";
import { GroupProgressGrid } from "@/components/group/group-progress-grid";
import { GroupSemester } from "@/types";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import {
  makeDroplet,
  makeEnrollment,
  makeLesson,
} from "@/lib/testing/mock-helpers";

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));

const mockedGetEnrollmentsByAuthorizedUser = jest.mocked(
  getEnrollmentsByAuthorizedUser,
);

describe("GroupProgressGrid", () => {
  const mockGroup = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "SPRING" as GroupSemester,
    droplets: [
      makeDroplet({
        id: 1,
        name: "Test Droplet",
        isHidden: false,
        slug: "test-droplet",
        type: "knowledge",
        focusArea: "personal",
        learningObjectives: [],
        status: "published",
      }),
      makeDroplet({
        id: 2,
        name: "Test Droplet 2",
        isHidden: false,
        slug: "test-droplet-2",
        type: "knowledge",
        focusArea: "personal",
        learningObjectives: [],
        status: "published",
      }),
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([
      {
        droplet: { id: 1, lessons: [{ id: 1 }] },
        viewedLessons: [{ id: 1 }],
      },
    ]);
  });

  it("renders member names and droplet names", () => {
    render(
      <GroupProgressGrid group={mockGroup} statuses={{}} voyageStatuses={{}} />,
    );
    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
  });

  it("renders the table header", () => {
    render(
      <GroupProgressGrid group={mockGroup} statuses={{}} voyageStatuses={{}} />,
    );
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  test("handles empty group data", () => {
    const emptyGroup = {
      ...mockGroup,
      droplets: [],
      members: [],
    };

    render(
      <GroupProgressGrid
        group={emptyGroup}
        statuses={{}}
        voyageStatuses={{}}
      />,
    );

    expect(
      screen.getByText(/No droplets have been added/i),
    ).toBeInTheDocument();
  });

  it("renders filter dropdown", () => {
    render(
      <GroupProgressGrid group={mockGroup} statuses={{}} voyageStatuses={{}} />,
    );
    expect(screen.getByText("Droplets — All")).toBeInTheDocument();
  });

  it("renders export button", () => {
    render(
      <GroupProgressGrid group={mockGroup} statuses={{}} voyageStatuses={{}} />,
    );
    expect(screen.getByText("Export")).toBeInTheDocument();
  });
});
