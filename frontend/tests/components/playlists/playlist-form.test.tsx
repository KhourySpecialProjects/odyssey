import { render, screen, fireEvent } from '@testing-library/react';
import { PlaylistForm } from '@/components/playlists/playlist-form';
import { createPlaylist, updatePlaylist } from '@/lib/actions';

jest.mock('@/lib/actions', () => ({
  createPlaylist: jest.fn(),
  updatePlaylist: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}));

describe('PlaylistForm', () => {
  const mockProps = {
    droplets: [],
    author: { id: 1, name: 'Test Author' },
    userId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<PlaylistForm {...mockProps} />);
    expect(screen.getByLabelText('Playlist Name')).toBeInTheDocument();
    expect(screen.getByText('Make this playlist public')).toBeInTheDocument();
  });

  it('shows error when submitting without name', async () => {
    render(<PlaylistForm {...mockProps} />);
    fireEvent.click(screen.getByText('Save Playlist'));
    expect(await screen.findByText('Please enter a playlist name')).toBeInTheDocument();
  });

  it('handles droplet selection', () => {
    const mockDroplets = [{ id: 1, name: 'Test Droplet' }];
    render(<PlaylistForm {...mockProps} droplets={mockDroplets} />);
    
    const droplet = screen.getByText('Test Droplet');
    fireEvent.dragStart(droplet);
    fireEvent.drop(screen.getByText('Selected Droplets'));
    
    expect(screen.getByText('1 droplets selected')).toBeInTheDocument();
  });
});