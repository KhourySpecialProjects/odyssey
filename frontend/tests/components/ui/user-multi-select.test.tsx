import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import {
  UserMultiSelect,
  UserPickerButton,
} from "@/components/ui/user-multi-select";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";

jest.mock("@/lib/requests/authorized-user", () => ({
  fetchAuthorizedUsers: jest.fn(),
}));

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

describe("UserMultiSelect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchAuthorizedUsers as jest.Mock).mockResolvedValue(mockUsers);
  });

  it("renders nothing when no users are selected", () => {
    render(<UserMultiSelect selectedIds={[]} onChange={() => {}} />);
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  it("renders chips for selected users", async () => {
    render(<UserMultiSelect selectedIds={[1]} onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  it("renders remove button on chips", async () => {
    render(<UserMultiSelect selectedIds={[1]} onChange={() => {}} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /remove john doe/i }),
      ).toBeInTheDocument();
    });
  });

  it("calls onChange when removing a user chip", async () => {
    const handleChange = jest.fn();
    render(<UserMultiSelect selectedIds={[1, 2]} onChange={handleChange} />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /remove john doe/i }));
    expect(handleChange).toHaveBeenCalledWith([2]);
  });
});

describe("UserPickerButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchAuthorizedUsers as jest.Mock).mockResolvedValue(mockUsers);
  });

  it("renders the add button", () => {
    render(<UserPickerButton selectedIds={[]} onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("opens popover and shows users", async () => {
    render(<UserPickerButton selectedIds={[]} onChange={() => {}} />);

    fireEvent.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  it("calls onChange when selecting a user", async () => {
    const handleChange = jest.fn();
    render(<UserPickerButton selectedIds={[]} onChange={handleChange} />);

    fireEvent.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("John Doe"));
    expect(handleChange).toHaveBeenCalledWith([1]);
  });

  it("calls onChange when deselecting a user", async () => {
    const handleChange = jest.fn();
    render(<UserPickerButton selectedIds={[1]} onChange={handleChange} />);

    fireEvent.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("John Doe"));
    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it("handles multiple selections", async () => {
    const handleChange = jest.fn();
    render(<UserPickerButton selectedIds={[1]} onChange={handleChange} />);

    fireEvent.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Jane Smith"));
    expect(handleChange).toHaveBeenCalledWith([1, 2]);
  });

  it("shows empty state when no users match search", async () => {
    render(<UserPickerButton selectedIds={[]} onChange={() => {}} />);

    fireEvent.click(screen.getByRole("combobox"));

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("Search users...");
      fireEvent.change(searchInput, { target: { value: "NonexistentUser" } });
      expect(screen.getByText("No users found.")).toBeInTheDocument();
    });
  });
});
