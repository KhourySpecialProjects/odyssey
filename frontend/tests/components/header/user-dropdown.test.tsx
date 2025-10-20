import { render, screen, fireEvent } from "@testing-library/react";
import { UserDropdown } from "@/components/header/user-dropdown";
import { TimeZone } from "@/types";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { signOut } from "next-auth/react";

jest.mock("next-auth/react", () => ({
  signOut: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe("UserDropdown", () => {
  const mockUser = {
    name: "Test User",
    email: "test@northeastern.edu",
    roles: [AuthorizedUserRoleTitle.Faculty],
    isActive: true,
  };

  const mockAuthorizedUser = {
    id: 1,
    email: "user@northeastern.edu",
    firstName: "John",
    lastName: "Doe",
    bio: "Test bio",
    profilePhoto: "https://example.com/photo.jpg",
    isEnabled: true,
    isPublic: true,
    roles: [{ id: 1, title: AuthorizedUserRoleTitle.Faculty }],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders user information", () => {
      render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      expect(screen.getByText(/hi/i)).toBeInTheDocument();
    });

    it("renders dropdown trigger", () => {
      const { container } = render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      const trigger = container.querySelector('[type="button"]');
      expect(trigger).toBeInTheDocument();
    });

    it("renders user avatar component", () => {
      const { container } = render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      // Check for avatar container instead of img
      const avatarContainer = container.querySelector(
        ".relative.flex.aspect-square",
      );
      expect(avatarContainer).toBeInTheDocument();
    });

    it("renders ChevronDown icon", () => {
      const { container } = render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      const chevron = container.querySelector(".trigger-icon");
      expect(chevron).toBeInTheDocument();
    });

    it("applies correct styling to trigger", () => {
      const { container } = render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      const trigger = container.querySelector(".group");
      expect(trigger).toHaveClass("cursor-pointer");
      expect(trigger).toHaveClass("rounded-lg");
    });
  });

  describe("User Display", () => {
    it("displays firstName from authorizedUser when available", () => {
      render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      expect(screen.getByText(/John/)).toBeInTheDocument();
    });

    it("displays user.name when authorizedUser.firstName is not available", () => {
      const userWithoutFirstName = {
        ...mockAuthorizedUser,
        firstName: undefined,
      };

      render(
        <UserDropdown
          user={mockUser}
          authorizedUser={userWithoutFirstName as any}
        />,
      );

      expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });

    it("displays user.email when neither firstName nor name is available", () => {
      const userWithoutName = {
        ...mockUser,
        name: undefined,
      };

      render(
        <UserDropdown user={userWithoutName as any} authorizedUser={null} />,
      );

      expect(screen.getByText(/test@northeastern.edu/)).toBeInTheDocument();
    });

    it("displays user initials when name is available", () => {
      render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      expect(screen.getByText("TU")).toBeInTheDocument();
    });

    it("displays User2Icon when name is not available", () => {
      const userWithoutName = {
        ...mockUser,
        name: undefined,
      };

      const { container } = render(
        <UserDropdown user={userWithoutName as any} authorizedUser={null} />,
      );

      // Should render User2Icon in avatar fallback
      const avatarFallback = container.querySelector("span span");
      expect(avatarFallback).toBeInTheDocument();
    });

    it("renders avatar with profile photo URL", () => {
      render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      // Avatar component should be rendered
      expect(screen.getByText("TU")).toBeInTheDocument();
    });

    it("renders avatar when user.image is provided", () => {
      const userWithImage = {
        ...mockUser,
        image: "https://example.com/user-image.jpg",
      };

      render(
        <UserDropdown user={userWithImage as any} authorizedUser={null} />,
      );

      // Avatar component should be rendered with fallback initials
      expect(screen.getByText("TU")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles null authorizedUser", () => {
      render(<UserDropdown user={mockUser} authorizedUser={null} />);

      expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });

    it("handles user without name", () => {
      const userWithoutName = {
        ...mockUser,
        name: undefined,
      };

      render(
        <UserDropdown user={userWithoutName as any} authorizedUser={null} />,
      );

      expect(screen.getByText(/test@northeastern.edu/)).toBeInTheDocument();
    });

    it("handles user with multiple roles", () => {
      const userWithMultipleRoles = {
        ...mockUser,
        roles: [
          AuthorizedUserRoleTitle.Faculty,
          AuthorizedUserRoleTitle.User,
          AuthorizedUserRoleTitle.SysAdmin,
        ],
      };

      render(
        <UserDropdown
          user={userWithMultipleRoles}
          authorizedUser={mockAuthorizedUser}
        />,
      );

      // Component should render without errors
      expect(screen.getByText(/John/)).toBeInTheDocument();
    });

    it("handles very long user names", () => {
      const userWithLongName = {
        ...mockUser,
        name: "This Is A Very Long User Name That Might Cause Layout Issues",
      };

      render(
        <UserDropdown
          user={userWithLongName}
          authorizedUser={mockAuthorizedUser}
        />,
      );

      // Long name appears in the greeting, but authorizedUser firstName is shown
      expect(screen.getByText(/John/)).toBeInTheDocument();
    });

    it("handles user names with special characters", () => {
      const userWithSpecialChars = {
        ...mockUser,
        name: "Test & User <Special>",
      };

      render(
        <UserDropdown
          user={userWithSpecialChars}
          authorizedUser={mockAuthorizedUser}
        />,
      );

      // Component should render without errors
      expect(screen.getByText(/John/)).toBeInTheDocument();
    });

    it("handles missing profile photo", () => {
      const authorizedUserWithoutPhoto = {
        ...mockAuthorizedUser,
        profilePhoto: undefined,
      };

      render(
        <UserDropdown
          user={mockUser}
          authorizedUser={authorizedUserWithoutPhoto as any}
        />,
      );

      // Should fall back to initials
      expect(screen.getByText("TU")).toBeInTheDocument();
    });

    it("handles user without image or profile photo", () => {
      render(<UserDropdown user={mockUser} authorizedUser={null} />);

      // Should show initials
      expect(screen.getByText("TU")).toBeInTheDocument();
    });

    it("handles undefined authorizedUser firstName", () => {
      const authUserWithoutFirstName = {
        ...mockAuthorizedUser,
        firstName: undefined,
      };

      render(
        <UserDropdown
          user={mockUser}
          authorizedUser={authUserWithoutFirstName as any}
        />,
      );

      // Should fall back to user.name
      expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });

    it("handles user with nuid", () => {
      const userWithNuid = {
        ...mockUser,
        nuid: "001234567",
      };

      render(
        <UserDropdown
          user={userWithNuid as any}
          authorizedUser={mockAuthorizedUser}
        />,
      );

      // Component should render
      expect(screen.getByText(/John/)).toBeInTheDocument();
    });

    it("handles email without northeastern.edu domain", () => {
      const userWithOtherEmail = {
        ...mockUser,
        email: "test@example.com",
      };

      render(
        <UserDropdown
          user={userWithOtherEmail}
          authorizedUser={mockAuthorizedUser}
        />,
      );

      // Component should render
      expect(screen.getByText(/John/)).toBeInTheDocument();
    });
  });

  describe("Trigger Styling", () => {
    it("applies hover styles to trigger", () => {
      const { container } = render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      const trigger = container.querySelector(".group");
      expect(trigger).toHaveClass("hover:bg-slate-100");
      expect(trigger).toHaveClass("dark:hover:bg-white/5");
    });

    it("applies transition classes", () => {
      const { container } = render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      const trigger = container.querySelector(".group");
      expect(trigger).toHaveClass("transition-colors");
    });

    it("has aria attributes for accessibility", () => {
      const { container } = render(
        <UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />,
      );

      const trigger = container.querySelector('[type="button"]');
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });
});
