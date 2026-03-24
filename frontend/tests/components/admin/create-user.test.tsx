import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateUser } from "@/components/admin/users/create-user";

const mockRouterRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const mockCreateUser = jest.fn();
jest.mock("@/lib/actions", () => ({
  createAuthorizedUserWithState: (...args: unknown[]) =>
    mockCreateUser(...args),
}));

describe("CreateUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the create user button", () => {
    render(<CreateUser />);
    expect(screen.getByText("Create User")).toBeInTheDocument();
  });

  it("has the correct button text and icon", () => {
    render(<CreateUser />);
    expect(screen.getByText("Create User")).toBeInTheDocument();
  });

  it("shows toast and refreshes on successful single user add", async () => {
    mockCreateUser.mockResolvedValue({ ok: true });

    render(<CreateUser />);
    fireEvent.click(screen.getByText("Create User"));

    const emailInput = await screen.findByPlaceholderText(
      "Enter email address",
    );
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add User$/ }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "User test@example.com added successfully",
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("shows error toast when user creation fails", async () => {
    mockCreateUser.mockResolvedValue({
      ok: false,
      error: "Failed to add user",
    });

    render(<CreateUser />);
    fireEvent.click(screen.getByText("Create User"));

    const emailInput = await screen.findByPlaceholderText(
      "Enter email address",
    );
    fireEvent.change(emailInput, { target: { value: "bad@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add User$/ }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to add user");
    });
  });
});
