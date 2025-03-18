import { render, screen, fireEvent } from '@testing-library/react';
import { FriendRequestFeedBlock } from '@/components/friends/friend-request-feed-block';
import { acceptFriendRequest, rejectFriendRequest, BlockUser } from '@/lib/requests/friends';
import { toast } from 'sonner';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

jest.mock('@/lib/requests/friends', () => ({
  acceptFriendRequest: jest.fn(),
  rejectFriendRequest: jest.fn(),
  BlockUser: jest.fn(),
  removeFriend: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

describe('FriendRequestFeedBlock', () => {
  const mockUser = {
    id: 1,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Test bio',
    profilePhoto: 'https://example.com/photo.jpg',
    isEnabled: true,
    roles: [
      { id: 1, title: AuthorizedUserRoleTitle.Faculty }
    ],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone
  };
  const mockRequest = {
    id: 1,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Test bio',
    profilePhoto: 'https://example.com/photo.jpg',
    isEnabled: true,
    roles: [
      { id: 1, title: AuthorizedUserRoleTitle.Faculty }
    ],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone
  };

  it('renders request information', () => {
    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles accept request', async () => {
    (acceptFriendRequest as jest.Mock).mockResolvedValue({ success: true });
    
    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    
    expect(acceptFriendRequest).toHaveBeenCalledWith(mockUser.id, mockRequest.id);
    expect(toast.success).toHaveBeenCalledWith('Friend request accepted!');
  });

  it('opens profile dialog when clicked', () => {
    render(<FriendRequestFeedBlock user={mockUser} request={mockRequest} />);
    fireEvent.click(screen.getByRole('button', { name: mockRequest.firstName }));
    
    expect(screen.getByText(mockRequest.bio)).toBeInTheDocument();
  });
});