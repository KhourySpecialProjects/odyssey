import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GroupCard } from "@/components/group/group-card";
import { GroupSemester } from "@/types";
import { archiveGroup } from "@/lib/requests/groups";
import { toast } from "sonner";

jest.mock("@/lib/requests/groups", () => ({
  archiveGroup: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe("GroupCard", () => {
  const mockUser = {
    id: 5,
    firstName: "Test",
    lastName: "User",
    email: "test.user@northeastern.edu",
  };

  const mockGroup = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "SPRING" as GroupSemester,
    creator: mockUser,
    admins: [],
    managers: [],
    members: [],
  };

  const mockRoleColors = {
    creator: "bg-purple-100",
    admin: "bg-yellow-100",
    manager: "bg-blue-100",
    member: "bg-gray-100",
  };

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Rendering", () => {
    it("renders group name", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });

    it("renders as a link to the group page", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/g/test-group");
    });

    it("displays role badge", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    it("applies correct styling classes", () => {
      const { container } = render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );
    });
  });

  describe("Role Badge", () => {
    it("applies correct role color for admin", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("admin")).toHaveClass("bg-yellow-100");
    });

    it("applies correct role color for manager", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="manager"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("manager")).toHaveClass("bg-blue-100");
    });

    it("applies correct role color for member", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("member")).toHaveClass("bg-gray-100");
    });

    it("applies correct role color for creator", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="creator"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("creator")).toHaveClass("bg-purple-100");
    });

    it("uses default color when roleColors is not provided", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          isArchived={false}
          dashboardPage={false}
        />,
      );

      const badge = screen.getByText("admin");
      expect(badge).toHaveClass("bg-green-100", "text-green-800");
    });
  });

  describe("Member Counts for Admin Roles", () => {
    it("shows member counts for creator role", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="creator"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("Admins: 0")).toBeInTheDocument();
      expect(screen.getByText("Managers: 0")).toBeInTheDocument();
      expect(screen.getByText("Members: 0")).toBeInTheDocument();
    });

    it("shows member counts for admin role", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("Admins: 0")).toBeInTheDocument();
      expect(screen.getByText("Managers: 0")).toBeInTheDocument();
      expect(screen.getByText("Members: 0")).toBeInTheDocument();
    });

    it("shows member counts for manager role", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="manager"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("Admins: 0")).toBeInTheDocument();
      expect(screen.getByText("Managers: 0")).toBeInTheDocument();
      expect(screen.getByText("Members: 0")).toBeInTheDocument();
    });

    it("displays UsersIcon for admin roles", () => {
      const { container } = render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("displays correct counts when group has members", () => {
      const groupWithMembers = {
        ...mockGroup,
        admins: [{ id: 1 }, { id: 2 }],
        managers: [{ id: 3 }, { id: 4 }, { id: 5 }],
        members: [{ id: 6 }],
      };

      render(
        <GroupCard
          group={groupWithMembers}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("Admins: 2")).toBeInTheDocument();
      expect(screen.getByText("Managers: 3")).toBeInTheDocument();
      expect(screen.getByText("Members: 1")).toBeInTheDocument();
    });
  });

  describe("Member Role View", () => {
    it("does not show admin/manager counts for regular members", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.queryByText("Admins:")).not.toBeInTheDocument();
      expect(screen.queryByText("Managers:")).not.toBeInTheDocument();
    });

    it("shows only total member count for regular members", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("Members: 0")).toBeInTheDocument();
    });

    it("displays creator name for regular members", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("Creator: Test User")).toBeInTheDocument();
    });

    it("displays creator email when name is not available", () => {
      const groupWithoutCreatorName = {
        ...mockGroup,
        creator: {
          id: 5,
          email: "creator@northeastern.edu",
        },
      };

      render(
        <GroupCard
          group={groupWithoutCreatorName}
          role="member"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(
        screen.getByText("Creator: creator@northeastern.edu"),
      ).toBeInTheDocument();
    });

    it("displays member count correctly when members exist", () => {
      const groupWithMembers = {
        ...mockGroup,
        members: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };

      render(
        <GroupCard
          group={groupWithMembers}
          role="member"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("Members: 3")).toBeInTheDocument();
    });
  });

  describe("Archive/Unarchive Functionality", () => {
    it("does not show archive button when not on dashboard page", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows archive button on dashboard page", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={true}
        />,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("shows Archive icon when group is not archived", () => {
      const { container } = render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={true}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      // Archive icon should be present
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("shows ArchiveRestore icon when group is archived", () => {
      const { container } = render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={true}
          dashboardPage={true}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      // ArchiveRestore icon should be present
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("calls archiveGroup when archive button is clicked", async () => {
      (archiveGroup as jest.Mock).mockResolvedValue({ success: true });

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={true}
        />,
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(archiveGroup).toHaveBeenCalledWith(mockGroup, true);
      });
    });

    it("calls archiveGroup with false when unarchiving", async () => {
      (archiveGroup as jest.Mock).mockResolvedValue({ success: true });

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={true}
          dashboardPage={true}
        />,
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(archiveGroup).toHaveBeenCalledWith(mockGroup, false);
      });
    });

    it("shows success toast when archiving succeeds", async () => {
      (archiveGroup as jest.Mock).mockResolvedValue({ success: true });

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={true}
        />,
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Test Group is now archived!",
        );
      });
    });

    it("shows success toast when unarchiving succeeds", async () => {
      (archiveGroup as jest.Mock).mockResolvedValue({ success: true });

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={true}
          dashboardPage={true}
        />,
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Test Group is now unarchived!",
        );
      });
    });

    it("shows error toast when archiving fails", async () => {
      (archiveGroup as jest.Mock).mockResolvedValue({ success: false });

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={true}
        />,
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to update group visibility",
        );
      });
    });

    it("shows error toast when archiveGroup throws an error", async () => {
      (archiveGroup as jest.Mock).mockRejectedValue(new Error("Network error"));

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={true}
        />,
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "An error occurred while updating the group",
        );
      });
    });

    it("prevents navigation when archive button is clicked", async () => {
      (archiveGroup as jest.Mock).mockResolvedValue({ success: true });

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={true}
        />,
      );

      const button = screen.getByRole("button");
      const clickEvent = new MouseEvent("click", { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, "preventDefault");
      const stopPropagationSpy = jest.spyOn(clickEvent, "stopPropagation");

      fireEvent(button, clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has accessible link to group page", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });

    it("archive button has tooltip on hover", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={true}
        />,
      );

      expect(screen.getByText("Archive")).toBeInTheDocument();
    });

    it("unarchive button has tooltip on hover", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={true}
          dashboardPage={true}
        />,
      );

      expect(screen.getByText("Unarchive")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles group with special characters in name", () => {
      const specialGroup = {
        ...mockGroup,
        groupName: "Test & Group <Special>",
      };

      render(
        <GroupCard
          group={specialGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("Test & Group <Special>")).toBeInTheDocument();
    });

    it("handles group with undefined member arrays", () => {
      const groupWithoutMembers = {
        ...mockGroup,
        admins: undefined,
        managers: undefined,
        members: undefined,
      };

      render(
        <GroupCard
          group={groupWithoutMembers}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(screen.getByText("Admins: 0")).toBeInTheDocument();
      expect(screen.getByText("Managers: 0")).toBeInTheDocument();
      expect(screen.getByText("Members: 0")).toBeInTheDocument();
    });

    it("handles creator with only partial name", () => {
      const groupWithPartialName = {
        ...mockGroup,
        creator: {
          id: 5,
          firstName: "Test",
          email: "test@northeastern.edu",
        },
      };

      render(
        <GroupCard
          group={groupWithPartialName}
          role="member"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      // Should fall back to email when name is incomplete
      expect(
        screen.getByText("Creator: test@northeastern.edu"),
      ).toBeInTheDocument();
    });

    it("handles long group names", () => {
      const groupWithLongName = {
        ...mockGroup,
        groupName:
          "This is a very long group name that might cause layout issues",
      };

      render(
        <GroupCard
          group={groupWithLongName}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={false}
        />,
      );

      expect(
        screen.getByText(
          "This is a very long group name that might cause layout issues",
        ),
      ).toBeInTheDocument();
    });

    it("handles rapid archive button clicks", async () => {
      (archiveGroup as jest.Mock).mockResolvedValue({ success: true });

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          isArchived={false}
          dashboardPage={true}
        />,
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        expect(archiveGroup).toHaveBeenCalled();
      });
    });
  });
});
