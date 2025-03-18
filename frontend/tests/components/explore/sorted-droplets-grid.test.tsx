import { render, screen, fireEvent } from '@testing-library/react';
import { SortedDropletsGrid } from '@/components/explore/sorted-droplets-grid';
import { DropletStatus, DropletType, FocusArea, Tag } from '@/types';

describe('SortedDropletsGrid', () => {
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
    droplet_lessons: [],
    completionPercentage: 40
  };
  const mockDroplets = [
    mockDroplet,
  ];

  const mockProps = {
    droplets: mockDroplets,
    completedLessonIds: [],
    enrolledDropletIds: [],
    ratingsMap: new Map(),
    dueDates: [],
  };

  it('renders droplets', () => {
    render(<SortedDropletsGrid {...mockProps} />);
    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
  });

  it('handles pagination', () => {
    const manyDroplets = Array(10).fill(mockDroplets[0]);
    render(<SortedDropletsGrid {...mockProps} droplets={manyDroplets} />);
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    expect(screen.getByText('Previous')).toBeVisible();
  });
});