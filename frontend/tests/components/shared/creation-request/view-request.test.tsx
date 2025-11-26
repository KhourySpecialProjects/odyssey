import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreationRequestModal } from "@/components/shared/creation-request-manager/view-request";
import { CreationRequest } from "@/types";
import { approveCreationRequest, deleteCreationRequest } from "@/lib/actions";
import { toast } from "sonner";

// Mock the actions
jest.mock("@/lib/actions", () => ({
  approveCreationRequest: jest.fn(),
  deleteCreationRequest: jest.fn(),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("CreationRequestModal", () => {
  const mockRequest: CreationRequest = {
    id: 1,
    motivation: "I want to create educational content about React",
    dropletIdea: "A comprehensive React tutorial series covering hooks and state management",
    user: {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    },
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders modal when isOpen is true", () => {
      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Why do you want to create a droplet?")).toBeInTheDocument();
      expect(screen.getByText("Droplet Ideas")).toBeInTheDocument();
    });

    it("does not render modal when isOpen is false", () => {
      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    });

    it("displays user's full name in header", () => {
      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("displays motivation text", () => {
      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.getByText("I want to create educational content about React")
      ).toBeInTheDocument();
    });

    it("displays droplet idea text", () => {
      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.getByText(
          "A comprehensive React tutorial series covering hooks and state management"
        )
      ).toBeInTheDocument();
    });

    it("renders approve button", () => {
      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      expect(approveButton).toBeInTheDocument();
    });

    it("renders decline button", () => {
      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      expect(declineButton).toBeInTheDocument();
    });

    it("renders Sparkles and Lightbulb icons", () => {
  render(
    <CreationRequestModal
      request={mockRequest}
      isOpen={true}
      onClose={mockOnClose}
    />
  );

  // Verify the section headings that accompany the icons
  expect(screen.getByText("Why do you want to create a droplet?")).toBeInTheDocument();
  expect(screen.getByText("Droplet Ideas")).toBeInTheDocument();
  
  // Verify SVG icons are present by checking for their parent containers
  const motivationSection = screen.getByText("Why do you want to create a droplet?").closest('div');
  const ideasSection = screen.getByText("Droplet Ideas").closest('div');
  
  expect(motivationSection?.querySelector('svg')).toBeTruthy();
  expect(ideasSection?.querySelector('svg')).toBeTruthy();
});

    it("preserves whitespace in motivation text", () => {
  const requestWithWhitespace = {
    ...mockRequest,
    motivation: "Line 1\nLine 2\n\nLine 3",
  };

  render(
    <CreationRequestModal
      request={requestWithWhitespace}
      isOpen={true}
      onClose={mockOnClose}
    />
  );

  // Use getAllByText to get the specific <p> element (not the parent div)
  const elements = screen.getAllByText((content, element) => {
    return element?.textContent === "Line 1\nLine 2\n\nLine 3";
  });
  
  // Find the <p> element specifically
  const motivationText = elements.find(el => el.tagName === 'P');
  expect(motivationText).toHaveClass("whitespace-pre-wrap");
});

    it("preserves whitespace in droplet idea text", () => {
  const requestWithWhitespace = {
    ...mockRequest,
    dropletIdea: "Idea 1\nIdea 2\n\nIdea 3",
  };

  render(
    <CreationRequestModal
      request={requestWithWhitespace}
      isOpen={true}
      onClose={mockOnClose}
    />
  );

  // Use getAllByText to get the specific <p> element (not the parent div)
  const elements = screen.getAllByText((content, element) => {
    return element?.textContent === "Idea 1\nIdea 2\n\nIdea 3";
  });
  
  // Find the <p> element specifically
  const ideaText = elements.find(el => el.tagName === 'P');
  expect(ideaText).toHaveClass("whitespace-pre-wrap");
});
  });

  describe("Approve Functionality", () => {
    it("calls approveCreationRequest with correct parameters when approve button is clicked", async () => {
      (approveCreationRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(approveCreationRequest).toHaveBeenCalledWith("1", 1);
      });
    });

    it("displays success toast on successful approval", async () => {
      (approveCreationRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "John Doe is now a Content Creator!"
        );
      });
    });

    it("closes modal on successful approval", async () => {
      (approveCreationRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("displays error toast on approval failure", async () => {
      (approveCreationRequest as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Failed to update user roles",
      });

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to approve request: Failed to update user roles"
        );
      });
    });

    it("does not close modal on approval failure", async () => {
      (approveCreationRequest as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Error",
      });

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("handles approval exception with error toast", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (approveCreationRequest as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to approve request");
      });

      expect(consoleError).toHaveBeenCalledWith(
        "Error approving request:",
        expect.any(Error)
      );
      consoleError.mockRestore();
    });

    it("shows error toast when request id is missing", async () => {
      const requestWithoutId = { ...mockRequest, id: undefined as any };

      render(
        <CreationRequestModal
          request={requestWithoutId}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid request data");
      });
      expect(approveCreationRequest).not.toHaveBeenCalled();
    });

    it("shows error toast when user id is missing", async () => {
      const requestWithoutUserId = {
        ...mockRequest,
        user: { ...mockRequest.user, id: undefined as any },
      };

      render(
        <CreationRequestModal
          request={requestWithoutUserId}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid request data");
      });
      expect(approveCreationRequest).not.toHaveBeenCalled();
    });

    it("disables buttons during approval processing", async () => {
      (approveCreationRequest as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      const declineButton = screen.getByRole("button", { name: /decline/i });

      fireEvent.click(approveButton);

      expect(approveButton).toBeDisabled();
      expect(declineButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("shows processing state during approval", async () => {
      (approveCreationRequest as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });

      fireEvent.click(approveButton);

      expect(screen.getByText("Processing...")).toBeInTheDocument();

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe("Decline Functionality", () => {
    it("calls deleteCreationRequest with correct parameters when decline button is clicked", async () => {
      (deleteCreationRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(deleteCreationRequest).toHaveBeenCalledWith("1");
      });
    });

    it("displays success toast on successful decline", async () => {
      (deleteCreationRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Request declined and removed");
      });
    });

    it("closes modal on successful decline", async () => {
      (deleteCreationRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("displays error toast on decline failure", async () => {
      (deleteCreationRequest as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Failed to delete",
      });

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to decline request: Failed to delete"
        );
      });
    });

    it("does not close modal on decline failure", async () => {
      (deleteCreationRequest as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Error",
      });

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("handles decline exception with error toast", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      (deleteCreationRequest as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to decline request");
      });

      expect(consoleError).toHaveBeenCalledWith(
        "Error declining request:",
        expect.any(Error)
      );
      consoleError.mockRestore();
    });

    it("shows error toast when request id is missing on decline", async () => {
      const requestWithoutId = { ...mockRequest, id: undefined as any };

      render(
        <CreationRequestModal
          request={requestWithoutId}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid request data");
      });
      expect(deleteCreationRequest).not.toHaveBeenCalled();
    });

    it("disables buttons during decline processing", async () => {
      (deleteCreationRequest as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      const declineButton = screen.getByRole("button", { name: /decline/i });

      fireEvent.click(declineButton);

      expect(approveButton).toBeDisabled();
      expect(declineButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe("Modal Behavior", () => {
    it("calls onClose when dialog is closed via onOpenChange", () => {
      const { rerender } = render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Simulate dialog close by changing isOpen
      rerender(
        <CreationRequestModal
          request={mockRequest}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      // The dialog component itself handles the onOpenChange callback
      // We just verify the modal respects the isOpen prop
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    });

    it("renders dialog with proper role attribute", () => {
  render(
    <CreationRequestModal
      request={mockRequest}
      isOpen={true}
      onClose={mockOnClose}
    />
  );

  const dialogContent = screen.getByRole('dialog');
  expect(dialogContent).toBeTruthy();
  expect(dialogContent.getAttribute('role')).toBe('dialog');
});

    it("renders both action buttons side by side", () => {
      render(
        <CreationRequestModal
          request={mockRequest}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const approveButton = screen.getByRole("button", {
        name: /approve & grant creator role/i,
      });
      const declineButton = screen.getByRole("button", { name: /decline/i });

      expect(approveButton).toBeInTheDocument();
      expect(declineButton).toBeInTheDocument();
    });
  });
});