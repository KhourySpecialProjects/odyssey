import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlockUser, acceptFriendRequest, rejectFriendRequest, removeFriend } from '@/lib/requests/friends';
import { toast } from 'sonner';
import { FriendRequestFeedBlock } from '@/components/friends/friend-request-feed-block';
import { TimeZone } from '@/types';

// Mock the dependencies
jest.mock('@/lib/requests/friends', () => ({
  BlockUser: jest.fn(),
  acceptFriendRequest: jest.fn(),
  rejectFriendRequest: jest.fn(),
  removeFriend: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/friends/friend-completed-droplets', () => ({
  FriendCompletedDroplets: () => <div>Completed Droplets Mock</div>,
}));

describe('FriendRequestFeedBlock', () => {
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


  it('handles friend request acceptance', async () => {
    (acceptFriendRequest as jest.Mock).mockResolvedValue({ success: true });

    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);

    const acceptButton = screen.getByRole('accept');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(acceptFriendRequest).toHaveBeenCalledWith(1, 2);
      expect(toast.success).toHaveBeenCalledWith('Friend request accepted!');
    });
  });

  it('handles friend request rejection', async () => {
    (rejectFriendRequest as jest.Mock).mockResolvedValue({ success: true });

    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);

    const rejectButton = screen.getByRole('reject');
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(rejectFriendRequest).toHaveBeenCalledWith(1, 2);
      expect(toast.success).toHaveBeenCalledWith('Friend request rejected');
    });
  });

  it('displays user profile dialog when clicked', async () => {
    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);

    // Click the user's name button to open dialog
    fireEvent.click(screen.getByText(`${mockRequest.firstName} ${mockRequest.lastName}`));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Completed Droplets:')).toBeInTheDocument();
    });
  });
});