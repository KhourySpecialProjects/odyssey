import { render, screen, fireEvent } from '@testing-library/react';
import { FriendRequests } from '@/components/friends/friend-requests';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

describe('FriendRequests', () => {
  const mockAuthUser = {
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

  it('renders friend requests section', () => {
    render(
      <FriendRequests 
        noProfile={false} 
        friendsPerPage={5} 
        authUser={mockAuthUser} 
      />
    );
    expect(screen.getByText('Friend Requests')).toBeInTheDocument();
  });

  it('shows empty state when no requests', () => {
    const emptyUser = { ...mockAuthUser, received_requests: [] };
    render(
      <FriendRequests 
        noProfile={false} 
        friendsPerPage={5} 
        authUser={emptyUser} 
      />
    );
    expect(screen.getByText('You have no friend requests')).toBeInTheDocument();
  });

});