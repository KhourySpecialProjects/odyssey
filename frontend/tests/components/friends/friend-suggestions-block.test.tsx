import { render, screen, fireEvent } from "@testing-library/react";
import { FriendSuggestionsBlock } from "@/components/friends/friend-suggestions-block";
import { sendFriendRequest } from "@/lib/requests/friends";
import { toast } from "sonner";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { TimeZone } from "@/types";

jest.mock("@/lib/requests/friends", () => ({
  sendFriendRequest: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("FriendSuggestionsBlock", () => {
  const mockCurUser = {
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
  const mockSuggUser = {
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

  it("renders suggestion information", () => {
    render(
      <FriendSuggestionsBlock
        curUser={mockCurUser}
        suggUser={mockSuggUser}
        display={false}
        requested={false}
      />,
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("handles send request", async () => {
    (sendFriendRequest as jest.Mock).mockResolvedValue({ success: true });

    render(
      <FriendSuggestionsBlock
        curUser={mockCurUser}
        suggUser={mockSuggUser}
        display={false}
        requested={true}
      />,
    );

    expect(screen.getByText("Sent!")).toBeInTheDocument();
  });

  it("handles send request true", async () => {
    (sendFriendRequest as jest.Mock).mockResolvedValue({ success: true });

    render(
      <FriendSuggestionsBlock
        curUser={mockCurUser}
        suggUser={mockSuggUser}
        display={false}
        requested={false}
      />,
    );

    fireEvent.click(screen.getByText("Send Request"));
    expect(sendFriendRequest).toHaveBeenCalledWith(mockCurUser, mockSuggUser);
  });

  it("handles not visible", async () => {
    (sendFriendRequest as jest.Mock).mockResolvedValue({ success: true });

    render(
      <FriendSuggestionsBlock
        curUser={mockCurUser}
        suggUser={mockSuggUser}
        display={false}
        requested={true}
      />,
    );

    expect(screen.getByRole("mainBox")).toHaveClass("visibility: hidden");
  });

  it("handles send request error", async () => {
    (sendFriendRequest as jest.Mock).mockResolvedValue({ success: false });

    render(
      <FriendSuggestionsBlock
        curUser={mockCurUser}
        suggUser={mockSuggUser}
        display={false}
        requested={false}
      />,
    );
    fireEvent.click(screen.getByText("Send Request"));

    expect(sendFriendRequest).toHaveBeenCalledWith(mockCurUser, mockSuggUser);
    expect(toast.success).not.toHaveBeenCalled();
  });

  test("visibility when display is true and requested is false", () => {
    render(
      <FriendSuggestionsBlock
        curUser={mockCurUser}
        suggUser={mockSuggUser}
        display={true}
        requested={false}
      />,
    );
    const mainBox = screen.getByRole("mainBox");
    expect(mainBox).toHaveClass("visibility: visible");
  });

  test("visibility when requested is true and display is false", () => {
    render(
      <FriendSuggestionsBlock
        curUser={mockCurUser}
        suggUser={mockSuggUser}
        display={false}
        requested={true}
      />,
    );
    const mainBox = screen.getByRole("mainBox");
    expect(mainBox).toHaveClass("visibility: hidden");
  });

  test("displays user name when available", () => {
    render(
      <FriendSuggestionsBlock
        curUser={mockCurUser}
        suggUser={mockSuggUser}
        display={false}
        requested={false}
      />,
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});
