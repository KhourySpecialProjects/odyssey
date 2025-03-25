import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlaylistEnrollButton } from '@/components/playlists/playlist-enroll-button';
import { togglePlaylistEnrollment } from '@/lib/requests/playlist-enrollment';

jest.mock('@/lib/requests/playlist-enrollment', () => ({
  togglePlaylistEnrollment: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

describe('PlaylistEnrollButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders enroll button for public playlist', () => {
    render(<PlaylistEnrollButton playlistId={1} isEnrolled={false} isPublic={true} />);
    expect(screen.getByText('Add to My Playlists')).toBeInTheDocument();
  });

  it('shows warning dialog when removing private playlist', async () => {
    render(<PlaylistEnrollButton playlistId={1} isEnrolled={true} isPublic={false} />);
    
    fireEvent.click(screen.getByText('Remove from My Playlists'));
    expect(screen.getByText('Remove Private Playlist?')).toBeInTheDocument();
  });

  it('calls togglePlaylistEnrollment when confirmed', async () => {
    (togglePlaylistEnrollment as jest.Mock).mockResolvedValue({ success: true });
    
    render(<PlaylistEnrollButton playlistId={1} isEnrolled={false} isPublic={true} />);
    fireEvent.click(screen.getByText('Add to My Playlists'));
    
    await waitFor(() => {
      expect(togglePlaylistEnrollment).toHaveBeenCalledWith(1);
    });
  });

  it('handles enrollment change error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (togglePlaylistEnrollment as jest.Mock).mockRejectedValue(new Error('Test error'));

    render(
      <PlaylistEnrollButton
        playlistId={1}
        isEnrolled={true}
        isPublic={true}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error updating enrollment:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('shows warning dialog for private enrolled playlist', async () => {
    render(
      <PlaylistEnrollButton
        playlistId={1}
        isEnrolled={true}
        isPublic={false}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Remove Private Playlist?')).toBeInTheDocument();
    expect(screen.getByText(/This is a private playlist/)).toBeInTheDocument();
  });

  it('handles dialog actions correctly', async () => {
    (togglePlaylistEnrollment as jest.Mock).mockResolvedValue({ success: true });

    render(
      <PlaylistEnrollButton
        playlistId={1}
        isEnrolled={true}
        isPublic={false}
      />
    );
    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByText('Remove Playlist'));
    
    await waitFor(() => {
      expect(togglePlaylistEnrollment).toHaveBeenCalledWith(1);
    });
  });

  it('does not render button for private unenrolled playlist', () => {
    const { container } = render(
      <PlaylistEnrollButton
        playlistId={1}
        isEnrolled={false}
        isPublic={false}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});