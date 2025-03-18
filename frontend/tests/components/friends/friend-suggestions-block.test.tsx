import { render, screen, fireEvent } from '@testing-library/react';
import { FriendSuggestionsBlock } from '@/components/friends/friend-suggestions-block';
import { sendFriendRequest } from '@/lib/requests/friends';
import { toast } from 'sonner';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

jest.mock('@/lib/requests/friends', () => ({
  sendFriendRequest: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

describe('FriendSuggestionsBlock', () => {
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
  const mockSuggUser = {
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

  it('renders suggestion information', () => {
    render(
      <FriendSuggestionsBlock 
        curUser={mockCurUser}
        suggUser={mockSuggUser}
        display={false}
        requested={false}
      />
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles send request', async () => {
    (sendFriendRequest as jest.Mock).mockResolvedValue({ success: true });
    
    render(
      <FriendSuggestionsBlock 
        curUser={mockCurUser}
        suggUser={mockSuggUser}
        display={false}
        requested={false}
      />
    );
    fireEvent.click(screen.getByText('Send Request'));
    
    expect(sendFriendRequest).toHaveBeenCalledWith(mockCurUser, mockSuggUser);
    expect(toast.success).toHaveBeenCalledWith('Request sent!');
  });
});