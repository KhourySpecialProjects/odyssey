import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BlockUser, removeFriend } from "@/lib/requests/friends";
import { toast } from "sonner";
import { UserBlock } from "@/components/friends/user-block";
import { TimeZone } from "@/types";

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
    roles: [],
    linkedin: "https://linkedin.com/test",
    github: "https://github.com/test",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
  };

  const mockCurrentUser = {
    id: 1,
    email: "current@example.com",
    firstName: "Current",
    lastName: "User",
    bio: "Test bio",
    profilePhoto: "test.jpg",
    isEnabled: true,
    roles: [],
    linkedin: "https://linkedin.com/test",
    github: "https://github.com/test",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user profile information correctly", () => {
    render(<UserBlock user={mockUser} curUser={mockCurrentUser} />);

    fireEvent.click(screen.getByText("View Profile"));

    expect(
      screen.getByText(`${mockUser.firstName} ${mockUser.lastName}`),
    ).toBeInTheDocument();
    expect(screen.getByText(mockUser.bio)).toBeInTheDocument();
  });

  it("handles blocking user successfully", async () => {
    (BlockUser as jest.Mock).mockResolvedValue({ success: true });
    (removeFriend as jest.Mock).mockResolvedValue({ success: true });

    render(<UserBlock user={mockUser} curUser={mockCurrentUser} />);

    fireEvent.click(screen.getByText("View Profile"));
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

    render(<UserBlock user={mockUser} curUser={mockCurrentUser} />);

    fireEvent.click(screen.getByText("View Profile"));
    fireEvent.click(screen.getByText("Block user"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to block user");
    });
  });

  it("shows avatar fallback when no profile photo", () => {
    const userWithoutPhoto = { ...mockUser, profilePhoto: "" };
    render(<UserBlock user={userWithoutPhoto} curUser={mockCurrentUser} />);

    fireEvent.click(screen.getByText("View Profile"));

    expect(screen.getByText("TU")).toBeInTheDocument();
  });
});
