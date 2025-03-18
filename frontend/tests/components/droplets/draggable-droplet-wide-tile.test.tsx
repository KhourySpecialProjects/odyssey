import { render, screen } from '@testing-library/react';
import DraggableDropletWideTile from '@/components/droplets/draggable-droplet-wide-tile';
import { useDrag, useDrop } from 'react-dnd';

jest.mock('react-dnd', () => ({
  useDrag: jest.fn(),
  useDrop: jest.fn()
}));

describe('DraggableDropletWideTile', () => {
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    status: 'draft',
    focusArea: 'frontend',
    type: 'tutorial',
    tags: [{ id: 1, name: 'Tag 1' }]
  };

  beforeEach(() => {
    (useDrag as jest.Mock).mockReturnValue([{ isDragging: false }, jest.fn()]);
    (useDrop as jest.Mock).mockReturnValue([{}, jest.fn()]);
  });

  it('renders droplet information correctly', () => {
    render(
      <DraggableDropletWideTile
        droplet={mockDroplet as any}
        index={0}
        moveCard={jest.fn()}
        sourceList="test"
      />
    );

    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Tutorial')).toBeInTheDocument();
    expect(screen.getByText('Tag 1')).toBeInTheDocument();
  });

  it('applies dragging styles when isDragging is true', () => {
    (useDrag as jest.Mock).mockReturnValue([{ isDragging: true }, jest.fn()]);

    const { container } = render(
      <DraggableDropletWideTile
        droplet={mockDroplet as any}
        index={0}
        moveCard={jest.fn()}
        sourceList="test"
      />
    );

    expect(container.firstChild).toHaveClass('opacity-50');
  });
});