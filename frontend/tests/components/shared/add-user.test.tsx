import { render, screen, fireEvent } from "@testing-library/react";
import { AddUser } from "@/components/shared/access-manager/add-user/add-user";

const mockUseFormStatus = jest.fn();
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => mockUseFormStatus(),
}));

describe("AddUser", () => {
  beforeEach(() => {
    mockUseFormStatus.mockReturnValue({ pending: false });
  });

  afterEach(() => {
    mockUseFormStatus.mockClear();
  });

  it("renders form elements", () => {
    render(<AddUser />);
    expect(
      screen.getByPlaceholderText("Enter email address"),
    ).toBeInTheDocument();
    expect(screen.getByText("Send Invite")).toBeInTheDocument();
  });

  it("handles form submission", async () => {
    render(<AddUser />);

    const input = screen.getByPlaceholderText("Enter email address");
    fireEvent.change(input, { target: { value: "test@example.com" } });
    const form = screen.getByTestId("add-user-form");
    fireEvent.submit(form);

    expect(input).toHaveValue("");
  });

  it("requires email input", () => {
    render(<AddUser />);
    const input = screen.getByPlaceholderText("Enter email address");
    expect(input).toHaveAttribute("required");
  });

  it('shows "Send Invite" when not pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: false });
    render(<AddUser />);

    const submitButton = screen.getByRole("button");
    expect(submitButton).toHaveTextContent("Send Invite");
    expect(submitButton).not.toBeDisabled();
  });

  it('shows "Sending..." when pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: true });
    render(<AddUser />);

    const submitButton = screen.getByRole("button");
    expect(submitButton).toHaveTextContent("Sending...");
    expect(submitButton).toBeDisabled();
  });
});
