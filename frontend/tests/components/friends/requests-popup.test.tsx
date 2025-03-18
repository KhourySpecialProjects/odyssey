import { render, screen } from '@testing-library/react';
import { RequestsPopup } from '@/components/friends/requests-popup';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

describe('RequestsPopup', () => {
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
  const mockFriendships = [
    mockUser
  ];

  it('renders friend requests when available', () => {
    render(
      <RequestsPopup 
        user={mockUser} 
        friendships={mockFriendships}
        showPopup={true}
      />
    );
    expect(screen.getByText('Friend Requests')).toBeInTheDocument();
  });

  it('shows limited requests when showPopup is false', () => {
    const manyFriendships = Array(6).fill(mockFriendships[0]);
    render(
      <RequestsPopup 
        user={mockUser} 
        friendships={manyFriendships}
        showPopup={false}
      />
    );
    
    const requests = screen.getAllByText('John Doe');
    expect(requests).toHaveLength(5);
  });

  it('returns null when user or friendships are null', () => {
    const { container } = render(
      <RequestsPopup 
        user={null} 
        friendships={null}
        showPopup={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});