import { render, screen } from '@testing-library/react';
import { FriendCompletedDropletsList } from '@/components/friends/friend-completed-droplets-list';
import { DropletStatus, DropletType, FocusArea, Tag } from '@/types';

describe('FriendCompletedDropletsList', () => {
  const mockDroplets = [
    {
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
    }
  ];

  it('renders list of completed droplets', () => {
    render(<FriendCompletedDropletsList droplets={mockDroplets} />);
    
    expect(screen.getByText('Test Droplet 1')).toBeInTheDocument();
    expect(screen.getByText('Test Droplet 2')).toBeInTheDocument();
  });

  it('renders droplets with correct properties', () => {
    render(<FriendCompletedDropletsList droplets={mockDroplets} />);
    
    // Check for focus areas
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    
    // Check for types
    expect(screen.getByText('Lesson')).toBeInTheDocument();
    expect(screen.getByText('Exercise')).toBeInTheDocument();
  });

  it('renders empty list when no droplets provided', () => {
    render(<FriendCompletedDropletsList droplets={[]} />);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('renders droplets in a compact format', () => {
    render(<FriendCompletedDropletsList droplets={mockDroplets} />);
    
    const dropletTiles = screen.getAllByRole('link');
    expect(dropletTiles).toHaveLength(mockDroplets.length);
    
    // Verify each droplet tile is rendered with compact prop
    dropletTiles.forEach((tile, index) => {
      expect(tile).toHaveAttribute('href', `/d/${mockDroplets[index].slug}`);
    });
  });

  it('passes correct props to DropletTile components', () => {
    render(<FriendCompletedDropletsList droplets={mockDroplets} />);
    
    mockDroplets.forEach(droplet => {
      const tile = screen.getByText(droplet.name).closest('a');
      expect(tile).toHaveAttribute('href', `/d/${droplet.slug}`);
    });
  });
});