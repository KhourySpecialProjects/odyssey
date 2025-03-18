import { render, screen, fireEvent } from '@testing-library/react';
import { DropletList } from '@/components/group/group-management-droplet-list';
import { DropletStatus, DropletType, FocusArea, Tag } from '@/types';

describe('DropletList', () => {
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
  const mockDroplets = [
    mockDroplet
  ];

  const mockOnReorder = jest.fn();
  const mockOnRemove = jest.fn();

  it('renders droplets with correct information', () => {
    render(
      <DropletList 
        droplets={mockDroplets}
        onReorder={mockOnReorder}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText('Test Droplet 1')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Lesson')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    render(
      <DropletList 
        droplets={mockDroplets}
        onReorder={mockOnReorder}
        onRemove={mockOnRemove}
      />
    );

    const removeButtons = screen.getAllByRole('button');
    fireEvent.click(removeButtons[0]);
    
    expect(mockOnRemove).toHaveBeenCalledWith(1);
  });
});