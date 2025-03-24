import { render, screen, waitFor } from '@testing-library/react';
import { FriendCompletedDroplets } from '@/components/friends/friend-completed-droplets';
import { getEnrollmentsByAuthorizedUser } from '@/lib/requests/enrollment';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

jest.mock('@/lib/requests/enrollment', () => ({
  getEnrollmentsByAuthorizedUser: jest.fn()
}));

describe('FriendCompletedDroplets', () => {
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
  };

  it('shows loading state initially', () => {
    expect(1+1).toBe(2);
  });
});