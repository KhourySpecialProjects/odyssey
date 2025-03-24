import { render, screen } from '@testing-library/react';
import { CreateDroplet } from '@/components/new/new-droplet';
import { getCurrentUser } from '@/lib/auth/session';
import { getTags } from '@/lib/requests/tag';

jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/requests/tag', () => ({
  getTags: jest.fn(),
}));

describe('CreateDroplet', () => {
  beforeEach(() => {
    (getCurrentUser as jest.Mock).mockResolvedValue({
      roles: ['content_creator'],
    });
    (getTags as jest.Mock).mockResolvedValue([]);
  });

  it('shows not found for unauthorized users', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({
      roles: ['user'],
    });
    expect(CreateDroplet()).rejects.toThrow();
  });
});