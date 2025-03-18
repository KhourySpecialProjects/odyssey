import { render, screen, fireEvent } from '@testing-library/react';
import { DraggableTileListClient } from '@/components/droplets/draggable_tile_list_client';

describe('DraggableTileListClient', () => {
  const mockDroplets = Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    name: `Droplet ${i + 1}`
  }));

  it('renders first page of droplets', () => {
    render(
      <DraggableTileListClient
        droplets={mockDroplets as any}
        moveCard={jest.fn()}
        listType="source"
      />
    );
    expect(screen.getByText('Droplet 1')).toBeInTheDocument();
    expect(screen.getByText('Droplet 5')).toBeInTheDocument();
    expect(screen.queryByText('Droplet 6')).not.toBeInTheDocument();
  });

  it('handles pagination correctly', () => {
    render(
      <DraggableTileListClient
        droplets={mockDroplets as any}
        moveCard={jest.fn()}
        listType="source"
      />
    );
    
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Droplet 6')).toBeInTheDocument();
    expect(screen.getByText('Droplet 7')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Previous'));
    expect(screen.getByText('Droplet 1')).toBeInTheDocument();
  });
});