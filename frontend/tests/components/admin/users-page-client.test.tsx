import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UsersPageClient } from "@/components/admin/users/users-page-client";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { AuthorizedUser, TimeZone } from "@/types";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
  usePathname: jest.fn(() => "/admin/users"),
}));

// Mock updateUserInfo to avoid "use server" issues in tests
jest.mock("@/lib/requests/authorized-user", () => ({
  updateUserInfo: jest.fn().mockResolvedValue({ success: true }),
  createAuthorizedUser: jest.fn().mockResolvedValue({ ok: true }),
  createBatchAuthorizedUsers: jest
    .fn()
    .mockResolvedValue({ ok: true, data: { successful: [], failed: [] } }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const makeUser = (overrides: Partial<AuthorizedUser> = {}): AuthorizedUser => ({
  id: 1,
  email: "user@example.com",
  isEnabled: true,
  firstName: "Jane",
  lastName: "Doe",
  bio: "",
  profilePhoto: "",
  linkedin: "",
  github: "",
  website: "",
  firstTime: false,
  isPublic: true,
  friendships: [],
  sent_requests: [],
  received_requests: [],
  blocked: [],
  was_blocked: [],
  timeZone: "America/New_York" as TimeZone,
  roles: [],
  ...overrides,
});

const mockUsers = [
  makeUser({
    id: 1,
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Smith",
    roles: [{ id: 1, title: AuthorizedUserRoleTitle.SysAdmin }],
  }),
  makeUser({
    id: 2,
    email: "bob@example.com",
    firstName: "Bob",
    lastName: "Jones",
    roles: [{ id: 2, title: AuthorizedUserRoleTitle.Faculty }],
  }),
  makeUser({
    id: 3,
    email: "carol@example.com",
    firstName: "Carol",
    lastName: "Lee",
    roles: [{ id: 3, title: AuthorizedUserRoleTitle.ContentCreator }],
  }),
];

describe("UsersPageClient", () => {
  it("renders the table with column headers", () => {
    render(<UsersPageClient users={mockUsers} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders all users in the table", () => {
    render(<UsersPageClient users={mockUsers} />);

    // Each user appears in both mobile card and desktop table row
    expect(screen.getAllByText("Alice Smith").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob Jones").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Carol Lee").length).toBeGreaterThanOrEqual(1);
  });

  it("shows role badges for each user", () => {
    render(<UsersPageClient users={mockUsers} />);

    // Badges appear in both mobile and desktop views
    expect(screen.getAllByText("Admin").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Faculty").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Content Creator").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders edit and activity action buttons for each user", () => {
    render(<UsersPageClient users={mockUsers} />);

    const editButtons = screen.getAllByRole("button", { name: /edit user/i });
    const activityButtons = screen.getAllByRole("button", {
      name: /view activity/i,
    });

    expect(editButtons).toHaveLength(mockUsers.length);
    expect(activityButtons).toHaveLength(mockUsers.length);
  });

  it("shows email when no name is set", () => {
    const users = [
      makeUser({
        id: 4,
        email: "noname@example.com",
        firstName: "",
        lastName: "",
      }),
    ];
    render(<UsersPageClient users={users} />);
    // Email appears in both mobile card and desktop table
    expect(
      screen.getAllByText("noname@example.com").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("displays empty state when no users found", () => {
    render(<UsersPageClient users={[]} />);
    // Empty message may appear in both mobile and desktop views
    expect(
      screen.getAllByText("No users found.").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("filters users by search term", async () => {
    render(<UsersPageClient users={mockUsers} />);

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: "alice" } });

    await waitFor(() => {
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThanOrEqual(
        1,
      );
      expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    });
  });

  it("paginates with 8 items per page", () => {
    const manyUsers = Array.from({ length: 15 }, (_, i) =>
      makeUser({
        id: i + 1,
        email: `user${String(i + 1).padStart(2, "0")}@example.com`,
        firstName: `First`,
        lastName: `User${String(i + 1).padStart(2, "0")}`,
        roles: [],
      }),
    );

    render(<UsersPageClient users={manyUsers} />);

    expect(screen.getAllByText("First User01").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("First User08").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.queryByText("First User09")).not.toBeInTheDocument();
  });

  it("shows Previous and Next pagination buttons when there are multiple pages", () => {
    const manyUsers = Array.from({ length: 15 }, (_, i) =>
      makeUser({
        id: i + 10,
        email: `u${i}@example.com`,
        firstName: `F${i}`,
        lastName: `L${i}`,
      }),
    );
    render(<UsersPageClient users={manyUsers} />);
    expect(
      screen.getAllByRole("button", { name: /previous/i }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: /next/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
