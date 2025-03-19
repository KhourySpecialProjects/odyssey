import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { updateDroplet } from '@/lib/actions';
import { DropletBlock } from '@/components/admin/droplets/droplet-block';
import { DropletStatus, DropletType, FocusArea } from '@/types';

// Mock the dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/lib/actions', () => ({
  updateDroplet: jest.fn()
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('DropletBlock', () => {
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    isHidden: false,
    focusArea: 'frontend' as FocusArea,
    type: 'lesson' as DropletType,
    status: 'published' as DropletStatus,
    tags: [],
    learningObjectives: [],
    droplet_lessons: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders droplet name correctly', () => {
    render(<DropletBlock droplet={mockDroplet} />);
    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
  });

  it('shows (Hidden) text when droplet is hidden', () => {
    const hiddenDroplet = { ...mockDroplet, isHidden: true };
    render(<DropletBlock droplet={hiddenDroplet} />);
    expect(screen.getByText('Test Droplet (Hidden)')).toBeInTheDocument();
  });

  it('links to the correct edit URL', () => {
    render(<DropletBlock droplet={mockDroplet} />);
    const editLink = screen.getByRole('link', { name: /test droplet/i });
    expect(editLink).toHaveAttribute('href', '/draft/d/test-droplet');
  });

  it('shows "Hide Droplet" button when droplet is visible', () => {
    render(<DropletBlock droplet={mockDroplet} />);
    expect(screen.getByRole('button', { name: /hide droplet/i })).toBeInTheDocument();
  });

  it('shows "Show Droplet" button when droplet is hidden', () => {
    const hiddenDroplet = { ...mockDroplet, isHidden: true };
    render(<DropletBlock droplet={hiddenDroplet} />);
    expect(screen.getByRole('button', { name: /show droplet/i })).toBeInTheDocument();
  });

  it('calls updateDroplet with correct parameters when toggling visibility', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({ ok: true });
    render(<DropletBlock droplet={mockDroplet} />);

    const toggleButton = screen.getByRole('button', { name: /hide droplet/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(updateDroplet).toHaveBeenCalledWith(mockDroplet.id, {
        isHidden: true
      });
    });
  });

  it('shows success toast when update succeeds', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({ ok: true });
    render(<DropletBlock droplet={mockDroplet} />);

    const toggleButton = screen.getByRole('button', { name: /hide droplet/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Droplet visibility updated');
    });
  });

  it('shows error toast when update fails', async () => {
    (updateDroplet as jest.Mock).mockRejectedValue(new Error('Update failed'));
    render(<DropletBlock droplet={mockDroplet} />);

    const toggleButton = screen.getByRole('button', { name: /hide droplet/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update droplet visibility');
    });
  });
});