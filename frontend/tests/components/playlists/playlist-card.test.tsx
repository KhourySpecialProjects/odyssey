import { render, screen } from '@testing-library/react';
import { PlaylistCard } from '@/components/playlists/playlist-card';
import { DateTime } from 'luxon';

describe('PlaylistCard', () => {
  const mockPlaylist = {
    id: 1,
    name: 'Test Playlist',
    slug: 'test-playlist',
    droplets: [],
    duration: 'short' as const,
    isPublic: true,
  };

  it('renders playlist name and droplet count', () => {
    render(<PlaylistCard playlist={mockPlaylist} />);
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
    expect(screen.getByText('0 droplets')).toBeInTheDocument();
  });

  it('shows due date badge when date is provided', () => {
    const tomorrow = DateTime.local().plus({ days: 1 }).toISO();
    render(<PlaylistCard playlist={mockPlaylist} dueDate={tomorrow} />);
    expect(screen.getByText('Due in 1 day')).toBeInTheDocument();
  });

  it('uses correct link based on toDraft prop', () => {
    render(<PlaylistCard playlist={mockPlaylist} toDraft={true} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/draft/p/test-playlist');
  });
});