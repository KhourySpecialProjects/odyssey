import { render, screen } from "@testing-library/react";
import { DropletBlock } from "@/components/admin/droplets/droplet-block";
import { DropletStatus, DropletType, FocusArea } from "@/types";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/requests/droplet", () => ({
  updateDroplet: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock useFormStatus
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => ({ pending: false }),
}));

describe("DropletBlock", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "frontend" as FocusArea,
    type: "lesson" as DropletType,
    status: "published" as DropletStatus,
    learningObjectives: [],
    droplet_lessons: [],
    tags: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders droplet name correctly", () => {
      render(<DropletBlock droplet={mockDroplet} />);
      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("shows (Hidden) text when droplet is hidden", () => {
      const hiddenDroplet = { ...mockDroplet, isHidden: true };
      render(<DropletBlock droplet={hiddenDroplet} />);
      expect(screen.getByText("Test Droplet (Hidden)")).toBeInTheDocument();
    });

    it("does not show (Hidden) text when droplet is visible", () => {
      render(<DropletBlock droplet={mockDroplet} />);
      expect(
        screen.queryByText("Test Droplet (Hidden)"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("renders link to draft droplet page", () => {
      const { container } = render(<DropletBlock droplet={mockDroplet} />);
      const link = container.querySelector('a[href="/draft/d/test-droplet"]');
      expect(link).toBeInTheDocument();
    });

    describe("Button States", () => {
      it('shows "Hide Droplet" button when droplet is visible', () => {
        render(<DropletBlock droplet={mockDroplet} />);
        expect(
          screen.getByRole("button", { name: /hide droplet/i }),
        ).toBeInTheDocument();
      });

      it('shows "Show Droplet" button when droplet is hidden', () => {
        const hiddenDroplet = { ...mockDroplet, isHidden: true };
        render(<DropletBlock droplet={hiddenDroplet} />);
        expect(
          screen.getByRole("button", { name: /show droplet/i }),
        ).toBeInTheDocument();
      });

      it("shows correct button text based on droplet visibility", () => {
        render(<DropletBlock droplet={mockDroplet} />);
        expect(
          screen.getByRole("button", { name: "Hide Droplet" }),
        ).toBeInTheDocument();
      });

      it("shows Edit Droplet tooltip", () => {
        render(<DropletBlock droplet={mockDroplet} />);
        expect(screen.getByText("Edit Droplet")).toBeInTheDocument();
      });

      it("button is not disabled by default", () => {
        render(<DropletBlock droplet={mockDroplet} />);
        const hideButton = screen.getByRole("button", {
          name: /hide droplet/i,
        });
        expect(hideButton).toHaveAttribute("aria-disabled", "false");
      });
    });

    describe("Different Droplet Properties", () => {
      it("renders droplet with different focus areas", () => {
        const backendDroplet = {
          ...mockDroplet,
          focusArea: "backend" as FocusArea,
        };
        render(<DropletBlock droplet={backendDroplet} />);
        expect(screen.getByText("Test Droplet")).toBeInTheDocument();
      });

      it("renders droplet with different types", () => {
        const projectDroplet = {
          ...mockDroplet,
          type: "project" as DropletType,
        };
        render(<DropletBlock droplet={projectDroplet} />);
        expect(screen.getByText("Test Droplet")).toBeInTheDocument();
      });

      it("renders droplet with different statuses", () => {
        const draftDroplet = {
          ...mockDroplet,
          status: "draft" as DropletStatus,
        };
        render(<DropletBlock droplet={draftDroplet} />);
        expect(screen.getByText("Test Droplet")).toBeInTheDocument();
      });

      it("renders droplet with long name", () => {
        const longNameDroplet = {
          ...mockDroplet,
          name: "This is a very long droplet name that should still render correctly",
        };
        render(<DropletBlock droplet={longNameDroplet} />);
        expect(
          screen.getByText(
            "This is a very long droplet name that should still render correctly",
          ),
        ).toBeInTheDocument();
      });

      it("renders droplet with special characters in name", () => {
        const specialNameDroplet = {
          ...mockDroplet,
          name: "Test & Special <Droplet>",
        };
        render(<DropletBlock droplet={specialNameDroplet} />);
        expect(
          screen.getByText("Test & Special <Droplet>"),
        ).toBeInTheDocument();
      });

      it("renders droplet with tags", () => {
        const dropletWithTags = {
          ...mockDroplet,
          tags: [
            { id: 1, name: "Tag 1" } as any,
            { id: 2, name: "Tag 2" } as any,
          ] as any,
        };

        render(<DropletBlock droplet={dropletWithTags} />);
        expect(screen.getByText("Test Droplet")).toBeInTheDocument();
      });

      it("renders droplet without tags", () => {
        const dropletWithoutTags = {
          ...mockDroplet,
          tags: undefined as any,
        };

        render(<DropletBlock droplet={dropletWithoutTags} />);
        expect(screen.getByText("Test Droplet")).toBeInTheDocument();
      });
    });

    describe("Link Generation", () => {
      it("generates correct draft link for different slugs", () => {
        const { container } = render(
          <DropletBlock droplet={{ ...mockDroplet, slug: "my-custom-slug" }} />,
        );
        const link = container.querySelector(
          'a[href="/draft/d/my-custom-slug"]',
        );
        expect(link).toBeInTheDocument();
      });

      it("handles slug with special characters", () => {
        const { container } = render(
          <DropletBlock
            droplet={{ ...mockDroplet, slug: "slug-with-numbers-123" }}
          />,
        );
        const link = container.querySelector(
          'a[href="/draft/d/slug-with-numbers-123"]',
        );
        expect(link).toBeInTheDocument();
      });
    });

    describe("Form Structure", () => {
      it("includes hidden input for droplet id", () => {
        const { container } = render(<DropletBlock droplet={mockDroplet} />);
        const idInput = container.querySelector('input[name="id"]');
        expect(idInput).toHaveAttribute("value", "1");
        expect(idInput).toHaveAttribute("type", "number");
      });

      it("includes hidden input for isHidden value", () => {
        const { container } = render(<DropletBlock droplet={mockDroplet} />);
        const isHiddenInput = container.querySelector('input[name="isHidden"]');
        expect(isHiddenInput).toHaveAttribute("value", "true"); // Will be toggled to true
        expect(isHiddenInput).toHaveAttribute("type", "text");
      });

      it("updates isHidden input value for hidden droplet", () => {
        const hiddenDroplet = { ...mockDroplet, isHidden: true };
        const { container } = render(<DropletBlock droplet={hiddenDroplet} />);
        const isHiddenInput = container.querySelector('input[name="isHidden"]');
        expect(isHiddenInput).toHaveAttribute("value", "false"); // Will be toggled to false
      });

      it("form contains submit button", () => {
        const { container } = render(<DropletBlock droplet={mockDroplet} />);
        const form = container.querySelector("form");
        const submitButton = form?.querySelector('button[type="submit"]');
        expect(submitButton).toBeInTheDocument();
      });
    });

    describe("Button Variants", () => {
      it("applies destructive variant to Hide button", () => {
        render(<DropletBlock droplet={mockDroplet} />);
        const hideButton = screen.getByRole("button", {
          name: /hide droplet/i,
        });
        expect(hideButton).toHaveClass("bg-red-500");
      });

      it("applies link variant to Show button", () => {
        const hiddenDroplet = { ...mockDroplet, isHidden: true };
        render(<DropletBlock droplet={hiddenDroplet} />);
        const showButton = screen.getByRole("button", {
          name: /show droplet/i,
        });
        expect(showButton).toHaveClass("underline-offset-4");
      });
    });

    describe("Edge Cases", () => {
      it("handles droplet with undefined learning objectives", () => {
        const dropletWithUndefinedObjectives = {
          ...mockDroplet,
          learningObjectives: undefined as any,
        };
        render(<DropletBlock droplet={dropletWithUndefinedObjectives} />);
        expect(screen.getByText("Test Droplet")).toBeInTheDocument();
      });

      it("handles droplet with undefined droplet_lessons", () => {
        const dropletWithUndefinedLessons = {
          ...mockDroplet,
          droplet_lessons: undefined as any,
        };
        render(<DropletBlock droplet={dropletWithUndefinedLessons} />);
        expect(screen.getByText("Test Droplet")).toBeInTheDocument();
      });

      it("renders correctly with minimal droplet data", () => {
        const minimalDroplet = {
          id: 999,
          name: "Minimal Droplet",
          slug: "minimal",
          isHidden: false,
          focusArea: "frontend" as FocusArea,
          type: "lesson" as DropletType,
          status: "published" as DropletStatus,
          learningObjectives: [],
          droplet_lessons: [],
          tags: [],
        };
        render(<DropletBlock droplet={minimalDroplet} />);
        expect(screen.getByText("Minimal Droplet")).toBeInTheDocument();
      });

      it("handles droplet with empty string name", () => {
        const emptyNameDroplet = { ...mockDroplet, name: "" };
        render(<DropletBlock droplet={emptyNameDroplet} />);
        // Should render without crashing
        expect(
          screen.getByRole("button", { name: /hide droplet/i }),
        ).toBeInTheDocument();
      });
    });

    describe("Accessibility", () => {
      it("has proper aria-disabled attribute", () => {
        render(<DropletBlock droplet={mockDroplet} />);
        const button = screen.getByRole("button", { name: /hide droplet/i });
        expect(button).toHaveAttribute("aria-disabled");
      });
    });
  });
});
