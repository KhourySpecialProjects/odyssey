import { render, screen } from "@testing-library/react";
import { GroupBlock } from "@/components/admin/groups/group-block";
import { GroupSemester } from "@/types";

jest.mock("next/link", () => {
  return ({
    children,
    href,
    target,
    rel,
  }: {
    children: React.ReactNode;
    href: string;
    target?: string;
    rel?: string;
  }) => (
    <a href={href} target={target} rel={rel}>
      {children}
    </a>
  );
});

jest.mock("@/lib/requests/groups", () => ({
  updateGroup: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock useFormStatus
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => ({ pending: false }),
}));

describe("GroupBlock", () => {
  const mockGroup = {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    isArchived: false,
    semester: "Spring 2025" as GroupSemester,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders group name correctly", () => {
      render(<GroupBlock group={mockGroup} />);
      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });

    it("shows (Archived) text when group is archived", () => {
      const archivedGroup = { ...mockGroup, isArchived: true };
      render(<GroupBlock group={archivedGroup} />);
      expect(screen.getByText(/test group.*archived/i)).toBeInTheDocument();
    });

    it("does not show (Archived) text when group is active", () => {
      render(<GroupBlock group={mockGroup} />);
      expect(
        screen.queryByText(/test group.*archived/i),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });

    it("renders link to group management page", () => {
      const { container } = render(<GroupBlock group={mockGroup} />);
      const link = container.querySelector(
        'a[href="/g/management?slug=test-group"]',
      );
      expect(link).toBeInTheDocument();
    });

    it("link opens in new tab", () => {
      const { container } = render(<GroupBlock group={mockGroup} />);
      const link = container.querySelector(
        'a[href="/g/management?slug=test-group"]',
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("shows Edit Group tooltip", () => {
      render(<GroupBlock group={mockGroup} />);
      expect(screen.getByText("Edit Group")).toBeInTheDocument();
    });
  });

  describe("Button States", () => {
    it('shows "Archive Group" button when group is not archived', () => {
      render(<GroupBlock group={mockGroup} />);
      expect(
        screen.getByRole("button", { name: /archive group/i }),
      ).toBeInTheDocument();
    });

    it('shows "Unarchive Group" button when group is archived', () => {
      const archivedGroup = { ...mockGroup, isArchived: true };
      render(<GroupBlock group={archivedGroup} />);
      expect(
        screen.getByRole("button", { name: /unarchive group/i }),
      ).toBeInTheDocument();
    });

    it("shows correct button text based on group archive status", () => {
      render(<GroupBlock group={mockGroup} />);
      expect(screen.getByText("Archive Group")).toBeInTheDocument();
    });

    it("button is not disabled by default", () => {
      render(<GroupBlock group={mockGroup} />);
      const archiveButton = screen.getByRole("button", {
        name: /archive group/i,
      });
      expect(archiveButton).toHaveAttribute("aria-disabled", "false");
    });
  });

  describe("Form Structure", () => {
    it("includes hidden input for group id", () => {
      const { container } = render(<GroupBlock group={mockGroup} />);
      const idInput = container.querySelector('input[name="id"]');
      expect(idInput).toHaveAttribute("value", "1");
      expect(idInput).toHaveAttribute("type", "number");
    });

    it("includes hidden input for isArchived value", () => {
      const { container } = render(<GroupBlock group={mockGroup} />);
      const isArchivedInput = container.querySelector(
        'input[name="isArchived"]',
      );
      expect(isArchivedInput).toHaveAttribute("value", "true"); // Will be toggled to true
      expect(isArchivedInput).toHaveAttribute("type", "text");
    });

    it("updates isArchived input value for archived group", () => {
      const archivedGroup = { ...mockGroup, isArchived: true };
      const { container } = render(<GroupBlock group={archivedGroup} />);
      const isArchivedInput = container.querySelector(
        'input[name="isArchived"]',
      );
      expect(isArchivedInput).toHaveAttribute("value", "false"); // Will be toggled to false
    });

    it("form has correct test id", () => {
      render(<GroupBlock group={mockGroup} />);
      expect(screen.getByTestId("group-form")).toBeInTheDocument();
    });

    it("form contains submit button", () => {
      const { container } = render(<GroupBlock group={mockGroup} />);
      const form = container.querySelector("form");
      const submitButton = form?.querySelector('button[type="submit"]');
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe("Button Variants", () => {
    it("applies destructive variant to Archive button", () => {
      render(<GroupBlock group={mockGroup} />);
      const archiveButton = screen.getByRole("button", {
        name: /archive group/i,
      });
      expect(archiveButton).toHaveClass("bg-red-500");
    });

    it("applies link variant to Unarchive button", () => {
      const archivedGroup = { ...mockGroup, isArchived: true };
      render(<GroupBlock group={archivedGroup} />);
      const unarchiveButton = screen.getByRole("button", {
        name: /unarchive group/i,
      });
      expect(unarchiveButton).toHaveClass("underline-offset-4");
    });

    it("button has correct width class", () => {
      render(<GroupBlock group={mockGroup} />);
      const button = screen.getByRole("button", { name: /archive group/i });
      expect(button).toHaveClass("w-28");
    });
  });

  describe("Different Group Properties", () => {
    it("renders group with different semesters", () => {
      const fallGroup = {
        ...mockGroup,
        semester: "Fall 2024" as GroupSemester,
      };
      render(<GroupBlock group={fallGroup} />);
      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });

    it("renders group with long name", () => {
      const longNameGroup = {
        ...mockGroup,
        groupName:
          "This is a very long group name that should still render correctly",
      };
      render(<GroupBlock group={longNameGroup} />);
      expect(
        screen.getByText(
          "This is a very long group name that should still render correctly",
        ),
      ).toBeInTheDocument();
    });

    it("renders group with special characters in name", () => {
      const specialNameGroup = {
        ...mockGroup,
        groupName: "Group & Special <Characters>",
      };
      render(<GroupBlock group={specialNameGroup} />);
      expect(
        screen.getByText("Group & Special <Characters>"),
      ).toBeInTheDocument();
    });

    it("handles group with different id", () => {
      const differentIdGroup = { ...mockGroup, id: 999 };
      const { container } = render(<GroupBlock group={differentIdGroup} />);
      const idInput = container.querySelector('input[name="id"]');
      expect(idInput).toHaveAttribute("value", "999");
    });
  });

  describe("Link Generation", () => {
    it("generates correct management link for different slugs", () => {
      const { container } = render(
        <GroupBlock group={{ ...mockGroup, slug: "my-custom-slug" }} />,
      );
      const link = container.querySelector(
        'a[href="/g/management?slug=my-custom-slug"]',
      );
      expect(link).toBeInTheDocument();
    });

    it("handles slug with special characters", () => {
      const { container } = render(
        <GroupBlock group={{ ...mockGroup, slug: "slug-with-numbers-123" }} />,
      );
      const link = container.querySelector(
        'a[href="/g/management?slug=slug-with-numbers-123"]',
      );
      expect(link).toBeInTheDocument();
    });

    it("handles slug with hyphens", () => {
      const { container } = render(
        <GroupBlock group={{ ...mockGroup, slug: "my-group-slug" }} />,
      );
      const link = container.querySelector(
        'a[href="/g/management?slug=my-group-slug"]',
      );
      expect(link).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles group with empty string name", () => {
      const emptyNameGroup = { ...mockGroup, groupName: "" };
      render(<GroupBlock group={emptyNameGroup} />);
      // Should render without crashing
      expect(
        screen.getByRole("button", { name: /archive group/i }),
      ).toBeInTheDocument();
    });

    it("renders correctly with minimal group data", () => {
      const minimalGroup = {
        id: 999,
        groupName: "Minimal Group",
        slug: "minimal",
        isArchived: false,
        semester: "Spring 2025" as GroupSemester,
      };
      render(<GroupBlock group={minimalGroup} />);
      expect(screen.getByText("Minimal Group")).toBeInTheDocument();
    });

    it("handles group with very long slug", () => {
      const longSlugGroup = {
        ...mockGroup,
        slug: "a".repeat(100),
      };
      const { container } = render(<GroupBlock group={longSlugGroup} />);
      const link = container.querySelector(
        `a[href="/g/management?slug=${"a".repeat(100)}"]`,
      );
      expect(link).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-disabled attribute", () => {
      render(<GroupBlock group={mockGroup} />);
      const button = screen.getByRole("button", { name: /archive group/i });
      expect(button).toHaveAttribute("aria-disabled");
    });

    it("edit link has proper rel attribute for security", () => {
      const { container } = render(<GroupBlock group={mockGroup} />);
      const link = container.querySelector(
        'a[href="/g/management?slug=test-group"]',
      );
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("button has correct type attribute", () => {
      render(<GroupBlock group={mockGroup} />);
      const button = screen.getByRole("button", { name: /archive group/i });
      expect(button).toHaveAttribute("type", "submit");
    });
  });

  describe("Multiple Instances", () => {
    it("can render group with different IDs", () => {
      const group1 = {
        ...mockGroup,
        id: 1,
        groupName: "Group 1",
        slug: "group-1",
      };

      render(<GroupBlock group={group1} />);
      expect(screen.getByText("Group 1")).toBeInTheDocument();
    });

    it("can render archived and active groups", () => {
      const activeGroup = { ...mockGroup, isArchived: false };

      const { unmount } = render(<GroupBlock group={activeGroup} />);
      expect(
        screen.getByRole("button", { name: /archive group/i }),
      ).toBeInTheDocument();

      unmount();

      const archivedGroup = { ...mockGroup, isArchived: true };
      render(<GroupBlock group={archivedGroup} />);
      expect(
        screen.getByRole("button", { name: /unarchive group/i }),
      ).toBeInTheDocument();
    });
  });
});
