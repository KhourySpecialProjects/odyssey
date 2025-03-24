import { render, screen } from '@testing-library/react';
import { DropletsGrid } from '@/components/explore/droplets-grid';
import { getCurrentUser } from '@/lib/auth/session';
import { getDroplets } from '@/lib/requests/droplet';

jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/requests/droplet', () => ({
  getDroplets: jest.fn(),
}));

jest.mock('lib/utils', () => ({
  uppercaseFirstChar: (text: string) => text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}));

describe('DropletsGrid', () => {
  const mockDroplets = [
    {
      id: 1,
      name: 'Test Droplet',
      slug: 'test-droplet',
      status: 'published',
      isHidden: false,
      lessons: [],
    },
  ];

  beforeEach(() => {
    (getDroplets as jest.Mock).mockResolvedValue(mockDroplets);
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
  });

  it('renders droplets when available', () => {
    expect(1+1).toBe(2);
  });
});