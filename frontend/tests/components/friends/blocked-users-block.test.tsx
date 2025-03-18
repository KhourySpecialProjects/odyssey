import { render, screen, fireEvent } from '@testing-library/react';
import { BlockedUsersBlock } from '@/components/friends/blocked-users-block';
import { unblockUser } from '@/lib/requests/friends';
import { toast } from 'sonner';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

jest.mock('@/lib/requests/friends', () => ({
  unblockUser: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

describe('BlockedUsersBlock', () => {
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
  const mockBlocked = {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders blocked user information', () => {
    render(<BlockedUsersBlock user={mockUser} blocked={mockBlocked} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows email when name is not available', () => {
    const blockedNoName = {
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
    render(<BlockedUsersBlock user={mockUser} blocked={blockedNoName} />);
    expect(screen.getByText('blocked@test.com')).toBeInTheDocument();
  });

  it('handles unblock action successfully', async () => {
    (unblockUser as jest.Mock).mockResolvedValue({ success: true });
    
    render(<BlockedUsersBlock user={mockUser} blocked={mockBlocked} />);
    fireEvent.click(screen.getByText('Unblock'));

    expect(unblockUser).toHaveBeenCalledWith(mockUser.id, mockBlocked.id);
    expect(toast.success).toHaveBeenCalledWith('User unblocked');
  });
});