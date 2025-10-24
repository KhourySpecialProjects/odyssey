import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddUser } from "@/components/shared/access-manager/add-user/add-user";
import { createBatchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { toast } from "sonner";

const mockUseFormStatus = jest.fn();

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => mockUseFormStatus(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  createBatchAuthorizedUsers: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("AddUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFormStatus.mockReturnValue({ pending: false });
  });

  describe("Rendering", () => {
    it("renders section with heading", () => {
      render(<AddUser />);

      expect(
        screen.getByRole("heading", { name: /Add User/i }),
      ).toBeInTheDocument();
    });

    it("renders descriptive text", () => {
      render(<AddUser />);

      expect(
        screen.getByText("Invite a new user by entering their email address."),
      ).toBeInTheDocument();
    });

    it("renders form with test id", () => {
      render(<AddUser />);

      const form = screen.getByTestId("add-user-form");
      expect(form).toBeInTheDocument();
    });

    it("renders email input field", () => {
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "email");
    });

    it("renders submit button", () => {
      render(<AddUser />);

      const button = screen.getByRole("button", { name: /Add User/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("type", "submit");
    });

    it("applies dark mode classes", () => {
      render(<AddUser />);

      const heading = screen.getByRole("heading", { name: /Add User/i });
      expect(heading).toHaveClass("dark:text-slate-300");

      const description = screen.getByText(
        "Invite a new user by entering their email address.",
      );
      expect(description).toHaveClass("dark:text-slate-300");
    });
  });

  describe("Form Validation", () => {
    it("email input is required", () => {
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      expect(input).toHaveAttribute("required");
    });

    it("email input has correct type", () => {
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      expect(input).toHaveAttribute("type", "email");
    });

    it("input has flex-grow class", () => {
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      expect(input).toHaveClass("flex-grow");
    });
  });

  describe("Input Interactions", () => {
    it("updates email value on input change", async () => {
      const user = userEvent.setup();
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      await user.type(input, "test@example.com");

      expect(input).toHaveValue("test@example.com");
    });

    it("allows typing in email field", async () => {
      const user = userEvent.setup();
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      await user.type(input, "john.doe@northeastern.edu");

      expect(input).toHaveValue("john.doe@northeastern.edu");
    });

    it("starts with empty email value", () => {
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      expect(input).toHaveValue("");
    });

    it("handles special characters in email", async () => {
      const user = userEvent.setup();
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      await user.type(input, "user+tag@example.com");

      expect(input).toHaveValue("user+tag@example.com");
    });

    it("handles clearing input", async () => {
      const user = userEvent.setup();
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      await user.type(input, "test@example.com");
      await user.clear(input);

      expect(input).toHaveValue("");
    });
  });

  describe("Form Submission", () => {
    it("calls createBatchAuthorizedUsers on form submit", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      const button = screen.getByRole("button", { name: /Add User/i });

      fireEvent.change(input, { target: { value: "test@example.com" } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([
          "test@example.com",
        ]);
      });
    });

    it("passes email as array to createBatchAuthorizedUsers", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, { target: { value: "user@example.com" } });

      const form = screen.getByTestId("add-user-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([
          "user@example.com",
        ]);
      });
    });

    it("shows success toast on successful submission", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, { target: { value: "test@example.com" } });

      const form = screen.getByTestId("add-user-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("User added successfully");
      });
    });

    it("shows error toast on failed submission", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({
        ok: false,
      });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, { target: { value: "test@example.com" } });

      const form = screen.getByTestId("add-user-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("error adding user");
      });
    });

    it("clears email field after successful submission", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, { target: { value: "test@example.com" } });

      const form = screen.getByTestId("add-user-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });

    it("clears email field after failed submission", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({
        ok: false,
      });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, { target: { value: "test@example.com" } });

      const form = screen.getByTestId("add-user-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });

    it("prevents default form submission", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, { target: { value: "test@example.com" } });

      const form = screen.getByTestId("add-user-form");
      const submitEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = jest.spyOn(submitEvent, "preventDefault");

      form.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("handles submission with userEvent", async () => {
      const user = userEvent.setup();
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      await user.type(input, "test@example.com");

      const button = screen.getByRole("button", { name: /Add User/i });
      await user.click(button);

      await waitFor(() => {
        expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([
          "test@example.com",
        ]);
      });
    });
  });

  describe("Submit Button States", () => {
    it('shows "Add User" when not pending', () => {
      mockUseFormStatus.mockReturnValue({ pending: false });
      render(<AddUser />);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Add User");
      expect(button).not.toBeDisabled();
    });

    it('shows "Adding..." when pending', () => {
      mockUseFormStatus.mockReturnValue({ pending: true });
      render(<AddUser />);

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Adding...");
      expect(button).toBeDisabled();
    });

    it("button is enabled by default", () => {
      mockUseFormStatus.mockReturnValue({ pending: false });
      render(<AddUser />);

      const button = screen.getByRole("button", { name: /Add User/i });
      expect(button).not.toBeDisabled();
    });

    it("button is disabled when pending", () => {
      mockUseFormStatus.mockReturnValue({ pending: true });
      render(<AddUser />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("applies dark mode class to button", () => {
      render(<AddUser />);

      const button = screen.getByRole("button", { name: /Add User/i });
      expect(button).toHaveClass("dark:bg-slate-300");
    });

    it("button has submit type", () => {
      render(<AddUser />);

      const button = screen.getByRole("button", { name: /Add User/i });
      expect(button).toHaveAttribute("type", "submit");
    });
  });

  describe("Error Handling", () => {
    it("handles empty response object", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({});

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, { target: { value: "test@example.com" } });

      const form = screen.getByTestId("add-user-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("error adding user");
      });
    });
  });

  describe("Multiple Submissions", () => {
    it("handles multiple successful submissions", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      const form = screen.getByTestId("add-user-form");

      // First submission
      fireEvent.change(input, { target: { value: "user1@example.com" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([
          "user1@example.com",
        ]);
      });

      // Second submission
      fireEvent.change(input, { target: { value: "user2@example.com" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([
          "user2@example.com",
        ]);
      });

      expect(createBatchAuthorizedUsers).toHaveBeenCalledTimes(2);
    });

    it("clears input between submissions", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      const form = screen.getByTestId("add-user-form");

      fireEvent.change(input, { target: { value: "first@example.com" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(input).toHaveValue("");
      });

      fireEvent.change(input, { target: { value: "second@example.com" } });
      expect(input).toHaveValue("second@example.com");
    });
  });

  describe("Edge Cases", () => {
    it("handles very long email addresses", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      const longEmail = "a".repeat(50) + "@" + "b".repeat(50) + ".com";

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, { target: { value: longEmail } });

      const form = screen.getByTestId("add-user-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([longEmail]);
      });
    });

    it("handles email with multiple @ symbols", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, { target: { value: "user@@example.com" } });

      const form = screen.getByTestId("add-user-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([
          "user@@example.com",
        ]);
      });
    });

    it("handles email with special domain", async () => {
      (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({ ok: true });

      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, {
        target: { value: "user@subdomain.example.co.uk" },
      });

      const form = screen.getByTestId("add-user-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(createBatchAuthorizedUsers).toHaveBeenCalledWith([
          "user@subdomain.example.co.uk",
        ]);
      });
    });

    it("preserves email value during pending state", () => {
      mockUseFormStatus.mockReturnValue({ pending: true });
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      fireEvent.change(input, { target: { value: "test@example.com" } });

      expect(input).toHaveValue("test@example.com");
    });
  });

  describe("Layout and Styling", () => {
    it("applies correct spacing classes", () => {
      const { container } = render(<AddUser />);

      const section = container.querySelector("section");
      expect(section).toHaveClass("mt-8");

      const form = screen.getByTestId("add-user-form");
      expect(form).toHaveClass("mt-4");
    });

    it("applies flex layout to input container", () => {
      const { container } = render(<AddUser />);

      const inputContainer = container.querySelector(
        ".flex.items-center.space-x-2",
      );
      expect(inputContainer).toBeInTheDocument();
    });

    it("heading has bold class", () => {
      render(<AddUser />);

      const heading = screen.getByRole("heading", { name: /Add User/i });
      expect(heading).toHaveClass("font-bold");
    });
  });

  describe("Accessibility", () => {
    it("has proper heading hierarchy", () => {
      render(<AddUser />);

      const heading = screen.getByRole("heading", {
        name: /Add User/i,
        level: 2,
      });
      expect(heading).toBeInTheDocument();
    });

    it("form has accessible test id", () => {
      render(<AddUser />);

      const form = screen.getByTestId("add-user-form");
      expect(form.tagName).toBe("FORM");
    });

    it("input has placeholder text", () => {
      render(<AddUser />);

      const input = screen.getByPlaceholderText("Enter email address");
      expect(input).toBeInTheDocument();
    });

    it("button has descriptive text", () => {
      render(<AddUser />);

      const button = screen.getByRole("button", { name: /Add User/i });
      expect(button).toHaveAccessibleName();
    });

    it("maintains semantic HTML structure", () => {
      const { container } = render(<AddUser />);

      const section = container.querySelector("section");
      const heading = section?.querySelector("h2");
      const form = section?.querySelector("form");

      expect(section).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      expect(form).toBeInTheDocument();
    });
  });
});
