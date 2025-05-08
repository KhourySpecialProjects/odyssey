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
    expect(screen.getAllByText("Add User")[0]).toBeInTheDocument();
  });

  it("requires email input", () => {
    render(<AddUser />);
    const input = screen.getByPlaceholderText("Enter email address");
    expect(input).toHaveAttribute("required");
  });

  it('shows "Add User" when not pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: false });
    render(<AddUser />);

    const submitButton = screen.getByRole("button");
    expect(submitButton).toHaveTextContent("Add User");
    expect(submitButton).not.toBeDisabled();
  });

  it('shows "Adding..." when pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: true });
    render(<AddUser />);

    const submitButton = screen.getByRole("button");
    expect(submitButton).toHaveTextContent("Adding...");
    expect(submitButton).toBeDisabled();
  });
});
