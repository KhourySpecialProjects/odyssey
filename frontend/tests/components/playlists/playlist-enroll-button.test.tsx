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
});