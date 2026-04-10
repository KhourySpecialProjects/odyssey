import { fireEvent, render, screen } from "@testing-library/react";
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
  });

  it("renders member names and droplet names", () => {
    render(<GroupProgressGrid group={mockGroup} statuses={{}} />);
    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
  });

  it("shows navigation buttons when there are multiple pages", () => {
    const groupWithManyDroplets = {
      ...mockGroup,
      droplets: Array(10).fill({ id: 1, name: "Test Droplet", lessons: [] }),
    };

    render(<GroupProgressGrid group={groupWithManyDroplets} statuses={{}} />);
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  beforeEach(() => {
    mockedGetEnrollmentsByAuthorizedUser.mockResolvedValue([
      makeEnrollment({
        droplet: makeDroplet({ id: 1, lessons: [makeLesson({ id: 1 })] }),
        viewedLessons: [makeLesson({ id: 1 })],
      }),
    ]);
  });

  test("renders pagination controls correctly", () => {
    render(<GroupProgressGrid group={mockGroup} statuses={{}} />);

    expect(
      screen.getByRole("button", { name: /next page/i }),
    ).toBeInTheDocument();
  });

  test("handles empty group data", () => {
    const emptyGroup = {
      ...mockGroup,
      droplets: [],
      members: [],
    };

    render(<GroupProgressGrid group={emptyGroup} statuses={{}} />);

    expect(
      screen.getByText(/No droplets have been added/i),
    ).toBeInTheDocument();
  });

  const mockEnrollments = [
    makeEnrollment({
      droplet: makeDroplet({
        id: 1,
        lessons: [makeLesson({ id: 1 }), makeLesson({ id: 2 })],
      }),
      viewedLessons: [makeLesson({ id: 1 })],
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetEnrollmentsByAuthorizedUser.mockResolvedValue(mockEnrollments);
  });

  it("should handle pagination correctly", () => {
    render(<GroupProgressGrid group={mockGroup} statuses={{}} />);

    const nextButton = screen.getByLabelText("Next page");
    fireEvent.click(nextButton);
    expect(screen.getByText("Test Droplet 2")).toBeInTheDocument();

    const prevButton = screen.getByRole("button", { name: "" });
    fireEvent.click(prevButton);
    expect(screen.getByText("Test Droplet")).toBeInTheDocument();
  });
});
