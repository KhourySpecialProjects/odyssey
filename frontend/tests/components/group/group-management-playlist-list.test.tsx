import { render, screen, fireEvent } from '@testing-library/react';
import { PlaylistList } from '@/components/group/group-management-playlist-list';

describe('PlaylistList', () => {
  const mockPlaylist = {
    id: 1,
    name: "Test Playlist",
    slug: "test-playlist",
    isPublic: false,
    droplets: [],
    authors: [],
    duration: "short" as "short" | "medium" | "long",
  };
  const mockPlaylists = [
    mockPlaylist
  ];

  const mockOnReorder = jest.fn();
  const mockOnRemove = jest.fn();

  it('renders playlists with correct information', () => {
    render(
      <PlaylistList 
        playlists={mockPlaylists}
        onReorder={mockOnReorder}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText('Test Playlist 1')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Short')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    render(
      <PlaylistList 
        playlists={mockPlaylists}
        onReorder={mockOnReorder}
        onRemove={mockOnRemove}
      />
    );

    const removeButtons = screen.getAllByRole('button');
    fireEvent.click(removeButtons[0]);
    
    expect(mockOnRemove).toHaveBeenCalledWith(1);
  });
});