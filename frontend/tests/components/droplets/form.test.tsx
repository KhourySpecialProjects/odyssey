import { render, screen, waitFor } from "@testing-library/react";
import { ReportBugForm } from "@/components/droplets/reports/bug/form";
import userEvent from "@testing-library/user-event";
import { createBugReport } from "@/lib/actions";
import { toast } from "sonner";

jest.mock("@/lib/actions");
jest.mock("sonner");
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  usePathname: () => "/test-path",
}));

describe("ReportBugForm", () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form fields correctly", () => {
    render(<ReportBugForm onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Path/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  it("pre-fills form with provided user data", () => {
    const name = "John Doe";
    const email = "john@northeastern.edu";

    render(
      <ReportBugForm name={name} email={email} onSuccess={mockOnSuccess} />,
    );

    expect(screen.getByDisplayValue(name)).toBeInTheDocument();
    expect(screen.getByDisplayValue(email)).toBeInTheDocument();
  });

  jest.mock("@/lib/actions");
  jest.mock("sonner");
  jest.mock("next/navigation", () => ({
    redirect: jest.fn(),
    usePathname: () => "/test-path",
  }));

  describe("ReportBugForm", () => {
    const mockOnSuccess = jest.fn();

    it("handles successful form submission", async () => {
      (createBugReport as jest.Mock).mockResolvedValue({ ok: true });

      render(<ReportBugForm onSuccess={mockOnSuccess} />);

      await userEvent.type(
        screen.getByPlaceholderText("John Doe"),
        "Test User",
      );
      await userEvent.type(
        screen.getByPlaceholderText("f.last@northeastern.edu"),
        "test@test.com",
      );
      await userEvent.type(
        screen.getByPlaceholderText("Tell us about the issue..."),
        "Test description",
      );

      await userEvent.click(screen.getByText("Submit Report"));

      await waitFor(() => {
        expect(createBugReport).toHaveBeenCalledWith(
          expect.objectContaining({
            fullName: "Test User",
            email: "test@test.com",
            description: "Test description",
          }),
        );
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith(
          "Your report has been successfully submitted.",
        );
      });
    });

    it("handles failed form submission", async () => {
      (createBugReport as jest.Mock).mockResolvedValue({
        ok: false,
        error: "Test error",
      });

      render(<ReportBugForm onSuccess={mockOnSuccess} />);

      await userEvent.type(
        screen.getByPlaceholderText("John Doe"),
        "Test User",
      );
      await userEvent.type(
        screen.getByPlaceholderText("f.last@northeastern.edu"),
        "test@test.com",
      );
      await userEvent.type(
        screen.getByPlaceholderText("Tell us about the issue..."),
        "Test description",
      );

      await userEvent.click(screen.getByText("Submit Report"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Uh oh! Something went wrong.",
          {
            description: "Test error",
          },
        );
      });
    });

    it("handles failed form submission no error", async () => {
      (createBugReport as jest.Mock).mockResolvedValue({ ok: false });

      render(<ReportBugForm onSuccess={mockOnSuccess} />);

      await userEvent.type(
        screen.getByPlaceholderText("John Doe"),
        "Test User",
      );
      await userEvent.type(
        screen.getByPlaceholderText("f.last@northeastern.edu"),
        "test@test.com",
      );
      await userEvent.type(
        screen.getByPlaceholderText("Tell us about the issue..."),
        "Test description",
      );

      await userEvent.click(screen.getByText("Submit Report"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Uh oh! Something went wrong.",
          {
            description: "",
          },
        );
      });
    });
  });
});
