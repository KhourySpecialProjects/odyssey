import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  DropletStatus,
  DropletType,
  FocusArea,
  GroupSemester,
  LearningObjective,
  Tag,
  TimeZone,
} from "@/types";
import { GroupDashboard } from "@/components/group/group-management-dashboard";

const mockReplace = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    prefetch: jest.fn(),
    pathname: "/group/test-group",
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/group/test-group",
}));

jest.mock("@/components/group/content-section", () => ({
  ContentSection: ({ children, emptyMessage }: any) => (
    <div data-testid="content-section">
      {children || <div>{emptyMessage}</div>}
    </div>
  ),
}));

jest.mock("@/components/group/group-droplet-tile", () => ({
  GroupDropletTile: ({ droplet, dueDate }: any) => (
    <div data-testid={`droplet-${droplet.id}`}>
      {droplet.name} - Due: {dueDate}
    </div>
  ),
}));

jest.mock("@/components/playlists/playlist-card", () => ({
  PlaylistCard: ({ playlist, dueDate }: any) => (
    <div data-testid={`playlist-${playlist.id}`}>
      {playlist.name} - Due: {dueDate}
    </div>
  ),
}));

jest.mock("@/components/group/group-progress-grid", () => ({
  GroupProgressGrid: ({ group, statuses }: any) => (
    <div data-testid="progress-grid">Progress Grid for {group.groupName}</div>
  ),
}));

describe("GroupDashboard", () => {
  const mockGroup = {
    id: 1,
    slug: "test-group",
    groupName: "Test Group",
    creator: { id: 1, name: "Test Creator" },
    admins: [{ id: 2, name: "Test Admin" }],
    managers: [{ id: 3, name: "Test Manager" }],
    members: [{ id: 1 }, { id: 2 }, { id: 3 }],
    semester: "Spring 2024" as GroupSemester,
    description: "Test group description",
    isArchived: false,
    droplets: [],
    playlists: [],
  };

  const mockAuthUser = {
    id: 1,
    email: "user@example.com",
    isEnabled: true,
    roles: [],
    linkedin: "https://www.linkedin.com/",
    github: "https://www.github.com/",
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
    isPublic: false,
  };

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
    focusArea: "personal" as FocusArea,
    isHidden: false,
  }));

  const mockPlaylists: any[] = [
    {
      id: 1,
      name: "Playlist 1",
      slug: "playlist-1",
      isPublic: false,
      duration: 0,
    },
    {
      id: 2,
      name: "Playlist 2",
      slug: "playlist-2",
      isPublic: false,
      duration: 0,
    },
  ];

  const mockDueDates = [
    {
      droplet: mockDroplets[0],
      dueDate: "2023-12-31",
      authorized_user: 32,
      group: mockGroup,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete("tab");
  });

  describe("Tab Rendering", () => {
    it("renders all tabs for users who can edit", () => {
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

    it("shows progress tab for admin users", () => {
      const adminUser = { ...mockAuthUser, id: 2 };

      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={false}
          authUser={adminUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByText("Progress")).toBeInTheDocument();
    });

    it("hides progress tab when user cannot edit and is not admin", () => {
      const regularUser = { ...mockAuthUser, id: 999 };

      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={false}
          authUser={regularUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.queryByText("Progress")).not.toBeInTheDocument();
    });

    it("renders only Droplets and Playlists tabs when canEdit is false", () => {
      const regularUser = { ...mockAuthUser, id: 999 };

      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={false}
          authUser={regularUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByText("Droplets")).toBeInTheDocument();
      expect(screen.getByText("Playlists")).toBeInTheDocument();
    });
  });

  describe("Tab Navigation", () => {
    it("switches to Playlists tab when clicked", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, playlists: mockPlaylists }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Playlists"));

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
    });

    it("switches to Progress tab when clicked", () => {
      render(
        <GroupDashboard
          group={{
            ...mockGroup,
            droplets: [mockDroplets[0]],
            members: mockGroup.members,
          }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Progress"));

      expect(screen.getByTestId("progress-grid")).toBeInTheDocument();
    });

    it("updates URL parameter on tab change", () => {
      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Playlists"));

      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("tab=playlists"),
      );
    });

    it("initializes with tab from URL parameter", () => {
      mockSearchParams.set("tab", "playlists");

      render(
        <GroupDashboard
          group={{ ...mockGroup, playlists: mockPlaylists }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
    });

    it("defaults to droplets tab when invalid tab parameter", () => {
      mockSearchParams.set("tab", "invalid");

      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: [mockDroplets[0]] }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    });
  });

  describe("Droplets Tab", () => {
    it("displays first page of droplets", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-6")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-7")).not.toBeInTheDocument();
    });

    it("shows empty state when no droplets", () => {
      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(
        screen.getByText("No droplets have been added to this group yet."),
      ).toBeInTheDocument();
    });

    it("displays due dates for droplets", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={mockDueDates}
          statuses={{}}
        />,
      );

      expect(screen.getByText(/2023-12-31/)).toBeInTheDocument();
    });

    it("handles droplets without due dates", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: [mockDroplets[1]] }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByTestId("droplet-2")).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("shows pagination buttons when droplets exceed page size", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("disables Previous button on first page", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      const prevButton = screen.getByText("Previous");
      expect(prevButton).toBeDisabled();
    });

    it("enables Next button when more pages available", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      const nextButton = screen.getByText("Next");
      expect(nextButton).not.toBeDisabled();
    });

    it("navigates to next page when Next clicked", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Next"));

      expect(screen.getByTestId("droplet-7")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-12")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-1")).not.toBeInTheDocument();
    });

    it("navigates to previous page when Previous clicked", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Next"));
      fireEvent.click(screen.getByText("Previous"));

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-7")).not.toBeInTheDocument();
    });

    it("disables Next button on last page", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Next"));

      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeDisabled();
    });

    it("calculates total pages correctly", () => {
      const sevenDroplets = mockDroplets.slice(0, 7);

      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: sevenDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByTestId("droplet-6")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Next"));
      expect(screen.getByTestId("droplet-7")).toBeInTheDocument();
    });

    it("handles exactly 6 droplets without pagination", () => {
      const sixDroplets = mockDroplets.slice(0, 6);

      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: sixDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeDisabled();
    });
  });

  describe("Playlists Tab", () => {
    it("displays playlists when tab is selected", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, playlists: mockPlaylists }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Playlists"));

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
      expect(screen.getByTestId("playlist-2")).toBeInTheDocument();
    });

    it("shows empty state when no playlists", () => {
      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Playlists"));

      expect(
        screen.getByText("No playlists have been added to this group yet."),
      ).toBeInTheDocument();
    });

    it("displays playlist due dates", () => {
      const playlistDueDate = {
        playlist: mockPlaylists[0],
        dueDate: "2024-01-15",
        authorized_user: 1,
        group: mockGroup,
      };

      render(
        <GroupDashboard
          group={{ ...mockGroup, playlists: mockPlaylists }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[playlistDueDate]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Playlists"));

      expect(screen.getByText(/2024-01-15/)).toBeInTheDocument();
    });

    it("passes timezone to PlaylistCard", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, playlists: mockPlaylists }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Playlists"));

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
    });

    it("handles playlists without due dates", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, playlists: mockPlaylists }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Playlists"));

      expect(screen.getByTestId("playlist-1")).toBeInTheDocument();
    });
  });

  describe("Progress Tab", () => {
    it("displays progress grid when content and members exist", () => {
      render(
        <GroupDashboard
          group={{
            ...mockGroup,
            droplets: [mockDroplets[0]],
            members: mockGroup.members,
          }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Progress"));

      expect(screen.getByTestId("progress-grid")).toBeInTheDocument();
    });

    it("shows progress when only droplets exist", () => {
      render(
        <GroupDashboard
          group={{
            ...mockGroup,
            droplets: [mockDroplets[0]],
            members: mockGroup.members,
          }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Progress"));

      expect(screen.getByTestId("progress-grid")).toBeInTheDocument();
    });

    it("shows progress when only playlists exist", () => {
      render(
        <GroupDashboard
          group={{
            ...mockGroup,
            playlists: mockPlaylists,
            members: mockGroup.members,
          }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Progress"));

      expect(screen.getByTestId("progress-grid")).toBeInTheDocument();
    });

    it("shows empty state when no droplets or playlists", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, members: mockGroup.members }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Progress"));

      expect(
        screen.getByText(
          "No droplets or members have been added to this group yet.",
        ),
      ).toBeInTheDocument();
    });

    it("shows empty state when no members", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: [mockDroplets[0]], members: [] }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Progress"));

      expect(
        screen.getByText(
          "No droplets or members have been added to this group yet.",
        ),
      ).toBeInTheDocument();
    });

    it("passes statuses to GroupProgressGrid", () => {
      const mockStatuses = {
        "1": { completionPercentage: 75, completionDate: new Date() },
      };

      render(
        <GroupDashboard
          group={{
            ...mockGroup,
            droplets: [mockDroplets[0]],
            members: mockGroup.members,
          }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={mockStatuses}
        />,
      );

      fireEvent.click(screen.getByText("Progress"));

      expect(screen.getByTestId("progress-grid")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("shows droplets empty state", () => {
      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(
        screen.getByText("No droplets have been added to this group yet."),
      ).toBeInTheDocument();
    });

    it("shows playlists empty state", () => {
      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Playlists"));

      expect(
        screen.getByText("No playlists have been added to this group yet."),
      ).toBeInTheDocument();
    });

    it("applies dark mode classes to empty states", () => {
      const { container } = render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      const emptyState = container.querySelector(".dark\\:border-slate-500");
      expect(emptyState).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles group without droplets array", () => {
      const groupNoDroplets = { ...mockGroup, droplets: undefined };

      render(
        <GroupDashboard
          group={groupNoDroplets as any}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(
        screen.getByText("No droplets have been added to this group yet."),
      ).toBeInTheDocument();
    });

    it("handles group without playlists array", () => {
      const groupNoPlaylists = { ...mockGroup, playlists: undefined };

      render(
        <GroupDashboard
          group={groupNoPlaylists as any}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      fireEvent.click(screen.getByText("Playlists"));

      expect(
        screen.getByText("No playlists have been added to this group yet."),
      ).toBeInTheDocument();
    });

    it("handles canEdit being undefined", () => {
      const regularUser = { ...mockAuthUser, id: 999 };

      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={undefined}
          authUser={regularUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.queryByText("Progress")).not.toBeInTheDocument();
    });

    it("handles group without admins array", () => {
      const groupNoAdmins = { ...mockGroup, admins: undefined };

      render(
        <GroupDashboard
          group={groupNoAdmins as any}
          canEdit={false}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.queryByText("Progress")).not.toBeInTheDocument();
    });

    it("handles empty dueDates array", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: [mockDroplets[0]] }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
    });

    it("handles single droplet", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: [mockDroplets[0]] }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeDisabled();
    });
  });

  describe("Styling", () => {
    it("applies tab styling classes", () => {
      const { container } = render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      const tab = screen.getByText("Droplets");
      expect(tab).toHaveClass("px-4");
      expect(tab).toHaveClass("py-2");
      expect(tab).toHaveClass("cursor-pointer");
    });

    it("applies grid layout to droplets", () => {
      const { container } = render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: [mockDroplets[0]] }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      const grid = container.querySelector(".grid-cols-1");
      expect(grid).toBeInTheDocument();
    });

    it("applies dark mode classes to pagination buttons", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      const nextButton = screen.getByText("Next");
      expect(nextButton).toHaveClass("dark:bg-slate-300");
      expect(nextButton).toHaveClass("dark:text-black");
    });
  });

  describe("Accessibility", () => {
    it("tabs are keyboard accessible", () => {
      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );
    });

    it("pagination buttons are properly labeled", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });
  });
});
