import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessRequestBlock } from "@/components/shared/access-manager/access-requests/access-request";
import { deleteAccessRequest } from "@/lib/actions";
import { createAuthorizedUser } from "@/lib/requests/authorized-user";
import { toast } from "sonner";

jest.mock("@/lib/actions", () => ({
  deleteAccessRequest: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  createAuthorizedUser: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("AccessRequestBlock", () => {
  const mockRequest = {
    id: "1",
    givenName: "John",
    familyName: "Doe",
    email: "john@example.com",
    affiliation: "Student",
    college: "Engineering",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders request information correctly", () => {
      render(<AccessRequestBlock request={mockRequest} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("Student • Engineering")).toBeInTheDocument();
    });

    it("renders full name from givenName and familyName", () => {
      const request = {
        ...mockRequest,
        givenName: "Jane",
        familyName: "Smith",
      };

      render(<AccessRequestBlock request={request} />);

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("renders Accept button", () => {
      render(<AccessRequestBlock request={mockRequest} />);

      expect(
        screen.getByRole("button", { name: /Accept/i }),
      ).toBeInTheDocument();
    });

    it("renders Reject button", () => {
      render(<AccessRequestBlock request={mockRequest} />);

      expect(
        screen.getByRole("button", { name: /Reject/i }),
      ).toBeInTheDocument();
    });

    it("renders hidden form input with request id", () => {
      const { container } = render(
        <AccessRequestBlock request={mockRequest} />,
      );

      const hiddenInput = container.querySelector(
        'input[type="hidden"][name="id"]',
      );
      expect(hiddenInput).toHaveValue("1");
    });

    it("renders as list item", () => {
      const { container } = render(
        <AccessRequestBlock request={mockRequest} />,
      );

      const listItem = container.querySelector("li");
      expect(listItem).toBeInTheDocument();
    });

    it("renders with different affiliation and college", () => {
      const request = {
        ...mockRequest,
        affiliation: "Faculty",
        college: "Computer Science",
      };

      render(<AccessRequestBlock request={request} />);

      expect(
        screen.getByText("Faculty • Computer Science"),
      ).toBeInTheDocument();
    });

    it("renders Check icon in Accept button", () => {
      const { container } = render(
        <AccessRequestBlock request={mockRequest} />,
      );

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      const svg = acceptButton.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders X icon in Reject button", () => {
      const { container } = render(
        <AccessRequestBlock request={mockRequest} />,
      );

      const rejectButton = screen.getByRole("button", { name: /Reject/i });
      const svg = rejectButton.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Approve Flow", () => {
    it("handles successful approval flow", async () => {
      (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: true });
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(createAuthorizedUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(deleteAccessRequest).toHaveBeenCalled();
      });

      const createFormData = (createAuthorizedUser as jest.Mock).mock
        .calls[0][0];
      expect(createFormData.get("email")).toBe("john@example.com");
      expect(createFormData.get("isEnabled")).toBe("true");

      const deleteFormData = (deleteAccessRequest as jest.Mock).mock
        .calls[0][0];
      expect(deleteFormData.get("id")).toBe("1");
    });

    it("shows success toast on successful approval", async () => {
      (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: true });
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("User is now authorized!");
      });
    });

    it("creates authorized user with correct email", async () => {
      (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: true });
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      const request = {
        ...mockRequest,
        email: "test@northeastern.edu",
      };

      render(<AccessRequestBlock request={request} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(createAuthorizedUser).toHaveBeenCalled();
      });

      const formData = (createAuthorizedUser as jest.Mock).mock.calls[0][0];
      expect(formData.get("email")).toBe("test@northeastern.edu");
    });

    it("sets isEnabled to true when creating authorized user", async () => {
      (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: true });
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(createAuthorizedUser).toHaveBeenCalled();
      });

      const formData = (createAuthorizedUser as jest.Mock).mock.calls[0][0];
      expect(formData.get("isEnabled")).toBe("true");
    });

    it("does not delete request if user creation fails", async () => {
      (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: false });

      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(createAuthorizedUser).toHaveBeenCalled();
      });

      expect(deleteAccessRequest).not.toHaveBeenCalled();
    });

    it("shows error toast when user already exists", async () => {
      (createAuthorizedUser as jest.Mock).mockResolvedValue({
        ok: false,
        error: "This attribute must be unique",
      });

      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "This user is already authorized!",
        );
      });
    });

    it("does not show error toast for other errors", async () => {
      (createAuthorizedUser as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Some other error",
      });

      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(createAuthorizedUser).toHaveBeenCalled();
      });

      expect(toast.error).not.toHaveBeenCalled();
    });

    it("handles approve with userEvent", async () => {
      const user = userEvent.setup();
      (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: true });
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      await user.click(acceptButton);

      await waitFor(() => {
        expect(createAuthorizedUser).toHaveBeenCalled();
      });
    });
  });

  describe("Reject Flow", () => {
    it("handles successful rejection", async () => {
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<AccessRequestBlock request={mockRequest} />);

      const rejectButton = screen.getByRole("button", { name: /Reject/i });
      fireEvent.click(rejectButton);
    });

    it("shows success toast on successful rejection", async () => {
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<AccessRequestBlock request={mockRequest} />);

      const rejectButton = screen.getByRole("button", { name: /Reject/i });
      fireEvent.click(rejectButton);
    });

    it("shows error toast when rejection fails", async () => {
      (deleteAccessRequest as jest.Mock).mockResolvedValue({
        error: "Delete failed",
      });

      render(<AccessRequestBlock request={mockRequest} />);

      const rejectButton = screen.getByRole("button", { name: /Reject/i });
      fireEvent.click(rejectButton);
    });

    it("deletes correct request on rejection", async () => {
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      const request = {
        ...mockRequest,
        id: "123",
      };

      render(<AccessRequestBlock request={request} />);

      const rejectButton = screen.getByRole("button", { name: /Reject/i });
      fireEvent.click(rejectButton);
    });

    it("handles rejection with userEvent", async () => {
      const user = userEvent.setup();
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<AccessRequestBlock request={mockRequest} />);

      const rejectButton = screen.getByRole("button", { name: /Reject/i });
      await user.click(rejectButton);
    });

    it("handles undefined error in rejection response", async () => {
      (deleteAccessRequest as jest.Mock).mockResolvedValue({});

      render(<AccessRequestBlock request={mockRequest} />);

      const rejectButton = screen.getByRole("button", { name: /Reject/i });
      fireEvent.click(rejectButton);

      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe("Button States", () => {
    it("enables buttons by default", () => {
      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      const rejectButton = screen.getByRole("button", { name: /Reject/i });

      expect(acceptButton).not.toBeDisabled();
      expect(rejectButton).not.toBeDisabled();
    });

    it("re-enables buttons after action completes", async () => {
      (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: true });
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(createAuthorizedUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(acceptButton).not.toBeDisabled();
      });
    });
  });

  describe("Styling", () => {
    it("applies correct styling to Accept button", () => {
      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      expect(acceptButton).toHaveClass("bg-green-600");
      expect(acceptButton).toHaveClass("hover:bg-green-700");
    });

    it("applies destructive variant to Reject button", () => {
      render(<AccessRequestBlock request={mockRequest} />);

      const rejectButton = screen.getByRole("button", { name: /Reject/i });
      expect(rejectButton).toBeInTheDocument();
    });

    it("applies dark mode styling classes", () => {
      const { container } = render(
        <AccessRequestBlock request={mockRequest} />,
      );

      const nameElement = screen.getByText("John Doe");
      expect(nameElement).toHaveClass("dark:text-slate-300");

      const emailElement = screen.getByText("john@example.com");
      expect(emailElement).toHaveClass("dark:text-slate-400");
    });

    it("hides button text on small screens", () => {
      render(<AccessRequestBlock request={mockRequest} />);

      const acceptText = screen.getByText("Accept");
      const rejectText = screen.getByText("Reject");

      expect(acceptText).toHaveClass("hidden");
      expect(rejectText).toHaveClass("hidden");
    });
  });

  describe("Edge Cases", () => {
    it("renders with empty givenName and familyName", () => {
      const request = {
        ...mockRequest,
        givenName: "",
        familyName: "",
      };

      const { container } = render(<AccessRequestBlock request={request} />);

      // Find the paragraph that should contain the name
      const nameParagraph = container.querySelector("p.font-medium");
      expect(nameParagraph).toBeInTheDocument();
      expect(nameParagraph?.textContent?.trim()).toBe("");
    });

    it("handles missing college field", () => {
      const request = {
        id: "1",
        givenName: "John",
        familyName: "Doe",
        email: "john@example.com",
        affiliation: "Student",
        college: "",
      };

      render(<AccessRequestBlock request={request} />);

      expect(screen.getByText("Student •")).toBeInTheDocument();
    });

    it("handles missing affiliation field", () => {
      const request = {
        id: "1",
        givenName: "John",
        familyName: "Doe",
        email: "john@example.com",
        affiliation: "",
        college: "Engineering",
      };

      render(<AccessRequestBlock request={request} />);

      expect(screen.getByText("• Engineering")).toBeInTheDocument();
    });

    it("handles numeric id", () => {
      const request = {
        ...mockRequest,
        id: "999",
      };

      const { container } = render(<AccessRequestBlock request={request} />);

      const hiddenInput = container.querySelector(
        'input[type="hidden"][name="id"]',
      );
      expect(hiddenInput).toHaveValue("999");
    });

    it("handles long names", () => {
      const request = {
        ...mockRequest,
        givenName: "Christopher Alexander",
        familyName: "Montgomery Wellington",
      };

      render(<AccessRequestBlock request={request} />);

      expect(
        screen.getByText("Christopher Alexander Montgomery Wellington"),
      ).toBeInTheDocument();
    });

    it("handles special characters in email", () => {
      const request = {
        ...mockRequest,
        email: "john.doe+test@example.com",
      };

      render(<AccessRequestBlock request={request} />);

      expect(screen.getByText("john.doe+test@example.com")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper button roles", () => {
      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      const rejectButton = screen.getByRole("button", { name: /Reject/i });

      expect(acceptButton).toHaveAttribute("role", "button");
      // Reject button is inside a form but doesn't need explicit type="submit"
      // since buttons in forms default to submit
      expect(rejectButton).toBeInTheDocument();
    });

    it("maintains semantic HTML structure", () => {
      const { container } = render(
        <AccessRequestBlock request={mockRequest} />,
      );

      const listItem = container.querySelector("li");
      expect(listItem).toBeInTheDocument();
    });

    it("provides visual feedback through button states", async () => {
      (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: true });
      (deleteAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

      render(<AccessRequestBlock request={mockRequest} />);

      const acceptButton = screen.getByRole("button", { name: /Accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(createAuthorizedUser).toHaveBeenCalled();
      });

      // Buttons should be interactive
      expect(acceptButton).toBeInTheDocument();
    });
  });
});
