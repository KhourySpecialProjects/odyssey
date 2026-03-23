import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateUser } from "@/components/admin/users/create-user";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockCreateUser = jest.fn();
jest.mock("@/lib/actions", () => ({
  createAuthorizedUserWithState: (...args: any[]) => mockCreateUser(...args),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("flat", () => ({
  flatten: jest.fn((obj) => obj),
  unflatten: jest.fn((obj) => obj),
}));

describe("CreateUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Create User button", () => {
    render(<CreateUser />);
    expect(screen.getByText("Create User")).toBeInTheDocument();
  });

  it("opens the modal when Create User is clicked", async () => {
    render(<CreateUser />);
    await userEvent.click(screen.getByText("Create User"));
    expect(screen.getByText("Add User", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByText("Batch Add Users")).toBeInTheDocument();
  });

  it("shows the single email input and Add User button in modal", async () => {
    render(<CreateUser />);
    await userEvent.click(screen.getByText("Create User"));
    expect(
      screen.getByPlaceholderText("Enter email address"),
    ).toBeInTheDocument();
    expect(screen.getByText("Add User", { selector: "button" })).toBeInTheDocument();
  });

  it("shows the batch textarea and drag-drop area", async () => {
    render(<CreateUser />);
    await userEvent.click(screen.getByText("Create User"));
    expect(
      screen.getByPlaceholderText(
        "Enter email addresses separated by commas or new lines.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Drag and Drop files here/)).toBeInTheDocument();
  });

  it("calls createAuthorizedUserWithState when adding a single user", async () => {
    mockCreateUser.mockResolvedValue({ ok: true, message: "Created" });
    render(<CreateUser />);
    await userEvent.click(screen.getByText("Create User"));

    const emailInput = screen.getByPlaceholderText("Enter email address");
    await userEvent.type(emailInput, "test@northeastern.edu");

    const addButton = screen.getByText("Add User", { selector: "button" });
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledTimes(1);
      expect(mockCreateUser).toHaveBeenCalledWith(null, expect.any(FormData));
    });
  });

  it("clears the input after successful single user add", async () => {
    mockCreateUser.mockResolvedValue({ ok: true, message: "Created" });
    render(<CreateUser />);
    await userEvent.click(screen.getByText("Create User"));

    const emailInput = screen.getByPlaceholderText(
      "Enter email address",
    ) as HTMLInputElement;
    await userEvent.type(emailInput, "test@northeastern.edu");
    await userEvent.click(
      screen.getByText("Add User", { selector: "button" }),
    );

    await waitFor(() => {
      expect(emailInput.value).toBe("");
    });
  });

  it("does not call create when single email input is empty", async () => {
    render(<CreateUser />);
    await userEvent.click(screen.getByText("Create User"));

    const addButton = screen.getByText("Add User", { selector: "button" });
    expect(addButton).toBeDisabled();
  });

  it("calls createAuthorizedUserWithState for each email in batch mode", async () => {
    mockCreateUser.mockResolvedValue({ ok: true, message: "Created" });
    render(<CreateUser />);
    await userEvent.click(screen.getByText("Create User"));

    const textarea = screen.getByPlaceholderText(
      "Enter email addresses separated by commas or new lines.",
    );
    await userEvent.type(
      textarea,
      "a@northeastern.edu,b@northeastern.edu",
    );

    await userEvent.click(screen.getByText("Add Users"));

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledTimes(2);
    });
  });

  it("shows error toast when single user creation fails", async () => {
    const { toast } = require("sonner");
    mockCreateUser.mockResolvedValue({
      ok: false,
      error: "User already exists",
    });
    render(<CreateUser />);
    await userEvent.click(screen.getByText("Create User"));

    await userEvent.type(
      screen.getByPlaceholderText("Enter email address"),
      "existing@northeastern.edu",
    );
    await userEvent.click(
      screen.getByText("Add User", { selector: "button" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("User already exists");
    });
  });

  it("disables Add Users button when batch textarea is empty", async () => {
    render(<CreateUser />);
    await userEvent.click(screen.getByText("Create User"));

    const addUsersButton = screen.getByText("Add Users");
    expect(addUsersButton).toBeDisabled();
  });
});
