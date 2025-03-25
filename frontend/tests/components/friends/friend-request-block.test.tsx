import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rejectFriendRequest } from '@/lib/requests/friends';
import { toast } from 'sonner';
import { FriendRequestBlock } from '@/components/friends/friend-request-block';
import { TimeZone } from '@/types';

jest.mock('@/lib/requests/friends', () => ({
  acceptFriendRequest: jest.fn(),
  rejectFriendRequest: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FriendRequestBlock', () => {
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

  it('handles existing friendship case', async () => {
    const userWithExistingFriendship = {
      ...mockUser,
      friendships: [{ authorized_users: [2] }],
    };

    render(
      <FriendRequestBlock 
        user={userWithExistingFriendship} 
        request={mockRequest} 
      />
    );

    const approveButton = screen.getByRole('accept');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(rejectFriendRequest).toHaveBeenCalledWith(1, 2);
      expect(toast.error).toHaveBeenCalledWith('Friendship already exists with this user');
    });
  });

  it('handles failed friend request rejection', async () => {
    (rejectFriendRequest as jest.Mock).mockResolvedValue({ success: false });

    render(<FriendRequestBlock user={mockUser} request={mockRequest} />);

    const rejectButton = screen.getByRole('reject');
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(rejectFriendRequest).toHaveBeenCalledWith(1, 2);
      expect(toast.error).toHaveBeenCalledWith('Failed to reject friend request');
    });
  });
});