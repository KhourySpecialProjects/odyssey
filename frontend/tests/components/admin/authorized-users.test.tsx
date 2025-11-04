import { render, screen } from "@testing-library/react";
import { AuthorizedUsers } from "@/components/admin/users/authorized-users";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";

jest.mock("@/lib/requests/authorized-user", () => ({
  fetchAuthorizedUsers: jest.fn(),
}));

jest.mock("@/components/admin/users/create-user", () => ({
  CreateUser: () => <div data-testid="create-user">Create User Button</div>,
}));

jest.mock("@/components/admin/users/authorized-user-client", () => ({
  AuthorizedUserClient: ({ authorizedUsers }: { authorizedUsers: any[] }) => (
    <div data-testid="user-client">
      User Client with {authorizedUsers.length} users
    </div>
  ),
}));

describe("AuthorizedUsers", () => {
  const mockUsers = [
    {
      id: 1,
      email: "user1@example.com",
      isEnabled: true,
      roles: [],
    },
    {
      id: 2,
      email: "user2@example.com",
      isEnabled: true,
      roles: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchAuthorizedUsers as jest.Mock).mockResolvedValue(mockUsers);
  });

  it("renders the component with correct heading", async () => {
    render(await AuthorizedUsers());

    expect(screen.getByText("Authorized Users")).toBeInTheDocument();
    expect(
      screen.getByText("The following users have access to this application."),
    ).toBeInTheDocument();
  });

  it("includes the CreateUser component", async () => {
    render(await AuthorizedUsers());

    expect(screen.getByTestId("create-user")).toBeInTheDocument();
  });

  it("passes fetched users to AuthorizedUserClient", async () => {
    render(await AuthorizedUsers());

    expect(screen.getByTestId("user-client")).toBeInTheDocument();
    expect(screen.getByText("User Client with 2 users")).toBeInTheDocument();
  });

  it("calls fetchAuthorizedUsers to get data", async () => {
    render(await AuthorizedUsers());

    expect(fetchAuthorizedUsers).toHaveBeenCalledTimes(1);
  });
});
