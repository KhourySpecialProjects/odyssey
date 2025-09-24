import { render, screen, fireEvent } from "@testing-library/react";
import {
  DropletLesson,
  DropletStatus,
  DropletType,
  FocusArea,
  GroupSemester,
  LearningObjective,
  Tag,
  TimeZone,
} from "@/types";
import { GroupDashboard } from "@/components/group/group-management-dashboard";

describe("GroupDashboard", () => {
  const mockGroup = {
    id: 1,
    slug: "test-group",
    creator: { id: 1, name: "Test Creator" },
    admins: [{ id: 2, name: "Test Admin" }],
    managers: [{ id: 3, name: "Test Manager" }],
    members: [{ id: 1 }, { id: 2 }, { id: 3 }],
    semester: "Spring 2024" as GroupSemester,
    description: "Test group description",
    groupName: "test group",
    isArchived: false,
  };

  const mockAuthUser = {
    id: 1,
    email: `user@example.com`,
    isEnabled: true,
    roles: [],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstName: "first",
    lastName: "last",
    bio: "bio",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
  };

  const mockGroups = [
    {
      id: 1,
      groupName: "Test Group",
      slug: "test-group",
      isArchived: false,
      semester: "summer" as GroupSemester,
    },
  ];

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

  const mockDueDates = [
    {
      droplet: mockDroplets[0],
      dueDate: "2023-12-31",
      authorized_user: 32,
      group: mockGroups[0],
    },
  ];

  it("shows progress tab only for users who can edit", () => {
    const { rerender } = render(
      <GroupDashboard
        group={mockGroup}
        canEdit={true}
        authUser={mockAuthUser}
        dueDates={mockDueDates}
        statuses={{}}
      />,
    );

    expect(screen.getByText("Progress")).toBeInTheDocument();

    rerender(
      <GroupDashboard
        group={mockGroup}
        canEdit={false}
        authUser={mockAuthUser}
        dueDates={mockDueDates}
        statuses={{}}
      />,
    );

    expect(screen.queryByText("Progress")).not.toBeInTheDocument();
  });

  it("displays empty state messages when no content", () => {
    const emptyGroup = {
      ...mockGroup,
      droplets: [],
      playlists: [],
      members: [],
    };

    render(
      <GroupDashboard
        group={emptyGroup}
        canEdit={true}
        authUser={mockAuthUser}
        dueDates={[]}
        statuses={{}}
      />,
    );

    expect(
      screen.getByText("No droplets have been added to this group yet."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Playlists"));
    expect(
      screen.getByText("No playlists have been added to this group yet."),
    ).toBeInTheDocument();
  });

  test("renders tabs correctly", () => {
    render(
      <GroupDashboard
        group={mockGroup}
        canEdit={true}
        authUser={mockAuthUser}
        dueDates={[]}
        statuses={{}}
      />,
    );

    expect(screen.getByText("Droplets")).toBeInTheDocument();
    expect(screen.getByText("Playlists")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
  });

  test("displays empty state messages correctly", () => {
    const emptyGroup = {
      ...mockGroup,
      droplets: [],
      playlists: [],
    };

    render(
      <GroupDashboard
        group={emptyGroup}
        canEdit={true}
        authUser={mockAuthUser}
        dueDates={[]}
        statuses={{}}
      />,
    );

    expect(
      screen.getByText(/No droplets have been added/i),
    ).toBeInTheDocument();
  });

  const mockProps = {
    group: mockGroup,
    canEdit: true,
    authUser: { id: "1", timeZone: "UTC" } as any,
    dueDates: [],
    statuses: {},
  };

  test("empty state renders correctly", () => {
    const emptyGroup = {
      ...mockGroup,
      droplets: [],
    };

    render(<GroupDashboard {...mockProps} group={emptyGroup} />);

    expect(
      screen.getByText("No droplets have been added to this group yet."),
    ).toBeInTheDocument();
  });

  test("renders correct number of items per page", () => {
    render(<GroupDashboard {...mockProps} />);

    expect(screen.getAllByText(/Droplet/)).toHaveLength(1);
  });
});
