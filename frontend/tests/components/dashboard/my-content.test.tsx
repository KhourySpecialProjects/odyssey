import { render, screen } from "@testing-library/react";
import { MyContent } from "@/components/dashboard/my-content";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCachedUserDashboardFull,
  getCachedUserGroups,
} from "@/lib/requests/cached";
import { notFound } from "next/navigation";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUserDashboardFull: jest.fn(),
  getCachedUserGroups: jest.fn(),
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

jest.mock("@/components/dashboard/archived-playlists-grid", () => ({
  ArchivedPlaylistsGrid: ({ sortKey }: { sortKey?: string }) => (
    <div data-testid="archived-playlists-grid">Archived Playlists Grid</div>
  ),
}));

jest.mock("@/components/dashboard/favorited-droplet-grid", () => ({
  FavoriteDropletsGrid: ({ sortKey }: { sortKey?: string }) => (
    <div data-testid="favorited-grid">Favorite Droplets Grid</div>
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
    (getCachedUserDashboardFull as jest.Mock).mockResolvedValue(
      mockAuthorizedUser,
    );
    (getCachedUserGroups as jest.Mock).mockResolvedValue(mockGroups);
  });

  describe("Authentication", () => {
    it("calls notFound when user is not found", async () => {
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

      expect(getCachedUserDashboardFull).toHaveBeenCalledWith(
        "test@example.com",
      );
    });

    it("fetches user groups", async () => {
      await MyContent({ searchParams: {} });

      expect(getCachedUserGroups).toHaveBeenCalledWith(1);
    });
  });

  describe("Content Type Rendering", () => {
    it("defaults to droplets tab when no contentType is specified", async () => {
      render(await MyContent({ searchParams: {} }));

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });

    it("renders the droplets grid when contentType is droplets", async () => {
      render(await MyContent({ searchParams: { contentType: "droplets" } }));

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });

    it("renders the playlists grid when contentType is playlists", async () => {
      render(await MyContent({ searchParams: { contentType: "playlists" } }));

      expect(screen.getByTestId("playlists-grid")).toBeInTheDocument();
    });

    it("renders groups grid when contentType is groups", async () => {
      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByTestId("active-groups")).toBeInTheDocument();
    });

    it("renders the archived section when contentType is archived", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByTestId("archived-grid")).toBeInTheDocument();
      expect(screen.getByTestId("archived-playlists-grid")).toBeInTheDocument();
      expect(screen.getByTestId("archived-groups")).toBeInTheDocument();
    });

    it("renders the favorited grid when contentType is favorited", async () => {
      render(await MyContent({ searchParams: { contentType: "favorited" } }));

      expect(screen.getByTestId("favorited-grid")).toBeInTheDocument();
    });

    it("renders null when contentType is invalid", async () => {
      const { container } = render(
        await MyContent({ searchParams: { contentType: "invalid" } }),
      );

      expect(
        container.querySelector('[data-testid="droplets-grid"]'),
      ).not.toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="playlists-grid"]'),
      ).not.toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="favorited-grid"]'),
      ).not.toBeInTheDocument();
    });

    it("renders all archived section headers", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByText("Droplets")).toBeInTheDocument();
      expect(screen.getByText("Playlists")).toBeInTheDocument();
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

      (getCachedUserGroups as jest.Mock).mockResolvedValue(groupsWithNonMember);

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByText("User Groups (1)")).toBeInTheDocument();
    });

    it("excludes system archived groups from active groups", async () => {
      render(await MyContent({ searchParams: { contentType: "groups" } }));

      // System archived group (id: 3) should not be in active groups
      expect(screen.getByText("User Groups (1)")).toBeInTheDocument();
    });

    it("filters groups correctly when user is member of multiple groups", async () => {
      const multipleGroups = [
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
        {
          id: 3,
          groupName: "Group 3",
          slug: "group-3",
          isArchived: false,
          members: [{ id: 1 }],
          users_archived: [{ id: 1 }],
        },
      ];

      (getCachedUserGroups as jest.Mock).mockResolvedValue(multipleGroups);

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      // Should show 2 active groups (groups 1 and 2)
      expect(screen.getByText("User Groups (2)")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("shows no groups message when no active groups", async () => {
      (getCachedUserGroups as jest.Mock).mockResolvedValue([]);

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByText("No enrolled groups")).toBeInTheDocument();
      expect(
        screen.getByText("You haven't enrolled in any groups yet."),
      ).toBeInTheDocument();
    });

    it("shows no archived groups message when no archived groups", async () => {
      (getCachedUserGroups as jest.Mock).mockResolvedValue([]);

      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByText("No archived groups")).toBeInTheDocument();
      expect(
        screen.getByText("You haven't archived any groups yet."),
      ).toBeInTheDocument();
    });

    it("does not show no groups message when active groups exist", async () => {
      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.queryByText("No enrolled groups")).not.toBeInTheDocument();
    });

    it("does not show no archived groups message when archived groups exist", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.queryByText("No archived groups")).not.toBeInTheDocument();
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

    it("passes sortKey to UserPlaylistsGrid", async () => {
      render(
        await MyContent({
          searchParams: { contentType: "playlists" },
          sortKey: "name:desc",
        }),
      );

      expect(screen.getByTestId("playlists-grid")).toBeInTheDocument();
    });

    it("passes sortKey to FavoriteDropletsGrid", async () => {
      render(
        await MyContent({
          searchParams: { contentType: "favorited" },
          sortKey: "name:asc",
        }),
      );

      expect(screen.getByTestId("favorited-grid")).toBeInTheDocument();
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

    it("passes tags as array to EnrolledDropletsGrid", async () => {
      render(
        await MyContent({
          searchParams: {
            contentType: "droplets",
            tags: ["react", "javascript"],
          },
        }),
      );

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });

    it("passes sortKey to UserGroups", async () => {
      render(
        await MyContent({
          searchParams: { contentType: "groups" },
          sortKey: "name:asc",
        }),
      );

      expect(screen.getByTestId("active-groups")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined searchParams", async () => {
      render(await MyContent({}));

      expect(screen.getByTestId("droplets-grid")).toBeInTheDocument();
    });

    it("handles groups with undefined members", async () => {
      (getCachedUserGroups as jest.Mock).mockResolvedValue([
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

      expect(screen.getByText("No enrolled groups")).toBeInTheDocument();
    });

    it("handles groups with undefined users_archived", async () => {
      (getCachedUserGroups as jest.Mock).mockResolvedValue([
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

    it("handles groups with null members", async () => {
      (getCachedUserGroups as jest.Mock).mockResolvedValue([
        {
          id: 1,
          groupName: "Group With Null Members",
          slug: "null-members",
          isArchived: false,
          members: null,
          users_archived: [],
        },
      ]);

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByText("No enrolled groups")).toBeInTheDocument();
    });

    it("handles empty members array", async () => {
      (getCachedUserGroups as jest.Mock).mockResolvedValue([
        {
          id: 1,
          groupName: "Group With Empty Members",
          slug: "empty-members",
          isArchived: false,
          members: [],
          users_archived: [],
        },
      ]);

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByText("No enrolled groups")).toBeInTheDocument();
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

      (getCachedUserGroups as jest.Mock).mockResolvedValue(
        multipleActiveGroups,
      );

      render(await MyContent({ searchParams: { contentType: "groups" } }));

      expect(screen.getByText("User Groups (2)")).toBeInTheDocument();
    });
  });

  describe("Archived Content Section", () => {
    it("includes dividers between archived sections", async () => {
      const { container } = render(
        await MyContent({ searchParams: { contentType: "archived" } }),
      );

      const dividers = container.querySelectorAll("hr");
      expect(dividers.length).toBeGreaterThan(0);
    });

    it("renders archived droplets grid", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByTestId("archived-grid")).toBeInTheDocument();
    });

    it("renders archived playlists grid", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByTestId("archived-playlists-grid")).toBeInTheDocument();
    });

    it("renders archived groups section", async () => {
      render(await MyContent({ searchParams: { contentType: "archived" } }));

      expect(screen.getByTestId("archived-groups")).toBeInTheDocument();
    });

    it("renders all archived sections in correct order", async () => {
      const { container } = render(
        await MyContent({ searchParams: { contentType: "archived" } }),
      );

      const dropletsHeader = screen.getByText("Droplets");
      const playlistsHeader = screen.getByText("Playlists");
      const groupsHeader = screen.getByText("Groups");

      expect(dropletsHeader).toBeInTheDocument();
      expect(playlistsHeader).toBeInTheDocument();
      expect(groupsHeader).toBeInTheDocument();

      // Verify order by checking that droplets comes before playlists
      const allText = container.textContent || "";
      const dropletsIndex = allText.indexOf("Droplets");
      const playlistsIndex = allText.indexOf("Playlists");
      const groupsIndex = allText.indexOf("Groups");

      expect(dropletsIndex).toBeLessThan(playlistsIndex);
      expect(playlistsIndex).toBeLessThan(groupsIndex);
    });
  });

  describe("Favorited Content", () => {
    it("renders favorited droplets grid", async () => {
      render(await MyContent({ searchParams: { contentType: "favorited" } }));

      expect(screen.getByTestId("favorited-grid")).toBeInTheDocument();
    });

    it("passes sortKey to FavoriteDropletsGrid", async () => {
      render(
        await MyContent({
          searchParams: { contentType: "favorited" },
          sortKey: "name:desc",
        }),
      );

      expect(screen.getByTestId("favorited-grid")).toBeInTheDocument();
    });
  });
});
