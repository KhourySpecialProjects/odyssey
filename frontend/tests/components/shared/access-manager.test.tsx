import { render, screen } from '@testing-library/react';
import { AccessManager } from '@/components/shared/access-manager/access-manager';
import { TimeZone } from '@/types';
import { AuthorizedUserRoleTitle } from '@/lib/globals';

describe('AccessManager', () => {
  const mockUser = {
    id: 1,
    email: `user@example.com`,
    isEnabled: true,
    roles: [],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstName: "first",
    lastName: "last",
    bio: "bio",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    profilePhoto: "",
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    isActive: true
  };

  const mockAdminUser = {
    roles: [AuthorizedUserRoleTitle.AcadAdmin],
    isActive: true,
  };

  it('renders add user components for all users', async () => {
    render(await AccessManager({ user: mockUser }));
    expect(screen.getByText('Add User')).toBeInTheDocument();
    expect(screen.getByText('Batch Add Users')).toBeInTheDocument();
  });

  it('does not render access requests for non-admin users', async () => {
    render(await AccessManager({ user: mockUser }));
    expect(screen.queryByText('Access Requests')).not.toBeInTheDocument();
  });
});