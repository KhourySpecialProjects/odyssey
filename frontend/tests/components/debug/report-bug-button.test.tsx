import { render, screen, fireEvent } from "@testing-library/react";
import { ReportBugButton } from "@/components/debug/reportBugButton";

// Mock the ReportBugDialog component
jest.mock('@/components/droplets/reports/bug/dialog', () => ({
  ReportBugDialog: ({ open, onOpenChange }: { open: boolean, onOpenChange: () => void }) => (
    <div data-testid="report-bug-dialog" data-open={open} onClick={onOpenChange}>
      Mock Dialog
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

  it('toggles dialog state when onOpenChange is called', () => {
    const mockUser = { id: 1, email: 'test@example.com', roles: [], isActive: true };
    const { getByTestId } = render(<ReportBugButton user={mockUser} />);
    
    const dialog = getByTestId('report-bug-dialog');
    
    // Initial state should be closed
    expect(dialog).toHaveAttribute('data-open', 'false');
    
    // Click to toggle
    fireEvent.click(dialog);
    
    // Dialog should now be open
    expect(dialog).toHaveAttribute('data-open', 'true');
  });
});
