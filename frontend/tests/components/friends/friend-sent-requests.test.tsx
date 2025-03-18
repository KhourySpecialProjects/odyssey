import { render, screen } from '@testing-library/react';
import { FriendSentRequests } from '@/components/friends/friend-sent-requests';
import { getCurrentUser } from '@/lib/auth/session';
import { getAuthorizedUserByEmail } from '@/lib/requests/authorized-user';

jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn()
}));

jest.mock('@/lib/requests/authorized-user', () => ({
  getAuthorizedUserByEmail: jest.fn()
}));

describe('FriendSentRequests', () => {
  beforeEach(() => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ email: 'test@example.com' });
  });

  it('renders sent requests list when requests exist', async () => {
    const mockAuthUser = {
      sent_requests: [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com' }
      ],
      blocked: [],
      was_blocked: []
    };
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockAuthUser);

    const { container } = await render(await FriendSentRequests());
    expect(container.querySelector('ul')).toBeInTheDocument();
  });

  it('shows empty state when no sent requests', async () => {
    const mockAuthUser = {
      sent_requests: [],
      blocked: [],
      was_blocked: []
    };
    (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue(mockAuthUser);

    const { container } = await render(await FriendSentRequests());
    expect(screen.getByText('You have no sent requests')).toBeInTheDocument();
  });
});