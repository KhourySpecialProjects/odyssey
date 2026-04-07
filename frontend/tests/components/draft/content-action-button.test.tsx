import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { updateDroplet } from "@/lib/requests/droplet";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Droplet } from "@/types";
import { createPortal } from "react-dom";
import { ContentActionButton } from "@/components/draft/metadata/content-action-button";

// Mock dependencies
jest.mock("@/lib/requests/droplet");
jest.mock("sonner");
jest.mock("next/navigation");
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: jest.fn((element) => element),
}));

const mockPush = jest.fn();
const mockUpdateDroplet = updateDroplet as jest.MockedFunction<
  typeof updateDroplet
>;
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};

(useRouter as jest.Mock).mockReturnValue({
  push: mockPush,
});

(toast.success as jest.Mock) = mockToast.success;
(toast.error as jest.Mock) = mockToast.error;

describe("ContentActionButton", () => {
  const mockDroplet: Droplet = {
    id: 1,
    name: "Test Droplet",
    slug: "test-droplet",
    status: "draft",
    type: "knowledge",
    focusArea: "personal",
    isHidden: false,
    learningObjectives: [],
    inReview: false,
  };

  const mockDropletWithReview: Droplet = {
    ...mockDroplet,
    afterReview: "Previous review comments",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
    delete (window as any).location;
    (window as any).location = { reload: jest.fn() };
  });

  describe("Publish Action", () => {
    it("renders publish button with correct text and styling", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      const button = screen.getByRole("button", { name: /publish droplet/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("bg-[#2D7597]");
      expect(button).toHaveClass("hover:bg-[#255e78]");
    });

    it("opens modal with confirmation input when publish button is clicked", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      expect(
        screen.getByText(/are you sure you want to publish this droplet/i),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter droplet name"),
      ).toBeInTheDocument();
      expect(screen.getByText(`"${mockDroplet.name}"`)).toBeInTheDocument();
    });

    it("confirm button is disabled until correct droplet name is typed", async () => {
      const user = userEvent.setup();
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      const input = screen.getByPlaceholderText("Enter droplet name");

      expect(confirmButton).toBeDisabled();

      await user.type(input, "Wrong Name");
      expect(confirmButton).toBeDisabled();

      await user.clear(input);
      await user.type(input, mockDroplet.name);

      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
    });

    it("calls updateDroplet with correct parameters on successful publish", async () => {
      const user = userEvent.setup();
      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const input = screen.getByPlaceholderText("Enter droplet name");
      await user.type(input, mockDroplet.name);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await waitFor(() => expect(confirmButton).not.toBeDisabled());
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdateDroplet).toHaveBeenCalledWith(
          mockDroplet.id,
          { name: mockDroplet.name, status: "published", inReview: false },
          { regenerateSlug: false },
        );
      });
    });

    it("shows success toast and redirects to /explore on successful publish", async () => {
      const user = userEvent.setup();
      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const input = screen.getByPlaceholderText("Enter droplet name");
      await user.type(input, mockDroplet.name);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await waitFor(() => expect(confirmButton).not.toBeDisabled());
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Droplet published successfully!",
        );
        expect(mockPush).toHaveBeenCalledWith("/explore");
      });
    });

    it("shows error toast on failed publish", async () => {
      const user = userEvent.setup();
      mockUpdateDroplet.mockResolvedValue({
        ok: false,
        error: "Network error",
      } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const input = screen.getByPlaceholderText("Enter droplet name");
      await user.type(input, mockDroplet.name);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await waitFor(() => expect(confirmButton).not.toBeDisabled());
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Error publishing droplet",
        );
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it("closes modal and resets input on cancel", async () => {
      const user = userEvent.setup();
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const input = screen.getByPlaceholderText("Enter droplet name");
      await user.type(input, "Some text");

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(
        screen.queryByText(/are you sure you want to publish this droplet/i),
      ).not.toBeInTheDocument();

      // Reopen to verify input is reset
      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));
      const newInput = screen.getByPlaceholderText("Enter droplet name");
      expect(newInput).toHaveValue("");
    });

    it("resets input after successful publish", async () => {
      const user = userEvent.setup();
      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const input = screen.getByPlaceholderText("Enter droplet name");
      await user.type(input, mockDroplet.name);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await waitFor(() => expect(confirmButton).not.toBeDisabled());
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });

      // The input should be cleared even though modal is closed
      expect(input).not.toBeInTheDocument();
    });
  });

  describe("Request Review Action", () => {
    it("renders request review button with correct text and styling", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Request Review"
        />,
      );

      const button = screen.getByRole("button", { name: /request review/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("bg-[#2D7597]");
      expect(button).toHaveClass("hover:bg-[#255e78]");
    });

    it("opens modal with informational text when request review button is clicked", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Request Review"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request review/i }));

      expect(
        screen.getByText(
          /are you sure you want to submit this droplet for review/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/once this droplet is reviewed by a content editor/i),
      ).toBeInTheDocument();
    });

    it("confirm button is enabled immediately for request review", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Request Review"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request review/i }));

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      expect(confirmButton).not.toBeDisabled();
    });

    it("calls updateDroplet with correct parameters on request review", async () => {
      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Request Review"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request review/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockUpdateDroplet).toHaveBeenCalledWith(
          mockDroplet.id,
          { name: mockDroplet.name, inReview: true },
          { regenerateSlug: false },
        );
      });
    });

    it("shows success toast and reloads page on successful request review", async () => {
      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Request Review"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request review/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Droplet submitted for review",
        );
        expect(window.location.reload).toHaveBeenCalled();
      });
    });

    it("shows error toast on failed request review", async () => {
      mockUpdateDroplet.mockResolvedValue({
        ok: false,
        error: "Network error",
      } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Request Review"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request review/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Error submitting droplet for review",
        );
        expect(window.location.reload).not.toHaveBeenCalled();
      });
    });

    it("supports re-request review button text", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Re-Request Review"
        />,
      );

      const button = screen.getByRole("button", { name: /re-request review/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Request Changes Action", () => {
    it("renders request changes button with correct text and styling", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      const button = screen.getByRole("button", { name: /request changes/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("bg-red-400");
      expect(button).toHaveClass("hover:bg-red-500");
      expect(button).toHaveClass("dark:bg-red-600");
      expect(button).toHaveClass("dark:hover:bg-red-800");
    });

    it("opens modal with textarea when request changes button is clicked", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request changes/i }));

      // Use heading role to specifically target the modal title, not the button
      expect(
        screen.getByRole("heading", { name: /request changes/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/enter what changes you want for this droplet/i),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter changes here..."),
      ).toBeInTheDocument();
    });

    it("confirm button is enabled immediately for request changes", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request changes/i }));

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      expect(confirmButton).not.toBeDisabled();
    });

    it("allows typing in textarea", async () => {
      const user = userEvent.setup();
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request changes/i }));

      const textarea = screen.getByPlaceholderText("Enter changes here...");
      await user.type(textarea, "Please update the introduction");

      expect(textarea).toHaveValue("Please update the introduction");
    });

    it("calls updateDroplet with correct parameters including changes text", async () => {
      const user = userEvent.setup();
      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request changes/i }));

      const textarea = screen.getByPlaceholderText("Enter changes here...");
      await user.type(textarea, "Please fix grammar");

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockUpdateDroplet).toHaveBeenCalledWith(
          mockDroplet.id,
          {
            name: mockDroplet.name,
            inReview: false,
            afterReview: "Please fix grammar",
          },
          { regenerateSlug: false },
        );
      });
    });

    it("shows success toast and redirects to /review on successful request changes", async () => {
      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request changes/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Request for review submitted successfully",
        );
        expect(mockPush).toHaveBeenCalledWith("/review");
      });
    });

    it("shows error toast on failed request changes", async () => {
      mockUpdateDroplet.mockResolvedValue({
        ok: false,
        error: "Network error",
      } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request changes/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Error requesting changes",
        );
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it("pre-populates textarea with existing afterReview text", () => {
      render(
        <ContentActionButton
          droplet={mockDropletWithReview}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request changes/i }));

      const textarea = screen.getByPlaceholderText("Enter changes here...");
      expect(textarea).toHaveValue("Previous review comments");
    });

    it("maintains textarea content when canceling and reopening", async () => {
      const user = userEvent.setup();
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      // Open and type
      fireEvent.click(screen.getByRole("button", { name: /request changes/i }));
      const textarea = screen.getByPlaceholderText("Enter changes here...");
      await user.type(textarea, "Some feedback");

      // Cancel
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      // Reopen and verify content is maintained
      fireEvent.click(screen.getByRole("button", { name: /request changes/i }));
      const newTextarea = screen.getByPlaceholderText("Enter changes here...");
      expect(newTextarea).toHaveValue("Some feedback");
    });
  });

  describe("Common Modal Behavior", () => {
    it("closes modal when cancel button is clicked", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Request Review"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request review/i }));
      expect(
        screen.getByText(
          /are you sure you want to submit this droplet for review/i,
        ),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(
        screen.queryByText(
          /are you sure you want to submit this droplet for review/i,
        ),
      ).not.toBeInTheDocument();
    });

    it("renders modal using createPortal", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      expect(createPortal).toHaveBeenCalled();
    });

    it("does not render modal when not open", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      expect(
        screen.queryByText(/are you sure you want to publish this droplet/i),
      ).not.toBeInTheDocument();
    });

    it("handles multiple open/close cycles", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Request Review"
        />,
      );

      const button = screen.getByRole("button", { name: /request review/i });

      // First cycle
      fireEvent.click(button);
      expect(
        screen.getByText(
          /are you sure you want to submit this droplet for review/i,
        ),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(
        screen.queryByText(
          /are you sure you want to submit this droplet for review/i,
        ),
      ).not.toBeInTheDocument();

      // Second cycle
      fireEvent.click(button);
      expect(
        screen.getByText(
          /are you sure you want to submit this droplet for review/i,
        ),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(
        screen.queryByText(
          /are you sure you want to submit this droplet for review/i,
        ),
      ).not.toBeInTheDocument();
    });

    it("modal overlay has correct z-index", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      // Find the overlay div (the one with fixed inset-0)
      const overlay = document.querySelector(".fixed.inset-0.z-\\[9999\\]");
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass("z-[9999]");
    });
  });

  describe("Button Styling", () => {
    it("all buttons have common base classes", () => {
      const { rerender } = render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish"
        />,
      );

      let button = screen.getByRole("button", { name: /publish/i });
      expect(button).toHaveClass("w-full");
      expect(button).toHaveClass("rounded-lg");
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("whitespace-nowrap");
      expect(button).toHaveClass("text-white");

      rerender(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Request Review"
        />,
      );

      button = screen.getByRole("button", { name: /request review/i });
      expect(button).toHaveClass("w-full");
      expect(button).toHaveClass("rounded-lg");

      rerender(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      button = screen.getByRole("button", { name: /request changes/i });
      expect(button).toHaveClass("w-full");
      expect(button).toHaveClass("rounded-lg");
    });
  });

  describe("Edge Cases", () => {
    it("handles droplets with different types", () => {
      const skillDroplet: Droplet = {
        ...mockDroplet,
        type: "skill",
      };

      render(
        <ContentActionButton
          droplet={skillDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      expect(
        screen.getByRole("button", { name: /publish droplet/i }),
      ).toBeInTheDocument();
    });

    it("handles droplets with different focus areas", () => {
      const professionalDroplet: Droplet = {
        ...mockDroplet,
        focusArea: "professional",
      };

      render(
        <ContentActionButton
          droplet={professionalDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      expect(
        screen.getByRole("button", { name: /publish droplet/i }),
      ).toBeInTheDocument();
    });

    it("handles droplet with inReview set to true", async () => {
      const user = userEvent.setup();
      const dropletInReview: Droplet = {
        ...mockDroplet,
        inReview: true,
      };

      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={dropletInReview}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const input = screen.getByPlaceholderText("Enter droplet name");
      await user.type(input, dropletInReview.name);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await waitFor(() => expect(confirmButton).not.toBeDisabled());
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdateDroplet).toHaveBeenCalledWith(
          dropletInReview.id,
          {
            name: dropletInReview.name,
            status: "published",
            inReview: false,
          },
          { regenerateSlug: false },
        );
      });
    });

    it("handles empty changes textarea submission", async () => {
      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestChanges"
          buttonText="Request Changes"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /request changes/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockUpdateDroplet).toHaveBeenCalledWith(
          mockDroplet.id,
          {
            name: mockDroplet.name,
            inReview: false,
            afterReview: "",
          },
          { regenerateSlug: false },
        );
      });
    });

    it("handles very long droplet names in publish confirmation", async () => {
      const user = userEvent.setup();
      const longNameDroplet: Droplet = {
        ...mockDroplet,
        name: "This is a very long droplet name that exceeds normal length expectations",
      };

      render(
        <ContentActionButton
          droplet={longNameDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const input = screen.getByPlaceholderText("Enter droplet name");
      await user.type(input, longNameDroplet.name);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await waitFor(() => expect(confirmButton).not.toBeDisabled());
    });

    it("handles special characters in droplet name", async () => {
      const user = userEvent.setup();
      const specialCharDroplet: Droplet = {
        ...mockDroplet,
        name: "Test & Special <Characters> 'Quotes'",
      };

      render(
        <ContentActionButton
          droplet={specialCharDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const input = screen.getByPlaceholderText("Enter droplet name");
      await user.type(input, specialCharDroplet.name);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await waitFor(() => expect(confirmButton).not.toBeDisabled());
    });

    it("handles form submission via Enter key for publish", async () => {
      const user = userEvent.setup();
      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const input = screen.getByPlaceholderText("Enter droplet name");
      await user.type(input, mockDroplet.name);
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockUpdateDroplet).toHaveBeenCalled();
        expect(mockToast.success).toHaveBeenCalledWith(
          "Droplet published successfully!",
        );
      });
    });

    it("does not submit when pressing Enter with wrong name in publish", async () => {
      const user = userEvent.setup();
      mockUpdateDroplet.mockResolvedValue({ ok: true, error: null } as any);

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publish"
          buttonText="Publish Droplet"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /publish droplet/i }));

      const input = screen.getByPlaceholderText("Enter droplet name");
      await user.type(input, "Wrong Name");
      await user.keyboard("{Enter}");

      // Should not call updateDroplet
      expect(mockUpdateDroplet).not.toHaveBeenCalled();
    });
  });
});
