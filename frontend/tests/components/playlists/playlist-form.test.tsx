import { render, screen, fireEvent } from '@testing-library/react';
import { PlaylistForm } from '@/components/playlists/playlist-form';

jest.mock('@/lib/actions', () => ({
  createPlaylist: jest.fn(),
  updatePlaylist: jest.fn(),
}));

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useActionState: () => {
      return [
        { ok: false, error: null },
        jest.fn(),
        false
      ];
    }
  };
});

jest.mock('flat', () => ({
  flatten: jest.fn(obj => obj),
  unflatten: jest.fn(obj => obj)
}));

jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{}, jest.fn()],
  DndProvider: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {}
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

  it('handles form submission validation', async () => {
    render(<PlaylistForm {...mockProps} />);

    fireEvent.submit(screen.getByRole('form'));

    expect(screen.getByText('Please enter a playlist name')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Playlist Name'), {
      target: { value: 'Test Playlist' },
    });
    fireEvent.submit(screen.getByRole('form'));

    expect(screen.getByText('Please select at least one droplet')).toBeInTheDocument();
  });
});