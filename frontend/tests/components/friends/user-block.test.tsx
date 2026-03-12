import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BlockUser, removeFriend } from "@/lib/requests/friends";
import { toast } from "sonner";
import { TimeZone } from "@/types";
import { ProfileBlock } from "@/components/friends/profile-block";

jest.mock("@/lib/requests/friends", () => ({
  BlockUser: jest.fn(),
  removeFriend: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/components/friends/friend-completed-droplets", () => ({
  FriendCompletedDroplets: () => <div data-testid="completed-droplets" />,
}));

describe("UserBlock", () => {
  const mockUser = {
    id: 1,
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    bio: "Test bio",
    profilePhoto: "test.jpg",
    isEnabled: true,
    isPublic: true,
    roles: [],
    linkedin: "https://linkedin.com/test",
    github: "https://github.com/test",
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

  const mockCurrentUser = {
    id: 1,
    email: "current@example.com",
    firstName: "Current",
    lastName: "User",
    bio: "Test bio",
    profilePhoto: "test.jpg",
    isEnabled: true,
    isPublic: true,
    roles: [],
    linkedin: "https://linkedin.com/test",
    github: "https://github.com/test",
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user profile information correctly", () => {
    render(
      <ProfileBlock
        otherUser={mockUser}
        user={mockCurrentUser}
        isOpen={true}
        setIsOpen={() => {}}
      />,
    );

    expect(
      screen.getByText(`${mockUser.firstName} ${mockUser.lastName}`),
    ).toBeInTheDocument();
    expect(screen.getByText(mockUser.bio)).toBeInTheDocument();
  });

  it("handles blocking user successfully", async () => {
    (BlockUser as jest.Mock).mockResolvedValue({ success: true });
    (removeFriend as jest.Mock).mockResolvedValue({ success: true });

    render(
      <ProfileBlock
        otherUser={mockUser}
        user={mockCurrentUser}
        isOpen={true}
        setIsOpen={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Block user"));

    await waitFor(() => {
      expect(BlockUser).toHaveBeenCalledWith(mockCurrentUser.id, mockUser.id);
      expect(removeFriend).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockUser.id,
      );
      expect(toast.success).toHaveBeenCalledWith("User blocked");
    });
  });

  it("handles blocking user failure", async () => {
    (BlockUser as jest.Mock).mockResolvedValue({ success: false });

    render(
      <ProfileBlock
        otherUser={mockUser}
        user={mockCurrentUser}
        isOpen={true}
        setIsOpen={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Block user"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to block user");
    });
  });

  it("shows avatar fallback when no profile photo", () => {
    render(
      <ProfileBlock
        otherUser={mockUser}
        user={mockCurrentUser}
        isOpen={true}
        setIsOpen={() => {}}
      />,
    );
  });
});
