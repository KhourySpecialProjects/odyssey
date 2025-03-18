import { render, screen } from '@testing-library/react';
import { GroupDropletTile } from '@/components/group/group-droplet-tile';
import { DateTime } from 'luxon';
import { DropletStatus, DropletType, FocusArea, Tag } from '@/types';

describe('GroupDropletTile', () => {
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    isHidden: false,
    focusArea: 'personal' as FocusArea,
    type: 'knowledge' as DropletType,
    tags: [{ id: 1, name: 'React' }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: []
  };

  it('renders droplet information', () => {
    render(<GroupDropletTile droplet={mockDroplet} />);
    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Lesson')).toBeInTheDocument();
  });

  it('shows due date when provided', () => {
    const tomorrow = DateTime.local().plus({ days: 1 }).toISO();
    render(<GroupDropletTile droplet={mockDroplet} dueDate={tomorrow} />);
    expect(screen.getByText(/Due/)).toBeInTheDocument();
  });

  it('shows lesson count', () => {
    render(<GroupDropletTile droplet={mockDroplet} />);
    expect(screen.getByText('0 lessons')).toBeInTheDocument();
  });
});