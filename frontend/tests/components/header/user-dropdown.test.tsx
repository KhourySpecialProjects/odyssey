import { render, screen, fireEvent } from '@testing-library/react';
import { UserDropdown } from '@/components/header/user-dropdown';
import { signOut } from 'next-auth/react';
import { TimeZone } from '@/types';
import { AuthorizedUserRoleTitle } from '@/lib/globals';

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

describe('UserDropdown', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com',
    roles: [AuthorizedUserRoleTitle.Faculty],
    isActive: true
  };

  const mockAuthorizedUser = {
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

  it('renders user information', () => {
    render(<UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />);
    expect(screen.getByText(/hi/i)).toBeInTheDocument();
  });

  it('shows dropdown menu when clicked', () => {
    render(<UserDropdown user={mockUser} authorizedUser={mockAuthorizedUser} />);
    fireEvent.click(screen.getByText(/test user!/i));
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Log Out')).toBeInTheDocument();
  });
});