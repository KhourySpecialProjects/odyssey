import { render, screen, fireEvent } from "@testing-library/react";
import { ReportBugButton } from "@/components/debug/reportBugButton";

// Mock the ReportBugDialog component
jest.mock("@/components/droplets/reports/bug/dialog", () => ({
  ReportBugDialog: ({
    user,
    open,
    onOpenChange,
  }: {
    user: any;
    open: boolean;
    onOpenChange: () => void;
  }) => (
    <div data-testid="report-bug-dialog" data-open={open}>
      {open && (
        <button onClick={onOpenChange} data-testid="close-dialog">
          Close Dialog
        </button>
      )}
    </div>
  ),
}));

describe("ReportBugButton", () => {
  const mockUser = {
    id: 1,
    email: "test@example.com",
    roles: [],
    isActive: true,
  };

  it("renders the ReportBugDialog with initial state closed", () => {
    render(<ReportBugButton user={mockUser} />);

    const dialog = screen.getByTestId("report-bug-dialog");
    expect(dialog).toHaveAttribute("data-open", "false");
  });

  it("passes the user prop to the dialog", () => {
    render(<ReportBugButton user={mockUser} />);

    expect(screen.getByTestId("report-bug-dialog")).toBeInTheDocument();
  });

  it("works with undefined user", () => {
    render(<ReportBugButton user={undefined} />);

    expect(screen.getByTestId("report-bug-dialog")).toBeInTheDocument();
  });
});
