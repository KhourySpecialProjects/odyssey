import { render, screen } from "@testing-library/react";
import { FriendSentRequests } from "@/components/friends/friend-sent-requests";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUserSocial } from "@/lib/requests/cached";

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUserSocial: jest.fn(),
}));

describe("FriendSentRequests", () => {
  beforeEach(() => {
    (getCurrentUser as jest.Mock).mockResolvedValue({
      email: "test@example.com",
    });
  });

  it("renders sent requests list when requests exist", async () => {
    const mockAuthUser = {
      sent_requests: [
        { id: 1, firstName: "John", lastName: "Doe", email: "john@test.com" },
      ],
      blocked: [],
      was_blocked: [],
    };
    (getCachedUserSocial as jest.Mock).mockResolvedValue(mockAuthUser);

    const { container } = await render(await FriendSentRequests());
    expect(container.querySelector("ul")).toBeInTheDocument();
  });

  it("shows empty state when no sent requests", async () => {
    const mockAuthUser = {
      sent_requests: [],
      blocked: [],
      was_blocked: [],
    };
    (getCachedUserSocial as jest.Mock).mockResolvedValue(mockAuthUser);

    await render(await FriendSentRequests());
    expect(screen.getByText("You have no sent requests")).toBeInTheDocument();
  });

  describe("FriendSentRequests", () => {
    it("filters and sorts sent requests correctly", async () => {
      const mockUser = {
        email: "test@example.com",
      };

      const mockAuthUser = {
        sent_requests: [
          { id: 1, lastName: "Smith" },
          { id: 2, lastName: "Adams" },
          { id: 3, lastName: "Brown" },
        ],
        blocked: [{ id: 3 }],
        was_blocked: [],
      };

      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (getCachedUserSocial as jest.Mock).mockResolvedValue(mockAuthUser);

      const Component = await FriendSentRequests();
      const { container } = render(Component);

      const requests = container.querySelectorAll("li");
      expect(requests).toHaveLength(2);

      const firstRequest = requests[0].textContent;
    });
  });
});
