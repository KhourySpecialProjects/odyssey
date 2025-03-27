import { render, screen, fireEvent } from "@testing-library/react";
import { ReportBugDialog } from "@/components/droplets/reports/bug/dialog";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { TimeZone } from "@/types";

describe("ReportBugDialog", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    bio: "Test bio",
    profilePhoto: "https://example.com/photo.jpg",
    isEnabled: true,
    roles: [AuthorizedUserRoleTitle.Faculty],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    isActive: true,
  };

  const mockOnOpenChange = jest.fn();

  it("renders report bug button", () => {
    render(
      <ReportBugDialog
        user={mockUser}
        open={false}
        onOpenChange={mockOnOpenChange}
      />,
    );
    expect(screen.getAllByText("Report Bug")[0]).toBeInTheDocument();
  });

  it("opens dialog when button is clicked", () => {
    render(
      <ReportBugDialog
        user={mockUser}
        open={false}
        onOpenChange={mockOnOpenChange}
      />,
    );
    fireEvent.click(screen.getAllByText("Report Bug")[0]);
    expect(mockOnOpenChange).toHaveBeenCalledWith(true);
  });

  it("renders dialog content when open", () => {
    render(
      <ReportBugDialog
        user={mockUser}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );
    expect(screen.getByText(/outdated/i)).toBeInTheDocument();
  });
});
