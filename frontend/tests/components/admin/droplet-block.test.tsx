import { render, screen, fireEvent } from '@testing-library/react';
import { toast } from 'sonner';
import { updateDroplet } from '@/lib/actions';
import { DropletBlock } from '@/components/admin/droplets/droplet-block';
import { DropletStatus, DropletType, FocusArea } from '@/types';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/lib/actions', () => ({
  updateDroplet: jest.fn()
}));

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
    learningObjectives: [],
    droplet_lessons: []
  };

  const mockDroplet2 = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    isHidden: true,
    focusArea: 'frontend' as FocusArea,
    type: 'lesson' as DropletType,
    status: 'published' as DropletStatus,
    tags: [{
      id: 1,
      slug: "test-tag",
      name: "tag",
      droplets: [mockDroplet]
    },
    {
      id: 2,
      slug: "test-tag2",
      name: "tag2",
      droplets: [mockDroplet]
    }],
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

  it('shows "Hide Droplet" button when droplet is visible', () => {
    render(<DropletBlock droplet={mockDroplet} />);
    expect(screen.getByRole('button', { name: /hide droplet/i })).toBeInTheDocument();
  });

  it('shows "Show Droplet" button when droplet is hidden', () => {
    const hiddenDroplet = { ...mockDroplet, isHidden: true };
    render(<DropletBlock droplet={hiddenDroplet} />);
    expect(screen.getByRole('button', { name: /show droplet/i })).toBeInTheDocument();
  });

  it('handles successful droplet visibility update', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({ ok: true });
    
    render(<DropletBlock droplet={mockDroplet} />);
    
    const hideButton = screen.getByText('Hide Droplet');
    await fireEvent.click(hideButton);

    expect(updateDroplet).toHaveBeenCalledWith(
      1,
      {
        isHidden: true,
        name: 'Test Droplet',
        focusArea: 'frontend',
        type: 'lesson',
        tagIds: [],
      },
      { revalidate: true }
    );
    expect(toast.success).toHaveBeenCalledWith('Droplet hidden successfully');
  });

  it('handles successful droplet visibility update with tags', async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({ ok: true });
    
    render(<DropletBlock droplet={mockDroplet2} />);
    
    const hideButton = screen.getByText('Show Droplet');
    await fireEvent.click(hideButton);

    expect(updateDroplet).toHaveBeenCalledWith(
      1,
      {
        isHidden: false,
        name: 'Test Droplet',
        focusArea: 'frontend',
        type: 'lesson',
        tagIds: [1, 2],
      },
      { revalidate: true }
    );
    expect(toast.success).toHaveBeenCalledWith('Droplet shown successfully');
  });

  it('handles failed droplet visibility update', async () => {
    const error = 'Update failed';
    (updateDroplet as jest.Mock).mockResolvedValue({ ok: false, error });
    
    render(<DropletBlock droplet={mockDroplet} />);
    
    const hideButton = screen.getByText('Hide Droplet');
    await fireEvent.click(hideButton);

    expect(updateDroplet).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to update droplet visibility');
  });
});