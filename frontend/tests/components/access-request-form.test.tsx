import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequestAccessForm } from "@/components/access-request-form";
import { createAccessRequest } from "@/lib/actions";
import { toast } from "sonner";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/actions", () => ({
  createAccessRequest: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("RequestAccessForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const selectOption = async (triggerText: string, optionValue: string) => {
    const trigger = screen.getByRole("combobox", { name: triggerText });
    fireEvent.click(trigger);
    const option = screen.getByRole("option", { name: optionValue });
    fireEvent.click(option);
  };

  it("handles successful form submission", async () => {
    (createAccessRequest as jest.Mock).mockResolvedValue({ ok: true });

    render(<RequestAccessForm />);

    fireEvent.change(screen.getByPlaceholderText("Sam"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Serif"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("serif.s@northeastern.edu"), {
      target: { value: "john.doe@northeastern.edu" },
    });

    await selectOption("Affiliation", "Undergraduate Student");
    await selectOption("College", "Khoury College of Computer Sciences");

    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    await waitFor(() => {
      expect(createAccessRequest).toHaveBeenCalledWith({
        givenName: "John",
        familyName: "Doe",
        email: "john.doe@northeastern.edu",
        affiliation: "undergraduateStudent",
        college: "KCCS",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Your access request has been successfully submitted.",
      );
    });
  });

  it("handles failed form submission", async () => {
    const user = userEvent.setup();
    (createAccessRequest as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Test error",
    });

    render(<RequestAccessForm />);

    fireEvent.change(screen.getByPlaceholderText("Sam"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Serif"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("serif.s@northeastern.edu"), {
      target: { value: "john.doe@northeastern.edu" },
    });

    await selectOption("Affiliation", "Undergraduate Student");
    await selectOption("College", "Khoury College of Computer Sciences");

    await user.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Uh oh! Something went wrong.", {
        description: "Test error",
      });
    });
  });

  it("handles failed form submission no description", async () => {
    const user = userEvent.setup();
    (createAccessRequest as jest.Mock).mockResolvedValue({ ok: false });

    render(<RequestAccessForm />);

    fireEvent.change(screen.getByPlaceholderText("Sam"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Serif"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("serif.s@northeastern.edu"), {
      target: { value: "john.doe@northeastern.edu" },
    });

    await selectOption("Affiliation", "Undergraduate Student");
    await selectOption("College", "Khoury College of Computer Sciences");

    await user.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Uh oh! Something went wrong.", {
        description: "",
      });
    });
  });

  it("disables submit button during submission", async () => {
    (createAccessRequest as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100)),
    );

    render(<RequestAccessForm />);

    fireEvent.change(screen.getByPlaceholderText("Sam"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Serif"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("serif.s@northeastern.edu"), {
      target: { value: "john.doe@northeastern.edu" },
    });

    await selectOption("Affiliation", "Undergraduate Student");
    await selectOption("College", "Khoury College of Computer Sciences");

    const submitButton = screen.getByRole("button", { name: "Submit Request" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
