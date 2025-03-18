import { render, screen } from '@testing-library/react';
import { PlaylistsGrid } from '@/components/explore/playlists-grid';
import { getPlaylists } from '@/lib/requests/playlist';
import { getCurrentUser } from '@/lib/auth/session';

jest.mock('@/lib/requests/playlist', () => ({
  getPlaylists: jest.fn(),
}));

jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn(),
}));

describe('PlaylistsGrid', () => {
  const mockPlaylists = [
    {
      id: 1,
      name: 'Test Playlist',
      isPublic: true,
      droplets: [],
    },
  ];

  beforeEach(() => {
    (getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
  });

  it('renders playlists when available', async () => {
    render(await PlaylistsGrid({}));
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
  });

  it('shows no results message when no playlists found', async () => {
    (getPlaylists as jest.Mock).mockResolvedValue([]);
    render(await PlaylistsGrid({}));
    expect(screen.getByText('No Public Playlists')).toBeInTheDocument();
  });
});