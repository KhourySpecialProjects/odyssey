import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegenerateSlugButton } from "@/components/draft/metadata/regenerate-slug";
import { useRouter } from "next/navigation";
import { updateDroplet } from "@/lib/requests/droplet";
import { toast } from "sonner";
import { DropletStatus, DropletType, FocusArea, Tag } from "@/types";

jest.mock("@/lib/requests/droplet", () => ({
  updateDroplet: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("RegenerateSlugButton", () => {
  const mockRouter = { replace: jest.fn() };

  const mockDroplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    isHidden: false,
    focusArea: "personal" as FocusArea,
    type: "knowledge" as DropletType,
    tags: [{ id: 1, name: "React" }] as Tag[],
    learningObjectives: [],
    status: "draft" as DropletStatus,
    droplet_lessons: [],
    inReview: false,
    afterReview: false,
  } as any;

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders Change URL button", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      expect(screen.getByText("Change URL")).toBeInTheDocument();
    });

    it("renders Request Review button for draft droplets not in review", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      expect(screen.getByText("Request Review")).toBeInTheDocument();
    });

    it("shows Re-Request Review button when afterReview is true", () => {
      const afterReviewDroplet = { ...mockDroplet, afterReview: true } as any;

      render(
        <RegenerateSlugButton
          name="Test Droplet"
          droplet={afterReviewDroplet}
        />,
      );

      expect(screen.getByText("Re-Request Review")).toBeInTheDocument();
    });

    it("renders help icon with tooltip", () => {
      const { container } = render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      const helpIcon = container.querySelector(".lucide-circle-help");
      expect(helpIcon).toBeInTheDocument();
    });

    it("shows in review message when droplet is in review", () => {
      const inReviewDroplet = { ...mockDroplet, inReview: true } as any;

      render(
        <RegenerateSlugButton name="Test Droplet" droplet={inReviewDroplet} />,
      );

      expect(
        screen.getByText("Droplet currently in review"),
      ).toBeInTheDocument();
      expect(screen.queryByText("Request Review")).not.toBeInTheDocument();
    });

    it("does not show Request Review button for published droplets", () => {
      const publishedDroplet = {
        ...mockDroplet,
        status: "published" as DropletStatus,
      };

      render(
        <RegenerateSlugButton name="Test Droplet" droplet={publishedDroplet} />,
      );

      expect(screen.queryByText("Request Review")).not.toBeInTheDocument();
    });

    it("does not show popups initially", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      expect(screen.queryByText("Enter New URL Slug")).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          "Are you sure you want to submit this droplet for review?",
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe("Change URL Popup", () => {
    it("opens slug change popup when Change URL is clicked", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Change URL"));

      expect(screen.getByText("Enter New URL Slug")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("e.g., my-new-url-slug"),
      ).toBeInTheDocument();
    });

    it("closes popup when Cancel is clicked", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Change URL"));

      const cancelButtons = screen.getAllByText("Cancel");
      fireEvent.click(cancelButtons[0]);

      expect(screen.queryByText("Enter New URL Slug")).not.toBeInTheDocument();
    });

    it("updates slug input value", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Change URL"));

      const slugInput = screen.getByPlaceholderText(
        "e.g., my-new-url-slug",
      ) as HTMLInputElement;
      fireEvent.change(slugInput, { target: { value: "new-slug" } });

      expect(slugInput.value).toBe("new-slug");
    });

    it("does not call update with empty slug", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Change URL"));

      const confirmButtons = screen.getAllByText("Confirm");
      fireEvent.click(confirmButtons[0]);

      expect(updateDroplet).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("New slug cannot be empty");

      consoleErrorSpy.mockRestore();
    });

    it("does not call update with whitespace-only slug", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Change URL"));

      const slugInput = screen.getByPlaceholderText("e.g., my-new-url-slug");
      fireEvent.change(slugInput, { target: { value: "   " } });

      const confirmButtons = screen.getAllByText("Confirm");
      fireEvent.click(confirmButtons[0]);

      expect(updateDroplet).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Request Review Popup", () => {
    it("opens review popup when Request Review is clicked", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Request Review"));

      expect(
        screen.getByText(
          "Are you sure you want to submit this droplet for review?",
        ),
      ).toBeInTheDocument();
    });

    it("closes review popup when Cancel is clicked", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Request Review"));

      const cancelButtons = screen.getAllByText("Cancel");
      fireEvent.click(cancelButtons[0]);

      expect(
        screen.queryByText(
          "Are you sure you want to submit this droplet for review?",
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe("Conditional Rendering", () => {
    it("shows Request Review for draft droplets not in review", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      expect(screen.getByText("Request Review")).toBeInTheDocument();
      expect(
        screen.queryByText("Droplet currently in review"),
      ).not.toBeInTheDocument();
    });

    it("shows in review message for droplets in review", () => {
      const inReviewDroplet = { ...mockDroplet, inReview: true };

      render(
        <RegenerateSlugButton name="Test Droplet" droplet={inReviewDroplet} />,
      );

      expect(
        screen.getByText("Droplet currently in review"),
      ).toBeInTheDocument();
      expect(screen.queryByText("Request Review")).not.toBeInTheDocument();
    });

    it("does not show review button for published droplets", () => {
      const publishedDroplet = {
        ...mockDroplet,
        status: "published" as DropletStatus,
      };

      render(
        <RegenerateSlugButton name="Test Droplet" droplet={publishedDroplet} />,
      );

      expect(screen.queryByText("Request Review")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Droplet currently in review"),
      ).not.toBeInTheDocument();
    });

    it("shows Re-Request Review when afterReview is true", () => {
      const afterReviewDroplet = { ...mockDroplet, afterReview: true };

      render(
        <RegenerateSlugButton
          name="Test Droplet"
          droplet={afterReviewDroplet}
        />,
      );

      expect(screen.getByText("Re-Request Review")).toBeInTheDocument();
    });

    it("shows help icon tooltip content", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      expect(
        screen.getByText(/Once this droplet is reviewed by a Content Editor/),
      ).toBeInTheDocument();
    });
  });

  describe("Button Styling", () => {
    it("applies correct styling to Change URL button", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      const changeUrlButton = screen.getByText("Change URL");
      expect(changeUrlButton).toHaveClass("dark:bg-slate-800");
    });

    it("applies correct styling to Request Review button", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      const reviewButton = screen.getByText("Request Review");
      expect(reviewButton).toHaveClass("dark:bg-slate-800");
    });

    it("help icon has cursor-pointer class", () => {
      const { container } = render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      const helpIcon = container.querySelector(".lucide-circle-help");
      expect(helpIcon).toHaveClass("cursor-pointer");
    });
  });

  describe("Popup Styling", () => {
    it("slug popup has correct structure", () => {
      const { container } = render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Change URL"));

      const popup = container.querySelector(".fixed.inset-0");
      expect(popup).toHaveClass("bg-black");
      expect(popup).toHaveClass("bg-opacity-50");
      expect(popup).toHaveClass("z-50");
    });

    it("review popup has correct structure", () => {
      const { container } = render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Request Review"));

      const popup = container.querySelector(".fixed.inset-0");
      expect(popup).toHaveClass("bg-black");
      expect(popup).toHaveClass("bg-opacity-50");
    });

    it("Confirm button has correct styling", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Change URL"));

      const confirmButtons = screen.getAllByText("Confirm");
      expect(confirmButtons[0]).toHaveClass("bg-sky-600");
      expect(confirmButtons[0]).toHaveClass("text-white");
    });
  });

  describe("Edge Cases", () => {
    it("handles droplet with very long name", () => {
      const longName = "A".repeat(200);

      render(<RegenerateSlugButton name={longName} droplet={mockDroplet} />);

      expect(screen.getByText("Change URL")).toBeInTheDocument();
    });

    it("handles droplet with special status combinations", () => {
      const specialDroplet = {
        ...mockDroplet,
        status: "draft" as DropletStatus,
        inReview: false,
        afterReview: true,
      } as any;

      render(
        <RegenerateSlugButton name="Test Droplet" droplet={specialDroplet} />,
      );

      expect(screen.getByText("Re-Request Review")).toBeInTheDocument();
    });

    it("handles multiple popup opens and closes", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      // Open slug popup
      fireEvent.click(screen.getByText("Change URL"));
      expect(screen.getByText("Enter New URL Slug")).toBeInTheDocument();

      // Close it
      const cancelButtons = screen.getAllByText("Cancel");
      fireEvent.click(cancelButtons[0]);
      expect(screen.queryByText("Enter New URL Slug")).not.toBeInTheDocument();

      // Open review popup
      fireEvent.click(screen.getByText("Request Review"));
      expect(
        screen.getByText(
          "Are you sure you want to submit this droplet for review?",
        ),
      ).toBeInTheDocument();

      // Close it
      const cancelButtons2 = screen.getAllByText("Cancel");
      fireEvent.click(cancelButtons2[0]);
      expect(
        screen.queryByText(
          "Are you sure you want to submit this droplet for review?",
        ),
      ).not.toBeInTheDocument();
    });

    it("handles trims whitespace from slug input", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      fireEvent.click(screen.getByText("Change URL"));

      const slugInput = screen.getByPlaceholderText("e.g., my-new-url-slug");
      fireEvent.change(slugInput, { target: { value: "  new-slug  " } });

      expect((slugInput as HTMLInputElement).value).toBe("  new-slug  ");
    });
  });

  describe("Different Droplet States", () => {
    it("renders for draft droplet", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      expect(screen.getByText("Change URL")).toBeInTheDocument();
      expect(screen.getByText("Request Review")).toBeInTheDocument();
    });

    it("renders for published droplet", () => {
      const publishedDroplet = {
        ...mockDroplet,
        status: "published" as DropletStatus,
      };

      render(
        <RegenerateSlugButton name="Test Droplet" droplet={publishedDroplet} />,
      );

      expect(screen.getByText("Change URL")).toBeInTheDocument();
      expect(screen.queryByText("Request Review")).not.toBeInTheDocument();
    });

    it("renders for droplet in review", () => {
      const inReviewDroplet = { ...mockDroplet, inReview: true } as any;

      render(
        <RegenerateSlugButton name="Test Droplet" droplet={inReviewDroplet} />,
      );

      expect(screen.getByText("Change URL")).toBeInTheDocument();
      expect(
        screen.getByText("Droplet currently in review"),
      ).toBeInTheDocument();
    });

    it("renders for droplet after review", () => {
      const afterReviewDroplet = {
        ...mockDroplet,
        afterReview: true,
        inReview: false,
      } as any;

      render(
        <RegenerateSlugButton
          name="Test Droplet"
          droplet={afterReviewDroplet}
        />,
      );

      expect(screen.getByText("Re-Request Review")).toBeInTheDocument();
    });
  });

  describe("Help Tooltip", () => {
    it("tooltip has correct content", () => {
      render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      const tooltipText = screen.getByText(
        /Once this droplet is reviewed by a Content Editor/,
      );
      expect(tooltipText).toBeInTheDocument();
      expect(tooltipText.textContent).toContain(
        "it will either be published or sent back with change requests",
      );
    });

    it("tooltip has correct styling classes", () => {
      const { container } = render(
        <RegenerateSlugButton name="Test Droplet" droplet={mockDroplet} />,
      );

      const tooltip = container.querySelector(".group-hover\\:opacity-100");
      expect(tooltip).toHaveClass("opacity-0");
      expect(tooltip).toHaveClass("pointer-events-none");
    });
  });
});
