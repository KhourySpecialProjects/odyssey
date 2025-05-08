import { render, screen } from "@testing-library/react";
import { FriendSuggestions } from "@/components/friends/friend-suggestions";
import { fetchSuggestionsById } from "@/lib/requests/friends";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { TimeZone } from "@/types";

jest.mock("@/lib/requests/friends", () => ({
  fetchSuggestionsById: jest.fn(),
}));

describe("FriendSuggestions", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    bio: "Test bio",
    profilePhoto: "https://example.com/photo.jpg",
    isEnabled: true,
    roles: [{ id: 1, title: AuthorizedUserRoleTitle.Faculty }],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
  };

  it("renders suggestions when available", async () => {
    const mockSuggestions = [
      { id: 2, firstName: "John", lastName: "Doe", email: "john@test.com" },
    ];
    (fetchSuggestionsById as jest.Mock).mockResolvedValue(mockSuggestions);

    const { container } = await render(
      await FriendSuggestions({ user: mockUser }),
    );
    expect(container.querySelector("ul")).toBeInTheDocument();
  });

  it("shows empty state when no suggestions", async () => {
    (fetchSuggestionsById as jest.Mock).mockResolvedValue([]);

    const { container } = await render(
      await FriendSuggestions({ user: mockUser }),
    );
    expect(
      screen.getByText("There are no friend suggestions."),
    ).toBeInTheDocument();
  });
});
