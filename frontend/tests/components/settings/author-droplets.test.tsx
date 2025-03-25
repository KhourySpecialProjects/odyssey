import { render, screen } from '@testing-library/react';
import { AuthorDroplets } from '@/components/settings/author-droplets';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

describe('AuthorDroplets', () => {
  const mockAuthor = {
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

  it('shows empty state when no droplets', () => {
    render(<AuthorDroplets author={{ ...mockAuthor, droplets: [] }} />);
    expect(screen.getByText('You have no Droplets.')).toBeInTheDocument();
  });
});