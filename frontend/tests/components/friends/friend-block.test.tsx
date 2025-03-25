import { render, screen, fireEvent } from '@testing-library/react';
import { FriendBlock } from '@/components/friends/friend-block';
import { removeFriend } from '@/lib/requests/friends';
import { TimeZone } from '@/types';
import { AuthorizedUserRoleTitle } from '@/lib/globals';

jest.mock('@/lib/requests/friends', () => ({
  removeFriend: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

describe('FriendBlock', () => {
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
  }
  const mockFriend = {
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
  }

  it('renders friend information', () => {
    render(<FriendBlock user={mockUser} friend={mockFriend} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles remove friend action', async () => {
    (removeFriend as jest.Mock).mockResolvedValue({ success: true });
    
    render(<FriendBlock user={mockUser} friend={mockFriend} />);
    fireEvent.click(screen.getByText('Remove Friend'));

    expect(removeFriend).toHaveBeenCalledWith(mockUser.id, mockFriend.id);
  });
});