import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { updateDroplet, publishDraftToOriginal } from "@/lib/requests/droplet";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Droplet } from "@/types";
import { createPortal } from "react-dom";
import { ContentActionButton } from "@/components/draft/metadata/content-action-button";
import {
  submitForReview,
  withdrawFromReview,
  sendFeedback,
  publishWithReview,
} from "@/lib/requests/reviews";

// Mock dependencies
jest.mock("@/lib/requests/droplet");
jest.mock("@/lib/requests/reviews");
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
const mockPublishDraftToOriginal =
  publishDraftToOriginal as jest.MockedFunction<typeof publishDraftToOriginal>;
const mockSubmitForReview = jest.mocked(submitForReview);
const mockWithdrawFromReview = jest.mocked(withdrawFromReview);
const mockSendFeedback = jest.mocked(sendFeedback);
const mockPublishWithReview = jest.mocked(publishWithReview);
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
    difficulty: "beginner",
    isHidden: false,
    learningObjectives: [],
    inReview: false,
  };

  // An [EDIT] draft: a copy of a live droplet
  const mockEditDraft: Droplet = {
    ...mockDroplet,
    id: 2,
    originalDropletId: 99,
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
          { name: mockDroplet.name, status: "published" },
          { regenerateSlug: false },
        );
      });
    });

    it("publishes a new droplet without calling publishDraftToOriginal", async () => {
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
      await user.type(
        screen.getByPlaceholderText("Enter droplet name"),
        mockDroplet.name,
      );
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockUpdateDroplet).toHaveBeenCalled();
      });
      expect(mockPublishDraftToOriginal).not.toHaveBeenCalled();
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
    const openAndConfirm = (name: RegExp) => {
      fireEvent.click(screen.getByRole("button", { name }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    };

    it("renders request review button with correct text and styling", () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Request Review"
        />,
      );

      const button = screen.getByRole("button", { name: /request review/i });
      expect(button).toHaveClass("bg-[#2D7597]");
      expect(button).toHaveClass("hover:bg-[#255e78]");
    });

    it("opens modal with informational text, and confirm is enabled", () => {
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
        screen.getByRole("button", { name: /confirm/i }),
      ).not.toBeDisabled();
    });

    it("calls submitForReview with the droplet id, toasts and reloads", async () => {
      mockSubmitForReview.mockResolvedValue({
        ok: true,
        error: null,
        data: { changed: true, round: 1 },
      });

      render(
        <ContentActionButton
          droplet={mockEditDraft}
          actionType="requestReview"
          buttonText="Submit for review"
        />,
      );
      openAndConfirm(/submit for review/i);

      await waitFor(() => {
        expect(mockSubmitForReview).toHaveBeenCalledWith(mockEditDraft.id);
        expect(mockToast.success).toHaveBeenCalledWith(
          "Droplet submitted for review",
        );
        expect(window.location.reload).toHaveBeenCalled();
      });
      expect(mockUpdateDroplet).not.toHaveBeenCalled();
      expect(mockPublishDraftToOriginal).not.toHaveBeenCalled();
    });

    it("treats changed: false as one success toast and no error", async () => {
      mockSubmitForReview.mockResolvedValue({
        ok: true,
        error: null,
        data: { changed: false, round: 1 },
      });

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Submit for review"
        />,
      );
      openAndConfirm(/submit for review/i);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledTimes(1);
      });
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it("shows the generic error for a failed submit, without reloading", async () => {
      mockSubmitForReview.mockResolvedValue({
        ok: false,
        error: "failed",
        data: null,
      });

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Submit for review"
        />,
      );
      openAndConfirm(/submit for review/i);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Error submitting droplet for review",
        );
      });
      expect(window.location.reload).not.toHaveBeenCalled();
    });

    it("shows Strapi's message for a conflict", async () => {
      mockSubmitForReview.mockResolvedValue({
        ok: false,
        error: "conflict",
        data: null,
        message: "This droplet is already published.",
      });

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Submit for review"
        />,
      );
      openAndConfirm(/submit for review/i);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "This droplet is already published.",
        );
      });
    });

    it("shows the could-not-be-confirmed text for an unconfirmed result", async () => {
      mockSubmitForReview.mockResolvedValue({
        ok: false,
        error: "unconfirmed",
        data: null,
        message: null,
      });

      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="requestReview"
          buttonText="Submit for review"
        />,
      );
      openAndConfirm(/submit for review/i);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringMatching(/could not be confirmed/i),
        );
      });
    });
  });

  describe("Send Feedback Action", () => {
    const inReview: Droplet = { ...mockDroplet, inReview: true };
    const renderIt = () =>
      render(
        <ContentActionButton
          droplet={inReview}
          actionType="sendFeedback"
          buttonText="Send feedback"
        />,
      );

    it("renders an outlined button and opens a modal with an empty textarea", () => {
      renderIt();

      const button = screen.getByRole("button", { name: "Send feedback" });
      expect(button).toHaveClass(
        "border-[#D0D5DD]",
        "bg-white",
        "text-[#344054]",
      );
      expect(button).not.toHaveClass("bg-red-400");
      fireEvent.click(button);

      expect(
        screen.getByRole("heading", { name: "Send feedback" }),
      ).toBeInTheDocument();
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("");
      expect(textarea).toHaveAttribute("maxlength", "5000");
      expect(
        screen.getByRole("button", { name: /confirm/i }),
      ).not.toBeDisabled();
    });

    it("names the summary note by its visible label", () => {
      renderIt();
      fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
      expect(screen.getByLabelText(/optional summary/i)).toBe(
        screen.getByRole("textbox"),
      );
    });

    it("never seeds the textarea from afterReview", () => {
      render(
        <ContentActionButton
          droplet={{ ...inReview, afterReview: "Old feedback" }}
          actionType="sendFeedback"
          buttonText="Send feedback"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("sends the typed note, toasts and goes to /review", async () => {
      const user = userEvent.setup();
      mockSendFeedback.mockResolvedValue({
        ok: true,
        error: null,
        data: { reviewId: 4 },
      });
      renderIt();

      fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByRole("textbox"), "Fix the quiz");
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockSendFeedback).toHaveBeenCalledWith(
          inReview.id,
          "Fix the quiz",
        );
        expect(mockToast.success).toHaveBeenCalledWith("Feedback sent");
        expect(mockPush).toHaveBeenCalledWith("/review");
      });
      expect(mockUpdateDroplet).not.toHaveBeenCalled();
    });

    it("sends null for an empty note", async () => {
      mockSendFeedback.mockResolvedValue({
        ok: true,
        error: null,
        data: { reviewId: 4 },
      });
      renderIt();

      fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockSendFeedback).toHaveBeenCalledWith(inReview.id, null);
      });
    });

    it("keeps the typed note when canceling and reopening", async () => {
      const user = userEvent.setup();
      renderIt();

      fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
      await user.type(screen.getByRole("textbox"), "Draft note");
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));

      expect(screen.getByRole("textbox")).toHaveValue("Draft note");
    });

    it("shows Strapi's message for a conflict and does not navigate", async () => {
      mockSendFeedback.mockResolvedValue({
        ok: false,
        error: "conflict",
        data: null,
        message: "This review has already been sent.",
      });
      renderIt();

      fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "This review has already been sent.",
        );
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("shows the generic error for a failed send", async () => {
      mockSendFeedback.mockResolvedValue({
        ok: false,
        error: "failed",
        data: null,
      });
      renderIt();

      fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Error sending feedback");
      });
    });
  });

  describe("Publish With Review Action", () => {
    const inReview: Droplet = { ...mockDroplet, inReview: true };
    const renderIt = () =>
      render(
        <ContentActionButton
          droplet={inReview}
          actionType="publishWithReview"
          buttonText="Publish"
        />,
      );
    const confirm = () => {
      fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
      fireEvent.change(screen.getByPlaceholderText("Enter droplet name"), {
        target: { value: inReview.name },
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    };

    it("needs the exact droplet name: Confirm stays disabled and submit does nothing", () => {
      renderIt();
      fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      const input = screen.getByPlaceholderText("Enter droplet name");

      expect(confirmButton).toBeDisabled();
      fireEvent.change(input, { target: { value: "test droplet" } });
      expect(confirmButton).toBeDisabled();
      fireEvent.submit(input.closest("form")!);
      expect(mockPublishWithReview).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { value: inReview.name } });
      expect(confirmButton).toBeEnabled();
    });

    it("renders the primary button", () => {
      renderIt();

      expect(screen.getByRole("button", { name: /^publish$/i })).toHaveClass(
        "bg-[#2D7597]",
      );
    });

    it("calls publishWithReview and opens the live droplet by slug", async () => {
      mockPublishWithReview.mockResolvedValue({
        ok: true,
        error: null,
        data: { slug: "live-slug", reviewId: 3, dropletId: 99 },
      });
      renderIt();
      confirm();

      await waitFor(() => {
        expect(mockPublishWithReview).toHaveBeenCalledWith(inReview.id);
        expect(mockPush).toHaveBeenCalledWith("/d/live-slug");
        expect(mockToast.success).toHaveBeenCalledTimes(1);
      });
      expect(mockUpdateDroplet).not.toHaveBeenCalled();
      expect(mockPublishDraftToOriginal).not.toHaveBeenCalled();
    });

    it("goes to /my-content when there is no slug", async () => {
      mockPublishWithReview.mockResolvedValue({
        ok: true,
        error: null,
        data: { slug: null, reviewId: 3, dropletId: 99 },
      });
      renderIt();
      confirm();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/my-content");
      });
    });

    it("shows the Overall-score conflict message and stays put", async () => {
      mockPublishWithReview.mockResolvedValue({
        ok: false,
        error: "conflict",
        data: null,
        message:
          "Confirm an Overall score for every criterion (missing: Tone).",
      });
      renderIt();
      confirm();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Confirm an Overall score for every criterion (missing: Tone).",
        );
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("shows the could-not-be-confirmed text for an unconfirmed result", async () => {
      mockPublishWithReview.mockResolvedValue({
        ok: false,
        error: "unconfirmed",
        data: null,
        message: null,
      });
      renderIt();
      confirm();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringMatching(/could not be confirmed/i),
        );
      });
    });
  });

  describe("Publish Draft Action", () => {
    it("publishes the edit draft over its original and opens the live droplet", async () => {
      mockPublishDraftToOriginal.mockResolvedValue({
        ok: true,
        error: null,
        slug: "live-droplet",
      });

      render(
        <ContentActionButton
          droplet={mockEditDraft}
          actionType="publishDraft"
          buttonText="Publish"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
      expect(screen.getByText(/publish draft changes/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/d/live-droplet");
      });
      expect(mockPublishDraftToOriginal).toHaveBeenCalledTimes(1);
      expect(mockPublishDraftToOriginal).toHaveBeenCalledWith(
        mockEditDraft.id,
        mockEditDraft.originalDropletId,
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        "Changes published successfully!",
      );
      expect(mockUpdateDroplet).not.toHaveBeenCalled();
    });

    it("shows the publish error and stays on the draft when publishing fails", async () => {
      mockPublishDraftToOriginal.mockResolvedValue({
        ok: false,
        error: "Original droplet not found",
        slug: null,
      });

      render(
        <ContentActionButton
          droplet={mockEditDraft}
          actionType="publishDraft"
          buttonText="Publish"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Original droplet not found",
        );
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it.each([
      ["forbidden", "You can't publish this draft."],
      ["unauthenticated", "Please sign in again."],
      ["in_review", "This draft is in review. Publish it from the review."],
    ])("turns the %s code into a readable toast", async (code, message) => {
      mockPublishDraftToOriginal.mockResolvedValue({
        ok: false,
        error: code,
        slug: null,
      });

      render(
        <ContentActionButton
          droplet={mockEditDraft}
          actionType="publishDraft"
          buttonText="Publish"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(message);
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("goes to /my-content when the publish returns no slug", async () => {
      mockPublishDraftToOriginal.mockResolvedValue({
        ok: true,
        error: null,
        slug: null,
      });

      render(
        <ContentActionButton
          droplet={mockEditDraft}
          actionType="publishDraft"
          buttonText="Publish"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/my-content");
      });
    });

    it("does not call publishDraftToOriginal when no original droplet is linked", async () => {
      render(
        <ContentActionButton
          droplet={mockDroplet}
          actionType="publishDraft"
          buttonText="Publish"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "No original droplet linked",
        );
      });
      expect(mockPublishDraftToOriginal).not.toHaveBeenCalled();
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
          actionType="sendFeedback"
          buttonText="Send feedback"
        />,
      );

      button = screen.getByRole("button", { name: /send feedback/i });
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

  describe("Withdraw Action", () => {
    const inReviewDroplet: Droplet = {
      ...mockDroplet,
      inReview: true,
      afterReview: "Earlier feedback",
    };

    it("renders an outline button", () => {
      render(
        <ContentActionButton
          droplet={inReviewDroplet}
          actionType="withdrawReview"
          buttonText="Withdraw from review"
        />,
      );

      const button = screen.getByRole("button", {
        name: "Withdraw from review",
      });
      expect(button).toHaveClass("bg-white");
      expect(button).toHaveClass("text-[#344054]");
      expect(button).not.toHaveClass("text-white");
    });

    it("asks for confirmation before withdrawing", () => {
      render(
        <ContentActionButton
          droplet={inReviewDroplet}
          actionType="withdrawReview"
          buttonText="Withdraw from review"
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Withdraw from review" }),
      );

      expect(screen.getByText("Withdraw from review?")).toBeInTheDocument();
      expect(screen.getByText(/you can edit it again/i)).toBeInTheDocument();
      expect(mockUpdateDroplet).not.toHaveBeenCalled();
    });

    it("calls withdrawFromReview, then toasts and reloads", async () => {
      mockWithdrawFromReview.mockResolvedValue({
        ok: true,
        error: null,
        data: { changed: true },
      });

      render(
        <ContentActionButton
          droplet={inReviewDroplet}
          actionType="withdrawReview"
          buttonText="Withdraw from review"
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Withdraw from review" }),
      );
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockWithdrawFromReview).toHaveBeenCalledWith(inReviewDroplet.id);
        expect(mockToast.success).toHaveBeenCalledWith("Withdrawn from review");
        expect(window.location.reload).toHaveBeenCalled();
      });
      expect(mockUpdateDroplet).not.toHaveBeenCalled();
    });

    it("treats changed: false as one success toast and no error", async () => {
      mockWithdrawFromReview.mockResolvedValue({
        ok: true,
        error: null,
        data: { changed: false },
      });

      render(
        <ContentActionButton
          droplet={inReviewDroplet}
          actionType="withdrawReview"
          buttonText="Withdraw from review"
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Withdraw from review" }),
      );
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledTimes(1);
      });
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it("shows an error toast and does not reload when withdrawing fails", async () => {
      mockWithdrawFromReview.mockResolvedValue({
        ok: false,
        error: "failed",
        data: null,
      });

      render(
        <ContentActionButton
          droplet={inReviewDroplet}
          actionType="withdrawReview"
          buttonText="Withdraw from review"
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Withdraw from review" }),
      );
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Error withdrawing from review",
        );
      });
      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });

  describe("disabledReason and initialNote", () => {
    const inReview: Droplet = { ...mockDroplet, inReview: true };

    it("blocks the click, is aria-disabled and links its helper text", () => {
      render(
        <ContentActionButton
          droplet={inReview}
          actionType="publishWithReview"
          buttonText="Publish droplet"
          disabledReason="Confirm the Overall Score to publish."
        />,
      );
      const button = screen.getByRole("button", { name: "Publish droplet" });

      expect(button).toHaveAttribute("aria-disabled", "true");
      const helper = screen.getByText("Confirm the Overall Score to publish.");
      expect(button).toHaveAttribute("aria-describedby", helper.id);
      fireEvent.click(button);
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });

    it("has no aria-disabled without a reason", () => {
      render(
        <ContentActionButton
          droplet={inReview}
          actionType="publishWithReview"
          buttonText="Publish droplet"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Publish droplet" }),
      ).not.toHaveAttribute("aria-disabled");
    });

    it("pre-fills the Send feedback note, and the reviewer's edit wins", () => {
      const { rerender } = render(
        <ContentActionButton
          droplet={inReview}
          actionType="sendFeedback"
          buttonText="Send feedback"
          initialNote="Draft summary"
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
      expect(screen.getByRole("textbox")).toHaveValue("Draft summary");

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "Edited here" },
      });
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      rerender(
        <ContentActionButton
          droplet={inReview}
          actionType="sendFeedback"
          buttonText="Send feedback"
          initialNote="Newer summary"
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
      expect(screen.getByRole("textbox")).toHaveValue("Edited here");
    });
  });
});
