import { render, screen, waitFor } from "@testing-library/react";
import { ReportBugForm } from "@/components/droplets/reports/bug/form";
import userEvent from "@testing-library/user-event";
import { createBugReport } from "@/lib/actions";
import { toast } from "sonner";
import { usePathname, useSearchParams } from "next/navigation";

jest.mock("@/lib/actions");
jest.mock("sonner");
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("ReportBugForm", () => {
  const mockOnSuccess = jest.fn();
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchParams as jest.Mock).mockReturnValue({
      get: mockGet,
    });
    mockGet.mockReturnValue(null); // Default: no adminTab
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

  it("handles successful form submission", async () => {
    (createBugReport as jest.Mock).mockResolvedValue({ ok: true });

    render(<ReportBugForm onSuccess={mockOnSuccess} />);

    await userEvent.type(screen.getByPlaceholderText("John Doe"), "Test User");
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

    await userEvent.type(screen.getByPlaceholderText("John Doe"), "Test User");
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
      expect(toast.error).toHaveBeenCalledWith("Uh oh! Something went wrong.", {
        description: "Test error",
      });
    });
  });

  it("handles failed form submission no error", async () => {
    (createBugReport as jest.Mock).mockResolvedValue({ ok: false });

    render(<ReportBugForm onSuccess={mockOnSuccess} />);

    await userEvent.type(screen.getByPlaceholderText("John Doe"), "Test User");
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
      expect(toast.error).toHaveBeenCalledWith("Uh oh! Something went wrong.", {
        description: "",
      });
    });
  });

  describe("path field initialization", () => {
    it("uses pathname when available", () => {
      (usePathname as jest.Mock).mockReturnValue("/test-path");

      render(<ReportBugForm onSuccess={mockOnSuccess} />);

      const pathInput = screen.getByLabelText(/path/i);
      expect(pathInput).toHaveValue("/test-path");
    });

    it('uses "Unknown" when pathname is null', async () => {
      (usePathname as jest.Mock).mockReturnValue(null);

      const { rerender } = render(<ReportBugForm onSuccess={mockOnSuccess} />);

      rerender(<ReportBugForm onSuccess={mockOnSuccess} />);

      const pathInput = await screen.findByLabelText(/path/i);
      expect(pathInput).toHaveValue("Unknown");
    });

    it('uses "Unknown" when pathname is undefined', async () => {
      (usePathname as jest.Mock).mockReturnValue(undefined);

      const { rerender } = render(<ReportBugForm onSuccess={mockOnSuccess} />);

      rerender(<ReportBugForm onSuccess={mockOnSuccess} />);

      const pathInput = await screen.findByLabelText(/path/i);
      expect(pathInput).toHaveValue("Unknown");
    });
  });
});
