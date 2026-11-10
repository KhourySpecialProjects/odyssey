import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupCard } from "@/components/group/group-card";
import { GroupSemester } from "@/types";
import { GroupArchiveState } from "@/lib/group-archive";
import { archiveGroup, setGroupArchivedForMe } from "@/lib/requests/groups";
import { toast } from "sonner";

jest.mock("@/lib/requests/groups", () => ({
  archiveGroup: jest.fn(),
  setGroupArchivedForMe: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Forwards onClick (unlike a plain stub) and records whether each click that
// reaches the anchor arrived with its default (navigation) already
// prevented, so tests can assert real clicks never trigger navigation.
const mockLinkClick = jest.fn();

jest.mock("next/link", () => {
  return ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a
      href={href}
      onClick={(e) => {
        mockLinkClick(e.defaultPrevented);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
});

/**
 * A click that never reaches the Link's onClick at all (because it was
 * stopped from propagating up the React tree) is the expected outcome for
 * every archive control. If a click ever did reach it for some other
 * reason, its default must have been prevented so navigation doesn't fire.
 */
function expectLinkNavigationBlocked() {
  for (const [defaultPrevented] of mockLinkClick.mock.calls) {
    expect(defaultPrevented).toBe(true);
  }
}

// jsdom doesn't implement these, and Radix's DropdownMenu/AlertDialog call
// them during pointer interactions.
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
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

  function makeArchiveState(
    overrides: Partial<GroupArchiveState> = {},
  ): GroupArchiveState {
    return {
      archivedForMe: false,
      archivedForEveryone: false,
      isEffectivelyArchived: false,
      canManage: false,
      ...overrides,
    };
  }

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
        />,
      );

      expect(screen.getByText("admin")).toBeInTheDocument();
    });
  });

  describe("Role Badge", () => {
    it("applies correct role color for admin", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
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
        />,
      );

      expect(screen.getByText("creator")).toHaveClass("bg-purple-100");
    });

    it("uses default color when roleColors is not provided", () => {
      render(<GroupCard group={mockGroup} role="admin" />);

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
        />,
      );

      expect(screen.getByText("Members: 3")).toBeInTheDocument();
    });
  });

  describe("Archive Controls - no archiveState", () => {
    it("does not show any archive control when archiveState is not passed", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
        />,
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("Archive Controls - Active tabs, plain member", () => {
    it("shows a single Archive button for a plain member", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({ canManage: false })}
        />,
      );

      expect(
        screen.getByRole("button", { name: /archive group/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    });

    it("calls setGroupArchivedForMe(id, true) and shows a toast on click", async () => {
      (setGroupArchivedForMe as jest.Mock).mockResolvedValue({
        success: true,
      });
      const user = userEvent.setup();

      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({ canManage: false })}
        />,
      );

      await user.click(screen.getByRole("button", { name: /archive group/i }));

      await waitFor(() => {
        expect(setGroupArchivedForMe).toHaveBeenCalledWith(1, true);
        expect(toast.success).toHaveBeenCalledWith(
          "Test Group archived. Find it in the Archived tab.",
        );
      });
    });

    it("prevents navigation when the archive button is clicked", async () => {
      (setGroupArchivedForMe as jest.Mock).mockResolvedValue({
        success: true,
      });
      const user = userEvent.setup();

      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({ canManage: false })}
        />,
      );

      await user.click(screen.getByRole("button", { name: /archive group/i }));

      expectLinkNavigationBlocked();
    });

    it("shows an error toast when the action fails", async () => {
      (setGroupArchivedForMe as jest.Mock).mockResolvedValue({
        success: false,
      });
      const user = userEvent.setup();

      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({ canManage: false })}
        />,
      );

      await user.click(screen.getByRole("button", { name: /archive group/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Couldn't update Test Group. Please try again.",
        );
      });
    });

    it("ignores a second click while pending, and shows aria-busy", async () => {
      let resolvePromise: (value: { success: true }) => void;
      const pending = new Promise<{ success: true }>((resolve) => {
        resolvePromise = resolve;
      });
      (setGroupArchivedForMe as jest.Mock).mockReturnValue(pending);
      const user = userEvent.setup();

      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({ canManage: false })}
        />,
      );

      const button = screen.getByRole("button", { name: /archive group/i });
      await user.click(button);
      await user.click(button);

      expect(button).toHaveAttribute("aria-busy", "true");
      expect(setGroupArchivedForMe).toHaveBeenCalledTimes(1);

      resolvePromise!({ success: true });
      await waitFor(() => expect(button).toHaveAttribute("aria-busy", "false"));
    });
  });

  describe("Archive Controls - Active tabs, manager/admin/creator", () => {
    it("shows a dropdown with Archive for me and Archive for all members", async () => {
      const user = userEvent.setup();
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({ canManage: true })}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: /archive options/i }),
      );

      expect(
        screen.getByRole("menuitem", { name: "Archive for me" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: "Archive for all members" }),
      ).toBeInTheDocument();
      expectLinkNavigationBlocked();
    });

    it("calls setGroupArchivedForMe when choosing Archive for me, and closes the menu", async () => {
      (setGroupArchivedForMe as jest.Mock).mockResolvedValue({
        success: true,
      });
      const user = userEvent.setup();

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({ canManage: true })}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: /archive options/i }),
      );
      await user.click(
        screen.getByRole("menuitem", { name: "Archive for me" }),
      );

      await waitFor(() => {
        expect(setGroupArchivedForMe).toHaveBeenCalledWith(1, true);
      });
      expect(archiveGroup).not.toHaveBeenCalled();
      // Selecting an item must close the dropdown (Radix's default
      // behavior, which relies on onSelect not calling preventDefault).
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expectLinkNavigationBlocked();
    });

    it("opens a confirm dialog for Archive for all members, and confirming calls archiveGroup(group, true), closes the dialog, and returns focus to the trigger", async () => {
      (archiveGroup as jest.Mock).mockResolvedValue({ success: true });
      const user = userEvent.setup();

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({ canManage: true })}
        />,
      );

      const trigger = screen.getByRole("button", { name: /archive options/i });
      await user.click(trigger);
      await user.click(
        screen.getByRole("menuitem", { name: "Archive for all members" }),
      );

      // Choosing the item both closes the menu and opens the dialog.
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(
        screen.getByRole("alertdialog", { name: /archive for all members/i }),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Archive for all members" }),
      );

      await waitFor(() => {
        expect(archiveGroup).toHaveBeenCalledWith(mockGroup, true);
        expect(toast.success).toHaveBeenCalledWith(
          "Test Group archived for all members.",
        );
      });
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await waitFor(() => expect(trigger).toHaveFocus());
      expectLinkNavigationBlocked();
    });

    it("calls nothing when the Archive for all members dialog is cancelled, closes the dialog, and returns focus to the trigger", async () => {
      const user = userEvent.setup();

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({ canManage: true })}
        />,
      );

      const trigger = screen.getByRole("button", { name: /archive options/i });
      await user.click(trigger);
      await user.click(
        screen.getByRole("menuitem", { name: "Archive for all members" }),
      );
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(archiveGroup).not.toHaveBeenCalled();
      expect(setGroupArchivedForMe).not.toHaveBeenCalled();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await waitFor(() => expect(trigger).toHaveFocus());
      expectLinkNavigationBlocked();
    });
  });

  describe("Archive Controls - Archived tab, personal archive only", () => {
    it("shows an Unarchive button that calls setGroupArchivedForMe(id, false)", async () => {
      (setGroupArchivedForMe as jest.Mock).mockResolvedValue({
        success: true,
      });
      const user = userEvent.setup();

      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({
            archivedForMe: true,
            isEffectivelyArchived: true,
            canManage: false,
          })}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Unarchive" }));

      await waitFor(() => {
        expect(setGroupArchivedForMe).toHaveBeenCalledWith(1, false);
        expect(toast.success).toHaveBeenCalledWith("Test Group unarchived.");
      });
      expectLinkNavigationBlocked();
    });
  });

  describe("Archive Controls - Archived tab, archived for everyone", () => {
    it("shows 'Archived by a group admin' text and no button for a plain member", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="member"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({
            archivedForEveryone: true,
            isEffectivelyArchived: true,
            canManage: false,
          })}
        />,
      );

      expect(screen.getByText("Archived by a group admin")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows Unarchive for all members for a manager, and confirming calls archiveGroup(group, false), closes the dialog, and returns focus to the trigger", async () => {
      (archiveGroup as jest.Mock).mockResolvedValue({ success: true });
      // jsdom doesn't compute the CSS Radix relies on to re-enable pointer
      // events on the dialog content once it opens (the body itself is
      // marked pointer-events: none while a modal is open, and the trigger
      // button behind it shares the same accessible name), so pointer-events
      // assertions are disabled for this test.
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({
            archivedForEveryone: true,
            isEffectivelyArchived: true,
            canManage: true,
          })}
        />,
      );

      const trigger = screen.getByRole("button", {
        name: "Unarchive for all members",
      });
      await user.click(trigger);

      const dialog = screen.getByRole("alertdialog", {
        name: /unarchive for all members/i,
      });
      expect(dialog).toBeInTheDocument();

      const confirmButton = within(dialog).getByRole("button", {
        name: "Unarchive for all members",
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(archiveGroup).toHaveBeenCalledWith(mockGroup, false);
        expect(toast.success).toHaveBeenCalledWith(
          "Test Group restored for all members.",
        );
      });
      expect(setGroupArchivedForMe).not.toHaveBeenCalled();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await waitFor(() => expect(trigger).toHaveFocus());
      expectLinkNavigationBlocked();
    });

    it("calls nothing when the Unarchive for all members dialog is cancelled, closes the dialog, and returns focus to the trigger", async () => {
      const user = userEvent.setup();

      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
          archiveState={makeArchiveState({
            archivedForEveryone: true,
            isEffectivelyArchived: true,
            canManage: true,
          })}
        />,
      );

      const trigger = screen.getByRole("button", {
        name: "Unarchive for all members",
      });
      await user.click(trigger);
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(archiveGroup).not.toHaveBeenCalled();
      expect(setGroupArchivedForMe).not.toHaveBeenCalled();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await waitFor(() => expect(trigger).toHaveFocus());
      expectLinkNavigationBlocked();
    });
  });

  describe("Accessibility", () => {
    it("has accessible link to group page", () => {
      render(
        <GroupCard
          group={mockGroup}
          role="admin"
          roleColors={mockRoleColors}
        />,
      );

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });

    // Buttons nested inside the card's <a> must cancel the click's default
    // action, or the anchor's native activation does a full-page navigation
    // (jsdom never navigates, so the Link mock alone can't catch this).
    // fireEvent returns false when the event's default was prevented.
    it.each([
      {
        label: "plain-member Archive button",
        archiveState: makeArchiveState(),
        name: "Archive group",
      },
      {
        label: "manager archive menu trigger",
        archiveState: makeArchiveState({ canManage: true }),
        name: "Archive options",
      },
      {
        label: "Unarchive for all members button",
        archiveState: makeArchiveState({
          archivedForEveryone: true,
          isEffectivelyArchived: true,
          canManage: true,
        }),
        name: "Unarchive for all members",
      },
      {
        label: "personal Unarchive button",
        archiveState: makeArchiveState({
          archivedForMe: true,
          isEffectivelyArchived: true,
        }),
        name: "Unarchive",
      },
    ])(
      "$label cancels the anchor's native navigation",
      ({ archiveState, name }) => {
        render(
          <GroupCard
            group={mockGroup}
            role="member"
            roleColors={mockRoleColors}
            archiveState={archiveState}
          />,
        );

        const button = screen.getByRole("button", { name });
        expect(fireEvent.click(button)).toBe(false);
      },
    );
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
        />,
      );

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
        />,
      );

      expect(
        screen.getByText(
          "This is a very long group name that might cause layout issues",
        ),
      ).toBeInTheDocument();
    });
  });
});
