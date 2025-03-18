import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddPlaylistDialog } from '@/components/group/add-playlist-dialog';
import { getPlaylists } from '@/lib/requests/playlist';

jest.mock('@/lib/requests/playlist', () => ({
  getPlaylists: jest.fn(),
}));

describe('AddPlaylistDialog', () => {
  const mockPlaylists = [
    { id: 1, name: 'Test Playlist', isPublic: true }
  ];
  const mockOnAddPlaylists = jest.fn();

  beforeEach(() => {
    (getPlaylists as jest.Mock).mockResolvedValue(mockPlaylists);
  });

  it('renders add playlist button', () => {
    render(<AddPlaylistDialog currentPlaylists={[]} onAddPlaylists={mockOnAddPlaylists} />);
    expect(screen.getByText('Add Playlist')).toBeInTheDocument();
  });

  it('shows dialog with playlists when clicked', async () => {
    render(<AddPlaylistDialog currentPlaylists={[]} onAddPlaylists={mockOnAddPlaylists} />);
    
    fireEvent.click(screen.getByText('Add Playlist'));
    await waitFor(() => {
      expect(screen.getByText('Test Playlist')).toBeInTheDocument();
    });
  });
});