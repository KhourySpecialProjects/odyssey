import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { UserMultiSelect } from "@/components/ui/user-multi-select";
import { fetchAllUsers } from "@/lib/requests/users";

jest.mock("@/lib/requests/users", () => ({
  fetchAllUsers: jest.fn(),
}));

describe("UserMultiSelect", () => {
  const mockUsers = [
    {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    },
    {
      id: 2,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
    },
  ];

  beforeEach(() => {
    (fetchAllUsers as jest.Mock).mockResolvedValue(mockUsers);
  });

  it("renders select button with placeholder", () => {
    const { getByRole } = render(
      <UserMultiSelect selectedIds={[]} onChange={() => {}} />,
    );

    expect(getByRole("combobox")).toHaveTextContent("Select users...");
  });

  it("displays selected users in button", async () => {
    const { getByRole } = render(
      <UserMultiSelect selectedIds={[1]} onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(getByRole("combobox")).toHaveTextContent("John Doe");
    });
  });

  it("handles user selection", async () => {
    const handleChange = jest.fn();
    const { getByRole, getByText } = render(
      <UserMultiSelect selectedIds={[]} onChange={handleChange} />,
    );

    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      fireEvent.click(getByText("John Doe"));
      expect(handleChange).toHaveBeenCalledWith([1]);
    });
  });

  it("shows empty state when no users match search", async () => {
    const { getByRole, getByPlaceholderText, getByText } = render(
      <UserMultiSelect selectedIds={[]} onChange={() => {}} />,
    );

    fireEvent.click(getByRole("combobox"));

    await waitFor(() => {
      const searchInput = getByPlaceholderText("Search users...");
      fireEvent.change(searchInput, { target: { value: "NonexistentUser" } });

      expect(getByText("No users found.")).toBeInTheDocument();
    });
  });

  jest.mock("@/lib/requests/users", () => ({
    fetchAllUsers: jest.fn(),
  }));

  describe("UserMultiSelect", () => {
    const mockUsers = [
      {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
      },
      {
        id: 2,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
      },
    ];

    beforeEach(() => {
      (fetchAllUsers as jest.Mock).mockResolvedValue(mockUsers);
    });

    it("handles user selection and deselection", async () => {
      const mockOnChange = jest.fn();

      render(<UserMultiSelect selectedIds={[]} onChange={mockOnChange} />);

      fireEvent.click(screen.getByRole("combobox"));

      await screen.findByText("John Doe");

      fireEvent.click(screen.getByText("John Doe"));
      expect(mockOnChange).toHaveBeenCalledWith([1]);
    });
  });
});
