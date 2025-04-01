import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReportBlock } from "@/components/admin/reports/report";
import { deleteReport } from "@/lib/actions";
import { toast } from "sonner";

jest.mock("next/link", () => {
  return function Link({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock("@/lib/actions", () => ({
  deleteReport: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ReportBlock", () => {
  const mockReport = {
    id: "1",
    type: "Bug",
    fullName: "John Doe",
    email: "john.doe@example.com",
    path: "/some-path",
    description: "This is a test report description",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders report information correctly", () => {
    render(<ReportBlock report={mockReport} />);

    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/john.doe@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Bug/)).toBeInTheDocument();
    expect(
      screen.getByText("This is a test report description"),
    ).toBeInTheDocument();
  });

  it("links to the correct report path", () => {
    render(<ReportBlock report={mockReport} />);

    const link = screen.getByRole("link", { name: /Visit Reported Page/i });
    expect(link).toHaveAttribute("href", "/some-path");
  });

  describe("ReportBlock", () => {
    const mockReport = {
      id: "123",
      fullName: "John Doe",
      email: "john@example.com",
      type: "Bug",
      description: "Test description",
      path: "/test-path",
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("renders report information correctly", () => {
      render(<ReportBlock report={mockReport} />);

      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/Bug/)).toBeInTheDocument();
      expect(screen.getByText("Test description")).toBeInTheDocument();
      expect(screen.getByText("Path: /test-path")).toBeInTheDocument();
    });

    it("handles successful report deletion", async () => {
      (deleteReport as jest.Mock).mockResolvedValue({ error: null });

      render(<ReportBlock report={mockReport} />);

      const deleteButton = screen.getByTitle("Delete Report");
      await fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(deleteReport).toHaveBeenCalledWith("123");
        expect(toast.success).toHaveBeenCalledWith("Report removed");
      });
    });

    it("handles failed report deletion", async () => {
      (deleteReport as jest.Mock).mockResolvedValue({
        error: "Failed to delete",
      });

      render(<ReportBlock report={mockReport} />);

      const deleteButton = screen.getByTitle("Delete Report");
      await fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(deleteReport).toHaveBeenCalledWith("123");
        expect(toast.error).toHaveBeenCalledWith("Failed to remove report");
      });
    });

    it("renders visit reported page link correctly", () => {
      render(<ReportBlock report={mockReport} />);

      const link = screen.getByText("Visit Reported Page");
      expect(link).toHaveAttribute("href", "/test-path");
    });
  });
});
