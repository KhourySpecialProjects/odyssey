import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
let mockSearchParams = new URLSearchParams();

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
    website: "",
    groups: [],
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
    mockSearchParams = new URLSearchParams();
  });

  describe("Tab Rendering and Permissions", () => {
    it("renders Droplets and Playlists tabs for all users", () => {
      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={false}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByText("Droplets")).toBeInTheDocument();
      expect(screen.getByText("Playlists")).toBeInTheDocument();
    });

    it("shows Progress tab when user can edit", () => {
      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByText("Progress")).toBeInTheDocument();
    });

    it("shows Progress tab when user is admin", () => {
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

    it("hides Progress tab when user has no permissions", () => {
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

    it("hides Progress tab when canEdit is undefined and user is not admin", () => {
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
  });

  describe("Droplets Tab - Default View", () => {
    it("displays droplets on initial render", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets.slice(0, 3) }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-2")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-3")).toBeInTheDocument();
    });

    it("shows empty state when no droplets exist", () => {
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
          group={{ ...mockGroup, droplets: [mockDroplets[0]] }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={mockDueDates}
          statuses={{}}
        />,
      );

      expect(screen.getByText(/2023-12-31/)).toBeInTheDocument();
    });

    it("handles missing droplets array", () => {
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
  });

  describe("Droplets Pagination", () => {
    it("shows first 6 droplets on initial page", () => {
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

    it("enables Next button when more droplets exist", () => {
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

    it("shows next page when Next button clicked", async () => {
      const user = userEvent.setup();

      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      await act(async () => {
        await user.click(screen.getByText("Next"));
      });

      expect(screen.getByTestId("droplet-7")).toBeInTheDocument();
      expect(screen.getByTestId("droplet-12")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-1")).not.toBeInTheDocument();
    });

    it("navigates back to first page when Previous clicked", async () => {
      const user = userEvent.setup();

      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      await act(async () => {
        await user.click(screen.getByText("Next"));
      });

      await act(async () => {
        await user.click(screen.getByText("Previous"));
      });

      expect(screen.getByTestId("droplet-1")).toBeInTheDocument();
      expect(screen.queryByTestId("droplet-7")).not.toBeInTheDocument();
    });

    it("disables Next button on last page", async () => {
      const user = userEvent.setup();

      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: mockDroplets }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      await act(async () => {
        await user.click(screen.getByText("Next"));
      });

      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeDisabled();
    });

    it("handles exactly 6 droplets without Next button active", () => {
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

  describe("Playlists Tab - Lazy Loading", () => {
    it("does not render playlists content initially", () => {
      render(
        <GroupDashboard
          group={{ ...mockGroup, playlists: mockPlaylists }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(screen.queryByTestId("playlist-1")).not.toBeInTheDocument();
    });

    it("renders playlists immediately when URL has playlists tab", () => {
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
      expect(screen.getByTestId("playlist-2")).toBeInTheDocument();
    });

    it("shows empty state immediately when URL has playlists tab and no playlists", () => {
      mockSearchParams.set("tab", "playlists");

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
        screen.getByText("No playlists have been added to this group yet."),
      ).toBeInTheDocument();
    });

    it("handles missing playlists array when initialized with URL", () => {
      mockSearchParams.set("tab", "playlists");
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

      expect(
        screen.getByText("No playlists have been added to this group yet."),
      ).toBeInTheDocument();
    });

    it("displays playlist due dates when initialized with URL", () => {
      mockSearchParams.set("tab", "playlists");
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

      expect(screen.getByText(/2024-01-15/)).toBeInTheDocument();
    });
  });

  describe("Progress Tab - Lazy Loading", () => {
    it("does not render progress content initially", () => {
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

      expect(screen.queryByTestId("progress-grid")).not.toBeInTheDocument();
    });

    it("renders progress immediately when URL has progress tab", () => {
      mockSearchParams.set("tab", "progress");

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

      expect(screen.getByTestId("progress-grid")).toBeInTheDocument();
    });

    it("shows empty state when no droplets or playlists and initialized with URL", () => {
      mockSearchParams.set("tab", "progress");

      render(
        <GroupDashboard
          group={{ ...mockGroup, members: mockGroup.members }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(
        screen.getByText(
          "No droplets or members have been added to this group yet.",
        ),
      ).toBeInTheDocument();
    });

    it("shows empty state when no members exist and initialized with URL", () => {
      mockSearchParams.set("tab", "progress");

      render(
        <GroupDashboard
          group={{ ...mockGroup, droplets: [mockDroplets[0]], members: [] }}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      expect(
        screen.getByText(
          "No droplets or members have been added to this group yet.",
        ),
      ).toBeInTheDocument();
    });

    it("renders progress with playlists only when initialized with URL", () => {
      mockSearchParams.set("tab", "progress");

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

      expect(screen.getByTestId("progress-grid")).toBeInTheDocument();
    });

    it("passes statuses to progress grid when initialized with URL", () => {
      mockSearchParams.set("tab", "progress");
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

      expect(screen.getByTestId("progress-grid")).toBeInTheDocument();
    });
  });

  describe("URL Tab Parameter Handling", () => {
    it("defaults to droplets tab when no URL parameter", () => {
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

    it("defaults to droplets tab when invalid URL parameter", () => {
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

    it("updates URL when tab is clicked", async () => {
      const user = userEvent.setup();

      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      await act(async () => {
        await user.click(screen.getByText("Playlists"));
      });

      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("tab=playlists"),
      );
    });

    it("preserves existing URL parameters when changing tabs", async () => {
      const user = userEvent.setup();
      mockSearchParams.set("filter", "active");

      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      await act(async () => {
        await user.click(screen.getByText("Playlists"));
      });

      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("filter=active"),
      );
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("tab=playlists"),
      );
    });
  });

  describe("Edge Cases", () => {
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

    it("applies correct styling to tabs", () => {
      render(
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

    it("renders all tabs with correct ARIA attributes", () => {
      render(
        <GroupDashboard
          group={mockGroup}
          canEdit={true}
          authUser={mockAuthUser}
          dueDates={[]}
          statuses={{}}
        />,
      );

      const dropletsTab = screen.getByText("Droplets");
      const playlistsTab = screen.getByText("Playlists");
      const progressTab = screen.getByText("Progress");

      expect(dropletsTab).toBeInTheDocument();
      expect(playlistsTab).toBeInTheDocument();
      expect(progressTab).toBeInTheDocument();
    });
  });
});
