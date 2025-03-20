import { render, screen, fireEvent } from '@testing-library/react';
import { DropletList } from '@/components/group/group-management-droplet-list';
import { DropletStatus, DropletType, FocusArea, Tag } from '@/types';

jest.mock('@/lib/actions', () => ({
  createAuthorizedUser: jest.fn(),
}));

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    // Mock the useActionState hook
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

// Mock react-dnd
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{}, jest.fn()],
  DndProvider: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {}
}));

describe('DropletList', () => {
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    isHidden: false,
    focusArea: 'Personal' as FocusArea,
    type: 'Knowledge' as DropletType,
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

    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Knowledge')).toBeInTheDocument();
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