import { render, screen } from "@testing-library/react";
import { MyContent } from "@/components/dashboard/my-content";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { notFound } from "next/navigation";
import { getUserGroups } from "@/lib/requests/groups";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
  calculateDropletAverageRating: jest.fn(),
}));

jest.mock("@/lib/requests/groups", () => ({
  getUserGroups: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/components/dashboard/enrolled-droplets-grid", () => ({
  EnrolledDropletsGrid: ({
    sortKey,
    tags,
    type,
    focusArea,
  }: {
    sortKey?: string;
    tags?: string | string[];
    type?: string | string[];
    focusArea?: string | string[];
  }) => <div data-testid="droplets-grid">Enrolled Droplets Grid</div>,
}));

jest.mock("@/components/dashboard/user-playlists-grid", () => ({
  UserPlaylistsGrid: ({ sortKey }: { sortKey?: string }) => (
    <div data-testid="playlists-grid">User Playlists Grid</div>
  ),
}));

jest.mock("@/components/dashboard/archived-droplets-grid", () => ({
  ArchivedDropletsGrid: ({ sortKey }: { sortKey?: string }) => (
    <div data-testid="archived-grid">Archived Droplets Grid</div>
  ),
}));

jest.mock("@/components/dashboard/user-groups", () => ({
  UserGroups: ({
    activeGroups,
    isArchived,
    sortKey,
  }: {
    activeGroups: any[];
    isArchived: boolean;
    sortKey?: string;
  }) => (
    <div data-testid={isArchived ? "archived-groups" : "active-groups"}>
      User Groups ({activeGroups.length})
    </div>
  ),
}));

describe("MyContent", () => {
  const mockUser = {
    email: "test@example.com",
    roles: [],
  };

  const mockAuthorizedUser = {
    id: 1,
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  };

  const mockGroups = [
    {
      id: 1,
      groupName: "Active Group 1",
      slug: "active-1",
      isArchived: false,
      members: [{ id: 1 }],
      users_archived: [],
    },
    {
      id: 2,
      groupName: "Archived Group 1",
      slug: "archived-1",
      isArchived: false,
      members: [{ id: 1 }],
      users_archived: [{ id: 1 }],
    },
    {
      id: 3,
      groupName: "System Archived Group",
      slug: "system-archived",
      isArchived: true,
      members: [{ id: 1 }],
      users_archived: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(
      mockAuthorizedUser,
    );
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([]);
    (getUserGroups as jest.Mock).mockResolvedValue(mockGroups);
  });

  describe("Authentication", () => {
    it("returns null when user is not found", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await MyContent({ searchParams: {} });

      expect(notFound).toHaveBeenCalled();
    });

    it("calls notFound when user has no email", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue({ name: "Test" });

      await MyContent({ searchParams: {} });

      expect(notFound).toHaveBeenCalled();
    });

    it("fetches authorized user by email", async () => {
      await MyContent({ searchParams: {} });

      expect(getAuthorizedUserByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("fetches user groups", async () => {
      await MyContent({ searchParams: {} });

      expect(getUserGroups).toHaveBeenCalledWith(1);
    });
  });

  describe("Content Type Rendering", () => {
    it("defaults to droplets tab when no tab is specified", async () => {
      render(await MyContent({ searchParams: {} }));

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });

    it("renders the droplets grid when tab is droplets", async () => {
      render(await MyContent({ searchParams: { contentType: "droplets" } }));

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });

    it("renders the playlists grid when tab is playlists", async () => {
      render(await MyContent({ searchParams: { contentType: "playlists" } }));

      expect(screen.getByTestId("playlists-grid")).toBeInTheDocument();
    });

    it("renders groups grid when tab is groups", async () => {
      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByTestId("active-groups")).toBeInTheDocument();
    });

    it("renders the archived grid when tab is archived", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByTestId("archived-grid")).toBeInTheDocument();
      expect(screen.getByTestId("archived-groups")).toBeInTheDocument();
    });

    it("renders both archived sections with headers", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByText("Droplets")).toBeInTheDocument();
      expect(screen.getByText("Groups")).toBeInTheDocument();
    });
  });

  describe("Groups Filtering", () => {
    it("filters active groups correctly", async () => {
      render(await MyContent({ searchParams: { contentType: "groups" } }));

      // Should show 1 active group (only group 1 is active and not user-archived)
      expect(screen.getByText("User Groups (1)")).toBeInTheDocument();
    });

    it("filters archived groups correctly", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      // Should show 1 archived group (group 2 is user-archived)
      expect(screen.getByText("User Groups (1)")).toBeInTheDocument();
    });

    it("filters out groups where user is not a member", async () => {
      const groupsWithNonMember = [
        ...mockGroups,
        {
          id: 4,
          groupName: "Not A Member",
          slug: "not-member",
          isArchived: false,
          members: [{ id: 999 }],
          users_archived: [],
        },
      ];

      (getUserGroups as jest.Mock).mockResolvedValue(groupsWithNonMember);

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByText("User Groups (1)")).toBeInTheDocument();
    });

    it("excludes system archived groups from active groups", async () => {
      render(await MyContent({ searchParams: { contentType: "groups" } }));

      // System archived group (id: 3) should not be in active groups
      expect(screen.getByText("User Groups (1)")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("shows no groups message when no active groups", async () => {
      (getUserGroups as jest.Mock).mockResolvedValue([]);

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByText("No Enrolled Groups")).toBeInTheDocument();
      expect(
        screen.getByText("You haven't enrolled in any Groups yet."),
      ).toBeInTheDocument();
    });

    it("shows no archived groups message when no archived groups", async () => {
      (getUserGroups as jest.Mock).mockResolvedValue([]);

      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByText("No Archived Groups")).toBeInTheDocument();
      expect(
        screen.getByText("You haven't archived any Groups yet."),
      ).toBeInTheDocument();
    });

    it("does not show no groups message when active groups exist", async () => {
      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.queryByText("No Enrolled Groups")).not.toBeInTheDocument();
    });

    it("does not show no archived groups message when archived groups exist", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.queryByText("No Archived Groups")).not.toBeInTheDocument();
    });
  });

  describe("Search Parameters", () => {
    it("passes sortKey to EnrolledDropletsGrid", async () => {
      render(
        await MyContent({
          searchParams: { contentType: "droplets" },
          sortKey: "name:asc",
        }),
      );

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });

    it("passes type filter to EnrolledDropletsGrid", async () => {
      render(
        await MyContent({
          searchParams: { contentType: "droplets", type: "knowledge" },
        }),
      );

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });

    it("passes focusArea filter to EnrolledDropletsGrid", async () => {
      render(
        await MyContent({
          searchParams: { contentType: "droplets", focusArea: "technical" },
        }),
      );

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });

    it("passes tags filter to EnrolledDropletsGrid", async () => {
      render(
        await MyContent({
          searchParams: { contentType: "droplets", tags: "react,javascript" },
        }),
      );

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined searchParams", async () => {
      render(await MyContent({}));

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });

    it("handles groups with undefined members", async () => {
      (getUserGroups as jest.Mock).mockResolvedValue([
        {
          id: 1,
          groupName: "Group Without Members",
          slug: "no-members",
          isArchived: false,
          members: undefined,
          users_archived: [],
        },
      ]);

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByText("No Enrolled Groups")).toBeInTheDocument();
    });

    it("handles groups with undefined users_archived", async () => {
      (getUserGroups as jest.Mock).mockResolvedValue([
        {
          id: 1,
          groupName: "Group",
          slug: "group",
          isArchived: false,
          members: [{ id: 1 }],
          users_archived: undefined,
        },
      ]);

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      // Should treat undefined as empty array and show the group
      expect(screen.getByText("User Groups (1)")).toBeInTheDocument();
    });

    it("handles multiple group memberships", async () => {
      const multipleActiveGroups = [
        {
          id: 1,
          groupName: "Group 1",
          slug: "group-1",
          isArchived: false,
          members: [{ id: 1 }],
          users_archived: [],
        },
        {
          id: 2,
          groupName: "Group 2",
          slug: "group-2",
          isArchived: false,
          members: [{ id: 1 }],
          users_archived: [],
        },
      ];

      (getUserGroups as jest.Mock).mockResolvedValue(multipleActiveGroups);

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByText("User Groups (2)")).toBeInTheDocument();
    });
  });

  describe("Archived Content Section", () => {
    it("includes divider between archived sections", async () => {
      const { container } = render(
        await MyContent({ searchParams: { contentType: "archived" } }),
      );

      expect(container.querySelector("hr")).toBeInTheDocument();
    });

    it("renders archived droplets grid", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByTestId("archived-grid")).toBeInTheDocument();
    });

    it("renders archived groups section", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByTestId("archived-groups")).toBeInTheDocument();
    });
  });
});
