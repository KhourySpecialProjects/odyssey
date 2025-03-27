import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import {
  BlockUser,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "@/lib/requests/friends";
import { toast } from "sonner";
import { FriendRequestFeedBlock } from "@/components/friends/friend-request-feed-block";
import { TimeZone } from "@/types";

jest.mock("@/lib/requests/friends", () => ({
  BlockUser: jest.fn(),
  acceptFriendRequest: jest.fn(),
  rejectFriendRequest: jest.fn(),
  removeFriend: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/components/friends/friend-completed-droplets", () => ({
  FriendCompletedDroplets: () => <div>Completed Droplets Mock</div>,
}));

describe("FriendRequestFeedBlock", () => {
  const mockUser = {
    id: 1,
    email: `user@example.com`,
    isEnabled: true,
    roles: [],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstName: "first",
    lastName: "last",
    bio: "bio",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
  };

  const mockRequest = {
    id: 2,
    email: `user@example.com`,
    isEnabled: true,
    roles: [],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstName: "first",
    lastName: "last",
    bio: "bio",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles friend request acceptance", async () => {
    (acceptFriendRequest as jest.Mock).mockResolvedValue({ success: true });

    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);

    const acceptButton = screen.getByRole("accept");
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(acceptFriendRequest).toHaveBeenCalledWith(1, 2);
      expect(toast.success).toHaveBeenCalledWith("Friend request accepted!");
    });
  });

  it("handles friend request acceptance failure", async () => {
    (acceptFriendRequest as jest.Mock).mockResolvedValue({ success: false });

    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);

    const acceptButton = screen.getByRole("accept");
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(acceptFriendRequest).toHaveBeenCalledWith(1, 2);
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to accept friend request",
      );
    });
  });

  it("handles friend request rejection", async () => {
    (rejectFriendRequest as jest.Mock).mockResolvedValue({ success: true });

    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);

    const rejectButton = screen.getByRole("reject");
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(rejectFriendRequest).toHaveBeenCalledWith(1, 2);
      expect(toast.success).toHaveBeenCalledWith("Friend request rejected");
    });
  });

  it("handles friend request rejection failure", async () => {
    (rejectFriendRequest as jest.Mock).mockResolvedValue({ success: false });

    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);

    const rejectButton = screen.getByRole("reject");
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(rejectFriendRequest).toHaveBeenCalledWith(1, 2);
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to reject friend request",
      );
    });
  });

  it("displays user profile dialog when clicked", async () => {
    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);

    fireEvent.click(
      screen.getByText(`${mockRequest.firstName} ${mockRequest.lastName}`),
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Completed Droplets:")).toBeInTheDocument();
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles blocking a user successfully", async () => {
    (BlockUser as jest.Mock).mockResolvedValue({ success: true });
    (removeFriend as jest.Mock).mockResolvedValue({ success: true });

    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);

    fireEvent.click(screen.getByText("first last"));

    const blockButton = screen.getByText("Block user");
    await act(async () => {
      fireEvent.click(blockButton);
    });

    expect(BlockUser).toHaveBeenCalledWith(mockUser.id, mockRequest.id);
    expect(removeFriend).toHaveBeenCalledWith(mockUser.id, mockRequest.id);
    expect(toast.success).toHaveBeenCalledWith("User blocked");
  });

  it("hides block button when user is already blocked", async () => {
    const mockBlockedUser = {
      id: 1,
      email: `user@example.com`,
      isEnabled: true,
      roles: [],
      linkedin: "https://www.google.com/",
      github: "https://www.google.com/",
      firstName: "first",
      lastName: "last",
      bio: "bio",
      firstTime: false,
      friendships: [],
      sent_requests: [],
      received_requests: [],
      profilePhoto: "",
      was_blocked: [],
      timeZone: "America/New_York" as TimeZone,
      blocked: [mockRequest],
    };

    render(
      <FriendRequestFeedBlock user={mockBlockedUser} request={mockRequest} />,
    );

    fireEvent.click(screen.getByText("first last"));

    const blockButtonContainer = screen.getByTestId("block-button-container");
    expect(blockButtonContainer).toHaveClass("visibility: hidden");
  });

  it("handles blocking a user failure", async () => {
    (BlockUser as jest.Mock).mockResolvedValue({ success: false });
    (removeFriend as jest.Mock).mockResolvedValue({ success: true });

    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);

    fireEvent.click(screen.getByText("first last"));

    const blockButton = screen.getByText("Block user");
    await act(async () => {
      fireEvent.click(blockButton);
    });

    expect(BlockUser).toHaveBeenCalledWith(mockUser.id, mockRequest.id);
    expect(removeFriend).toHaveBeenCalledWith(mockUser.id, mockRequest.id);
    expect(toast.error).toHaveBeenCalledWith("Failed to block user");
  });
});
