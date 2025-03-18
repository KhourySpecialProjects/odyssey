import { render, screen, fireEvent } from '@testing-library/react';
import { DropletTile } from '@/components/droplets/droplet-tile';
import { getDropletAverageRating } from '@/lib/requests/enrollment';
import { archiveDroplet } from '@/lib/actions';
import { toast } from 'sonner';

jest.mock('@/lib/requests/enrollment', () => ({
  getDropletAverageRating: jest.fn()
}));

jest.mock('@/lib/actions', () => ({
  archiveDroplet: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

describe('DropletTile', () => {
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    focusArea: 'frontend',
    type: 'tutorial',
    tags: [{ id: 1, name: 'Tag 1' }]
  };

  beforeEach(() => {
    (getDropletAverageRating as jest.Mock).mockResolvedValue(4.5);
  });

  it('renders droplet information', () => {
    render(<DropletTile droplet={mockDroplet as any} />);
    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Tutorial')).toBeInTheDocument();
    expect(screen.getByText('Tag 1')).toBeInTheDocument();
  });

  it('shows completion percentage when enrolled', () => {
    render(
      <DropletTile
        droplet={{ ...mockDroplet, lessons: [{ id: 1 }, { id: 2 }] } as any}
        isEnrolled={true}
        completedLessonIds={[1]}
      />
    );
    expect(screen.getByText('50% Complete')).toBeInTheDocument();
  });

  it('handles archive action', async () => {
    (archiveDroplet as jest.Mock).mockResolvedValue({ success: true });
    
    render(<DropletTile droplet={mockDroplet as any} isArchived={false} />);
    fireEvent.click(screen.getByRole('button'));
    
    expect(archiveDroplet).toHaveBeenCalledWith(mockDroplet, true);
    expect(toast.success).toHaveBeenCalled();
  });
});