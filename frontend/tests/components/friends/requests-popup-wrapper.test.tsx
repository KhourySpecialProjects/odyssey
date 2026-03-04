import { render, screen, fireEvent } from "@testing-library/react";
import { RequestsPopupWrapper } from "@/components/friends/requests-popup-wrapper";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { TimeZone } from "@/types";

describe("RequestsPopupWrapper", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    bio: "Test bio",
    profilePhoto: "https://example.com/photo.jpg",
    isEnabled: true,
    isPublic: false,
    roles: [{ id: 1, title: AuthorizedUserRoleTitle.Faculty }],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    website: "",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    groups: [],
  };
  const mockFriendships = [mockUser];

  it("renders toggle button", () => {
    render(
      <RequestsPopupWrapper user={mockUser} friendships={mockFriendships} />,
    );
    expect(screen.getByText("Show All Requests")).toBeInTheDocument();
  });

  it("toggles popup visibility", () => {
    render(
      <RequestsPopupWrapper user={mockUser} friendships={mockFriendships} />,
    );

    fireEvent.click(screen.getByText("Show All Requests"));
    expect(screen.getByText("Hide Requests")).toBeInTheDocument();
  });
});
