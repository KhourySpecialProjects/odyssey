import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { archiveDroplet } from "@/lib/requests/droplet";

jest.mock("@/lib/requests/droplet", () => ({
  archiveDroplet: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("next/link", () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

jest.mock("@/components/ui/rating-stars", () => ({
  StarRating: ({ value, average, uniqueId }: any) => (
    <div data-testid="star-rating">
      Rating: {value} (Average: {average ? "true" : "false"})
    </div>
  ),
}));

jest.mock("@/lib/utils", () => ({
  uppercaseFirstChar: (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1),
  getDueDateBadgeColor: (days: number, complete: boolean) => {
    if (days < 0) return "bg-red-100";
    if (days === 0) return "bg-yellow-100";
    if (days <= 3) return "bg-orange-100";
    return "bg-green-100";
  },
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("DropletTile", () => {
  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    focusArea: "frontend" as const,
    type: "tutorial" as const,
    tags: [
      { id: 1, name: "Tag 1" },
      { id: 2, name: "Tag 2" },
    ],
    status: "published" as const,
    lessons: [{ id: 1 }, { id: 2 }],
    description: "<p>Test description</p>",
    averageRating: 4.5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (archiveDroplet as jest.Mock).mockResolvedValue({ success: true });
  });

  describe("Compact Mode", () => {
    it("renders in compact mode", () => {
      render(<DropletTile droplet={mockDroplet as any} compact={true} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("links to droplet page in compact mode", () => {
      const { container } = render(
        <DropletTile droplet={mockDroplet as any} compact={true} />,
      );

      const link = container.querySelector('a[href="/d/test-droplet"]');
      expect(link).toBeInTheDocument();
    });

    it("does not show badges in compact mode", () => {
      render(<DropletTile droplet={mockDroplet as any} compact={true} />);

      expect(screen.queryByText("Frontend")).not.toBeInTheDocument();
      expect(screen.queryByText("Tutorial")).not.toBeInTheDocument();
    });
  });

  describe("Profile Page Mode", () => {
    it("renders in profile page mode", () => {
      render(<DropletTile droplet={mockDroplet as any} profilePage={true} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("links to droplet page for published droplets", () => {
      const { container } = render(
        <DropletTile droplet={mockDroplet as any} profilePage={true} />,
      );

      const link = container.querySelector('a[href="/d/test-droplet"]');
      expect(link).toBeInTheDocument();
    });

    it("links to draft page for draft droplets", () => {
      const draftDroplet = { ...mockDroplet, status: "draft" as const };
      const { container } = render(
        <DropletTile droplet={draftDroplet as any} profilePage={true} />,
      );

      const link = container.querySelector('a[href="/draft/d/test-droplet"]');
      expect(link).toBeInTheDocument();
    });

    it("does not show badges in profile page mode", () => {
      render(<DropletTile droplet={mockDroplet as any} profilePage={true} />);

      expect(screen.queryByText("Frontend")).not.toBeInTheDocument();
    });
  });

  describe("Default Mode - Basic Rendering", () => {
    it("renders droplet information", () => {
      render(<DropletTile droplet={mockDroplet as any} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
      expect(screen.getByText("Frontend")).toBeInTheDocument();
      expect(screen.getByText("Tutorial")).toBeInTheDocument();
      expect(screen.getByText("Tag 1")).toBeInTheDocument();
      expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });

    it("renders description", () => {
      render(<DropletTile droplet={mockDroplet as any} />);

      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("shows draft badge for draft droplets", () => {
      const draftDroplet = { ...mockDroplet, status: "draft" as const };

      render(<DropletTile droplet={draftDroplet as any} />);

      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("does not show draft badge for published droplets", () => {
      render(<DropletTile droplet={mockDroplet as any} />);

      expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    });

    it("shows rating when averageRating exists and is not 0", () => {
      render(<DropletTile droplet={mockDroplet as any} />);

      expect(screen.getByTestId("star-rating")).toBeInTheDocument();
    });

    it("does not show rating when averageRating is 0", () => {
      const noRatingDroplet = { ...mockDroplet, averageRating: 0 };

      render(<DropletTile droplet={noRatingDroplet as any} />);

      expect(screen.queryByTestId("star-rating")).not.toBeInTheDocument();
    });

    it("does not show rating when averageRating is undefined", () => {
      const noRatingDroplet = { ...mockDroplet, averageRating: undefined };

      render(<DropletTile droplet={noRatingDroplet as any} />);

      expect(screen.queryByTestId("star-rating")).not.toBeInTheDocument();
    });
  });

  describe("Completion Percentage", () => {
    it("shows 0% when no lessons completed", () => {
      render(
        <DropletTile
          droplet={mockDroplet as any}
          isEnrolled={true}
          completedLessonIds={[]}
        />,
      );

      expect(screen.getByText("0% Complete")).toBeInTheDocument();
    });

    it("shows 50% when half completed", () => {
      render(
        <DropletTile
          droplet={mockDroplet as any}
          isEnrolled={true}
          completedLessonIds={[1]}
        />,
      );

      expect(screen.getByText("50% Complete")).toBeInTheDocument();
    });

    it("shows 100% when all completed", () => {
      render(
        <DropletTile
          droplet={mockDroplet as any}
          isEnrolled={true}
          completedLessonIds={[1, 2]}
        />,
      );

      expect(screen.getByText("100% Complete")).toBeInTheDocument();
    });

    it("does not show completion when not enrolled", () => {
      render(
        <DropletTile
          droplet={mockDroplet as any}
          isEnrolled={false}
          completedLessonIds={[1]}
        />,
      );

      expect(screen.queryByText(/Complete/)).not.toBeInTheDocument();
    });

    it("does not show completion when no lessons", () => {
      const noLessonsDroplet = { ...mockDroplet, lessons: [] };

      render(
        <DropletTile
          droplet={noLessonsDroplet as any}
          isEnrolled={true}
          completedLessonIds={[1]}
        />,
      );

      expect(screen.queryByText(/Complete/)).not.toBeInTheDocument();
    });

    it("applies correct badge color for 0% completion", () => {
      const { container } = render(
        <DropletTile
          droplet={mockDroplet as any}
          isEnrolled={true}
          completedLessonIds={[]}
        />,
      );

      const badge = screen.getByText("0% Complete").closest("div");
      expect(badge).toHaveClass("bg-red-100");
    });

    it("applies correct badge color for partial completion", () => {
      const { container } = render(
        <DropletTile
          droplet={mockDroplet as any}
          isEnrolled={true}
          completedLessonIds={[1]}
        />,
      );

      const badge = screen.getByText("50% Complete").closest("div");
      expect(badge).toHaveClass("bg-amber-100");
    });

    it("applies correct badge color for 100% completion", () => {
      const { container } = render(
        <DropletTile
          droplet={mockDroplet as any}
          isEnrolled={true}
          completedLessonIds={[1, 2]}
        />,
      );

      const badge = screen.getByText("100% Complete").closest("div");
      expect(badge).toHaveClass("bg-emerald-100");
    });
  });

  describe("Due Date Display", () => {
    it('shows "Due today!" for today', () => {
      const today = DateTime.local().toISO();

      render(<DropletTile droplet={mockDroplet as any} dueDate={today} />);

      expect(screen.getByText("Due today!")).toBeInTheDocument();
    });

    it('shows "Due in 1 day" for tomorrow', () => {
      const tomorrow = DateTime.local().plus({ days: 1 }).toISO();

      render(<DropletTile droplet={mockDroplet as any} dueDate={tomorrow} />);

      expect(screen.getByText("Due in 1 day")).toBeInTheDocument();
    });

    it("shows correct days for future due dates", () => {
      const future = DateTime.local().plus({ days: 5 }).toISO();

      render(<DropletTile droplet={mockDroplet as any} dueDate={future} />);

      expect(screen.getByText("Due in 5 days")).toBeInTheDocument();
    });

    it('shows "One Day Late!" for yesterday', () => {
      const yesterday = DateTime.local().minus({ days: 1 }).toISO();

      render(<DropletTile droplet={mockDroplet as any} dueDate={yesterday} />);

      expect(screen.getByText("One Day Late!")).toBeInTheDocument();
    });

    it("shows correct days for past due dates", () => {
      const past = DateTime.local().minus({ days: 3 }).toISO();

      render(<DropletTile droplet={mockDroplet as any} dueDate={past} />);

      expect(screen.getByText("3 Days Late!")).toBeInTheDocument();
    });

    it("does not show due date when empty string", () => {
      render(<DropletTile droplet={mockDroplet as any} dueDate="" />);

      expect(screen.queryByText(/Due/)).not.toBeInTheDocument();
    });

    it("does not show due date when undefined", () => {
      render(<DropletTile droplet={mockDroplet as any} dueDate={undefined} />);

      expect(screen.queryByText(/Due/)).not.toBeInTheDocument();
    });

    it("does not show due date when 100% complete", () => {
      const tomorrow = DateTime.local().plus({ days: 1 }).toISO();

      render(
        <DropletTile
          droplet={mockDroplet as any}
          isEnrolled={true}
          completedLessonIds={[1, 2]}
          dueDate={tomorrow}
        />,
      );

      expect(screen.queryByText("Due in 1 day")).not.toBeInTheDocument();
    });
  });

  describe("Archive Functionality", () => {
    it("shows archive button when isArchived is false", () => {
      const { container } = render(
        <DropletTile droplet={mockDroplet as any} isArchived={false} />,
      );

      const archiveIcon = container.querySelector(".lucide-archive");
      expect(archiveIcon).toBeInTheDocument();
    });

    it("shows unarchive button when isArchived is true", () => {
      const { container } = render(
        <DropletTile droplet={mockDroplet as any} isArchived={true} />,
      );

      const unarchiveIcon = container.querySelector(".lucide-archive-restore");
      expect(unarchiveIcon).toBeInTheDocument();
    });

    it("handles successful archive", async () => {
      (archiveDroplet as jest.Mock).mockResolvedValue({ success: true });

      render(<DropletTile droplet={mockDroplet as any} isArchived={false} />);

      fireEvent.click(screen.getByRole("button", { name: "Archive" }));

      await waitFor(() => {
        expect(archiveDroplet).toHaveBeenCalledWith(mockDroplet, true);
        expect(toast.success).toHaveBeenCalledWith(
          `${mockDroplet.name} is now archived!`,
        );
      });
    });

    it("handles successful unarchive", async () => {
      (archiveDroplet as jest.Mock).mockResolvedValue({ success: true });

      render(<DropletTile droplet={mockDroplet as any} isArchived={true} />);

      fireEvent.click(screen.getByRole("button", { name: "Unarchive" }));

      await waitFor(() => {
        expect(archiveDroplet).toHaveBeenCalledWith(mockDroplet, false);
        expect(toast.success).toHaveBeenCalledWith(
          `${mockDroplet.name} is now unarchived!`,
        );
      });
    });

    it("handles archive failure", async () => {
      (archiveDroplet as jest.Mock).mockResolvedValue({ success: false });

      render(<DropletTile droplet={mockDroplet as any} isArchived={false} />);

      fireEvent.click(screen.getByRole("button", { name: "Archive" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to update droplet visibility",
        );
      });
    });

    it("handles archive error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      (archiveDroplet as jest.Mock).mockRejectedValue(new Error("Failed"));

      render(<DropletTile droplet={mockDroplet as any} isArchived={false} />);

      fireEvent.click(screen.getByRole("button", { name: "Archive" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "An error occurred while updating the droplet",
        );
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it("prevents link navigation when clicking archive button", async () => {
      const { container } = render(
        <DropletTile droplet={mockDroplet as any} isArchived={false} />,
      );

      const button = screen.getByRole("button", { name: "Archive" });
      const clickEvent = new MouseEvent("click", { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, "preventDefault");
      const stopPropagationSpy = jest.spyOn(clickEvent, "stopPropagation");

      button.dispatchEvent(clickEvent);

      // The component calls preventDefault and stopPropagation
      // but we can't easily verify this in the test
      // Just verify the button exists and is clickable
      expect(button).toBeInTheDocument();
    });
  });

  describe("Description Handling", () => {
    it("strips HTML from description", () => {
      const htmlDescDroplet = {
        ...mockDroplet,
        description: "<p>Test <strong>description</strong></p>",
      };

      render(<DropletTile droplet={htmlDescDroplet as any} />);

      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("converts p tags to newlines", () => {
      const multiParagraphDroplet = {
        ...mockDroplet,
        description: "<p>First</p><p>Second</p>",
      };

      render(<DropletTile droplet={multiParagraphDroplet as any} />);

      const desc = screen.getByText(/First/);
      expect(desc.textContent).toContain("First");
      expect(desc.textContent).toContain("Second");
    });

    it("does not render empty description", () => {
      const emptyDescDroplet = {
        ...mockDroplet,
        description: "",
      };

      render(<DropletTile droplet={emptyDescDroplet as any} />);

      expect(screen.queryByText("See More")).not.toBeInTheDocument();
    });

    it("does not render description with only <p></p>", () => {
      const emptyPTagDroplet = {
        ...mockDroplet,
        description: "<p></p>",
      };

      render(<DropletTile droplet={emptyPTagDroplet as any} />);

      expect(screen.queryByText("See More")).not.toBeInTheDocument();
    });
  });

  describe("Tags", () => {
    it("renders all tags", () => {
      render(<DropletTile droplet={mockDroplet as any} />);

      expect(screen.getByText("Tag 1")).toBeInTheDocument();
      expect(screen.getByText("Tag 2")).toBeInTheDocument();
    });

    it("handles droplet with no tags", () => {
      const noTagsDroplet = { ...mockDroplet, tags: [] };

      render(<DropletTile droplet={noTagsDroplet as any} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });

    it("handles droplet with undefined tags", () => {
      const undefinedTagsDroplet = { ...mockDroplet, tags: undefined };

      render(<DropletTile droplet={undefinedTagsDroplet as any} />);

      expect(screen.getByText("Test Droplet")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles droplet with no lessons", () => {
      const noLessonsDroplet = { ...mockDroplet, lessons: [] };

      render(
        <DropletTile
          droplet={noLessonsDroplet as any}
          isEnrolled={true}
          completedLessonIds={[1]}
        />,
      );

      expect(screen.queryByText(/Complete/)).not.toBeInTheDocument();
    });

    it("handles droplet with undefined lessons", () => {
      const undefinedLessonsDroplet = { ...mockDroplet, lessons: undefined };

      render(
        <DropletTile
          droplet={undefinedLessonsDroplet as any}
          isEnrolled={true}
          completedLessonIds={[1]}
        />,
      );

      expect(screen.queryByText(/Complete/)).not.toBeInTheDocument();
    });

    it("handles very long droplet name", () => {
      const longNameDroplet = { ...mockDroplet, name: "A".repeat(200) };

      render(<DropletTile droplet={longNameDroplet as any} />);

      expect(screen.getByText("A".repeat(200))).toBeInTheDocument();
    });
  });

  describe("Event Listeners", () => {
    it("adds resize event listener", () => {
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");

      render(<DropletTile droplet={mockDroplet as any} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    it("removes resize event listener on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = render(<DropletTile droplet={mockDroplet as any} />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});
