import { render, screen, fireEvent } from '@testing-library/react';
import { FriendSentRequestsBlock } from '@/components/friends/friend-sent-requests-block';
import { cancelFriendRequest } from '@/lib/requests/friends';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';
import {toast} from 'sonner'

jest.mock('@/lib/requests/friends', () => ({
  cancelFriendRequest: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

describe('FriendSentRequestsBlock', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders request information', () => {
    render(<FriendSentRequestsBlock user={mockUser} request={mockRequest} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles cancel request', async () => {
    (cancelFriendRequest as jest.Mock).mockResolvedValue({ success: true });
    
    render(<FriendSentRequestsBlock user={mockUser} request={mockRequest} />);
    await fireEvent.click(screen.getByRole('x'));
    
    expect(cancelFriendRequest).toHaveBeenCalledWith(mockUser.id, mockRequest.id);
    expect(toast.success).toHaveBeenCalledWith('Friend request rejected')
  });

  it('handles cancel request failed', async () => {
    (cancelFriendRequest as jest.Mock).mockResolvedValue({ success: false });
    
    render(<FriendSentRequestsBlock user={mockUser} request={mockRequest} />);
    await fireEvent.click(screen.getByRole('x'));
    
    expect(cancelFriendRequest).toHaveBeenCalledWith(mockUser.id, mockRequest.id);
    expect(toast.error).toHaveBeenCalledWith('Failed to reject friend request')
  });

  it('renders user information correctly', () => {
    render(
      <FriendSentRequestsBlock 
        user={mockUser} 
        request={mockRequest}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    
    expect(screen.getByText('JD')).toBeInTheDocument();
    
    const nameElement = screen.getByTitle('John Doe');
    expect(nameElement).toHaveClass('truncate');
    expect(nameElement).toHaveClass('max-w-[200px]', 'md:max-w-sm');
  });
});
