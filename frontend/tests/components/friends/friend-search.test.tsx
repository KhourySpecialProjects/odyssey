import { render, screen, fireEvent } from '@testing-library/react';
import { FriendSearch } from '@/components/friends/friend-search';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

describe('FriendSearch', () => {
  const mockAuthUsers = [
    {
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
  ];

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

  it('renders search input', () => {
    render(
      <FriendSearch 
        authUsers={mockAuthUsers}
        curUser={mockCurUser}
        requestIds={[]}
        friendIds={[]}
      />
    );
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('filters users based on search term', () => {
    render(
      <FriendSearch 
        authUsers={mockAuthUsers}
        curUser={mockCurUser}
        requestIds={[]}
        friendIds={[]}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('shows no results message when no matches found', () => {
    render(
      <FriendSearch 
        authUsers={mockAuthUsers}
        curUser={mockCurUser}
        requestIds={[]}
        friendIds={[]}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'xyz' } });
    
    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });
});