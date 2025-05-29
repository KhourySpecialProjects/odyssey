import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthorizedUserClient } from "@/components/admin/users/authorized-user-client";
import { TimeZone } from "@/types";

jest.mock("@/components/admin/users/authorized-user", () => ({
  AuthorizedUserBlock: ({ user }: { user: any }) => (
    <div data-testid={`user-${user.id}`}>{user.email}</div>
  ),
}));

describe("AuthorizedUserClient", () => {
  const mockUsers = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    email: `user${i + 1}@example.com`,
    isEnabled: true,
    roles: [],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstName: "first",
    lastName: "last",
    bio: "bio",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
  }));

  it("renders a list of users", () => {
    render(<AuthorizedUserClient authorizedUsers={mockUsers.slice(0, 5)} />);

    expect(screen.getByTestId("user-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-5")).toBeInTheDocument();
  });

  it("displays pagination correctly", () => {
    render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

    expect(screen.getByTestId("user-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-10")).toBeInTheDocument();
    expect(screen.getByTestId("user-11")).toBeInTheDocument();
    expect(screen.queryByTestId("user-21")).not.toBeInTheDocument();

    const prevButton = screen.getByRole("button", { name: /chevron-left/i });
    expect(prevButton).toBeDisabled();
  });

  it("navigates to next page when Next button is clicked", () => {
    render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

    const nextButton = screen.getByRole("button", { name: /chevron-right/i });
    fireEvent.click(nextButton);

    expect(screen.queryByTestId("user-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("user-11")).not.toBeInTheDocument();
    expect(screen.queryByTestId("user-15")).not.toBeInTheDocument();
    expect(screen.getByTestId("user-21")).toBeInTheDocument();
    expect(screen.getByTestId("user-24")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /chevron-left/i }),
    ).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
  });

  it("navigates to previous page when Previous button is clicked", () => {
    render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

    const nextButton = screen.getByRole("button", { name: /chevron-right/i });
    fireEvent.click(nextButton);

    const prevButton = screen.getByRole("button", { name: /chevron-left/i });
    fireEvent.click(prevButton);

    expect(screen.getByTestId("user-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-10")).toBeInTheDocument();
    expect(screen.getByTestId("user-11")).toBeInTheDocument();
    expect(screen.queryByTestId("user-21")).not.toBeInTheDocument();
  });

  it("displays a message when there are no users", () => {
    render(<AuthorizedUserClient authorizedUsers={[]} />);

    expect(
      screen.getByText("There are no authorized users."),
    ).toBeInTheDocument();
  });

  describe("AuthorizedUserClient", () => {
    it("renders all users initially", () => {
      render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

      expect(screen.getByText("user1@example.com")).toBeInTheDocument();
      expect(screen.getByText("user3@example.com")).toBeInTheDocument();
    });

    it("filters users by search term", async () => {
      render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "user1@example.com" } });

      await waitFor(() => {
        expect(screen.getByText("user1@example.com")).toBeInTheDocument();
        expect(screen.queryByText("user2@example.com")).not.toBeInTheDocument();
      });
    });

    it("filters users by email", async () => {
      render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "user9@example.com" } });

      await waitFor(() => {
        expect(screen.getByText("user9@example.com")).toBeInTheDocument();
        expect(screen.getByText("user10@example.com")).toBeInTheDocument();
      });
    });

    it("shows no results message when no users match search", async () => {
      render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      await waitFor(() => {
        expect(
          screen.getByText("There are no authorized users."),
        ).toBeInTheDocument();
      });
    });

    it("resets search results when search term is cleared", async () => {
      render(<AuthorizedUserClient authorizedUsers={mockUsers} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "John" } });

      await waitFor(() => {
        expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
      });

      fireEvent.change(searchInput, { target: { value: "" } });

      await waitFor(() => {
        expect(screen.getByText("user9@example.com")).toBeInTheDocument();
        expect(screen.getByText("user10@example.com")).toBeInTheDocument();
      });
    });
  });
});
