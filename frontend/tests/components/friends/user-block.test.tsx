import { render, screen, fireEvent } from '@testing-library/react';
import { UserBlock } from '@/components/friends/user-block';
import { BlockUser, removeFriend } from '@/lib/requests/friends';
import { toast } from 'sonner';
import { TimeZone } from '@/types';
import { AuthorizedUserRoleTitle } from '@/lib/globals';

jest.mock('@/lib/requests/friends', () => ({
  BlockUser: jest.fn(),
  removeFriend: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

describe('UserBlock', () => {
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
  const mockCurUser = {
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

  it('renders view profile button', () => {
    render(<UserBlock user={mockUser} curUser={mockCurUser} />);
    expect(screen.getByText('View Profile')).toBeInTheDocument();
  });

  it('opens profile dialog when clicked', () => {
    render(<UserBlock user={mockUser} curUser={mockCurUser} />);
    fireEvent.click(screen.getByText('View Profile'));
    
    expect(screen.getByText(mockUser.firstName)).toBeInTheDocument();
    expect(screen.getByText(mockUser.lastName)).toBeInTheDocument();
  });

  it('handles block user action', async () => {
    (BlockUser as jest.Mock).mockResolvedValue({ success: true });
    
    render(<UserBlock user={mockUser} curUser={mockCurUser} />);
    fireEvent.click(screen.getByText('View Profile'));
    fireEvent.click(screen.getByText('Block user'));
    
    expect(BlockUser).toHaveBeenCalledWith(mockCurUser.id, mockUser.id);
    expect(toast.success).toHaveBeenCalledWith('User blocked');
  });

  it('renders social links when available', () => {
    render(<UserBlock user={mockUser} curUser={mockCurUser} />);
    fireEvent.click(screen.getByText('View Profile'));
    
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', mockUser.linkedin);
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', mockUser.github);
  });
});