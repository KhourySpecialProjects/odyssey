import { render, screen, fireEvent } from "@testing-library/react";
import { ReportBugDialog } from "@/components/droplets/reports/bug/dialog";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { TimeZone, User } from "@/types";

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

jest.mock("@/components/droplets/reports/bug/form.tsx", () => ({
  ReportBugForm: ({ name, email, onSuccess }: any) => (
    <form onSubmit={onSuccess}>
      <input
        data-testid="name-input"
        value={name}
        onChange={() => {}}
        placeholder="Name"
      />
      <input
        data-testid="email-input"
        value={email}
        onChange={() => {}}
        placeholder="Email"
      />
      <button type="submit">Submit</button>
    </form>
  ),
}));

describe("ReportBugDialog", () => {
  const mockOnOpenChange = jest.fn();

  const mockUser: User = {
    name: "John Doe",
    email: "johndoe@example.com",
    roles: [],
    isActive: true,
  };

  it("passes the correct props to ReportBugForm", () => {
    render(
      <ReportBugDialog
        user={mockUser}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    const nameInput = screen.getByTestId("name-input");
    const emailInput = screen.getByTestId("email-input");

    expect(nameInput).toHaveValue(mockUser.name);
    expect(emailInput).toHaveValue(mockUser.email);
  });

  it("calls onOpenChange when the form is submitted", () => {
    render(
      <ReportBugDialog
        user={mockUser}
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
    );

    const submitButton = screen.getByText("Submit");

    fireEvent.click(submitButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
