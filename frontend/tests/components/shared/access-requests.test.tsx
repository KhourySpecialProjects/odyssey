import { render, screen } from "@testing-library/react";
import { AccessRequests } from "@/components/shared/access-manager/access-requests/access-requests";
import { fetchAccessRequests } from "@/lib/requests/data";

jest.mock("@/lib/requests/data", () => ({
  fetchAccessRequests: jest.fn(),
}));

describe("AccessRequests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no requests", async () => {
    (fetchAccessRequests as jest.Mock).mockResolvedValue([]);
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
    render(await AccessRequests());
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});
