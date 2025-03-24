import { render, screen, fireEvent } from '@testing-library/react';
import { FriendRequestBlock } from '@/components/friends/friend-request-block';
import { acceptFriendRequest, rejectFriendRequest } from '@/lib/requests/friends';
import { toast } from 'sonner';
import { TimeZone } from '@/types';
import { AuthorizedUserRoleTitle } from '@/lib/globals';

jest.mock('@/lib/requests/friends', () => ({
  acceptFriendRequest: jest.fn(),
  rejectFriendRequest: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

describe('FriendRequestBlock', () => {
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
    render(<FriendRequestBlock user={mockUser} request={mockRequest} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});