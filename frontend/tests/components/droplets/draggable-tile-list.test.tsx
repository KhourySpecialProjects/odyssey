import { render, screen } from '@testing-library/react';
import DraggableTileList from '@/components/droplets/draggable_tile_list';
import { useDrop } from 'react-dnd';

jest.mock('react-dnd', () => ({
  useDrop: jest.fn()
}));

describe('DraggableTileList', () => {
  const mockDroplets = [
    { id: 1, name: 'Droplet 1' },
    { id: 2, name: 'Droplet 2' }
  ];

  beforeEach(() => {
    (useDrop as jest.Mock).mockReturnValue([
      { isOver: false },
      jest.fn()
    ]);
  });

  it('renders droplet list', () => {
    render(
      <DraggableTileList
        droplets={mockDroplets as any}
        onDropToOther={jest.fn()}
        onReorder={jest.fn()}
        listType="source"
      />
    );
    expect(screen.getByText('Droplet 1')).toBeInTheDocument();
    expect(screen.getByText('Droplet 2')).toBeInTheDocument();
  });

  it('applies hover styles when dragging over', () => {
    (useDrop as jest.Mock).mockReturnValue([
      { isOver: true },
      jest.fn()
    ]);

    const { container } = render(
      <DraggableTileList
        droplets={mockDroplets as any}
        onDropToOther={jest.fn()}
        onReorder={jest.fn()}
        listType="source"
      />
    );
    expect(container.firstChild).toHaveClass('border-slate-400');
  });
});