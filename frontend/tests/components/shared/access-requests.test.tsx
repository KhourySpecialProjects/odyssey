import { render, screen } from "@testing-library/react";
import { AccessRequests } from "@/components/shared/access-manager/access-requests/access-requests";
import { fetchAccessRequests } from "@/lib/requests/data";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";

jest.mock("@/lib/requests/data", () => ({
  fetchAccessRequests: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  fetchAuthorizedUsers: jest.fn(),
}));

describe("AccessRequests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no requests", async () => {
    (fetchAccessRequests as jest.Mock).mockResolvedValue([]);
    (fetchAuthorizedUsers as jest.Mock).mockResolvedValue([]);
    render(await AccessRequests());
    expect(
      screen.getByText("There are no access requests at this time."),
    ).toBeInTheDocument();
  });

  it("renders list of access requests", async () => {
    const mockRequests = [
      {
        id: "1",
        givenName: "John",
        familyName: "Doe",
        email: "john@example.com",
        affiliation: "Student",
        college: "Engineering",
      },
    ];

    (fetchAccessRequests as jest.Mock).mockResolvedValue(mockRequests);
    (fetchAuthorizedUsers as jest.Mock).mockResolvedValue([]);

    render(await AccessRequests());
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("filters out authorized users from access requests", async () => {
    const mockRequests = [
      {
        id: "1",
        givenName: "John",
        familyName: "Doe",
        email: "john@example.com",
        affiliation: "Student",
        college: "Engineering",
      },
      {
        id: "2",
        givenName: "Jane ",
        familyName: "Smith",
        email: "jane@example.com",
        affiliation: "Faculty",
        college: "Computer Science",
      },
    ];

    const mockAuthorizedUsers = [
      {
        groups: [],
        id: 1,
        email: "jane@example.com",
        roles: [],
        isEnabled: true,
        enrollments: [],
        playlists: [],
        linkedin: "",
        github: "",
        firstTime: false,
        firstName: "Jane",
        lastName: "Smith",
        bio: "",
        friendships: [],
        sent_requests: [],
        received_requests: [],
        profilePhoto: "",
        blocked: [],
        was_blocked: [],
        timeZone: { id: 1, name: "UTC", offset: 0 },
        droplets: [],
        created_playlists: [],
      },
    ];

    (fetchAccessRequests as jest.Mock).mockResolvedValue(mockRequests);
    (fetchAuthorizedUsers as jest.Mock).mockResolvedValue(mockAuthorizedUsers);

    render(await AccessRequests());

    // John should be visible, Jane should be filtered out
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });
});
