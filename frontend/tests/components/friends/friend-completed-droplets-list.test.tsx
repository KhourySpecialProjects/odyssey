import { render, screen } from '@testing-library/react';
import { FriendCompletedDropletsList } from '@/components/friends/friend-completed-droplets-list';
import { Droplet } from '@/types';

jest.mock('@/components/droplets/droplet-tile', () => ({
  DropletTile: ({ droplet }: { droplet: Droplet }) => (
    <div data-testid="droplet-tile">{droplet.name}</div>
  )
}));

describe('FriendCompletedDropletsList', () => {
  const mockDroplets = [
    { id: 1, name: 'Droplet 1' },
    { id: 2, name: 'Droplet 2' }
  ] as Droplet[];

  it('renders list of droplets', () => {
    render(<FriendCompletedDropletsList droplets={mockDroplets} />);
    expect(screen.getAllByTestId('droplet-tile')).toHaveLength(2);
  });

  it('renders empty list when no droplets', () => {
    render(<FriendCompletedDropletsList droplets={[]} />);
    expect(screen.queryByTestId('droplet-tile')).not.toBeInTheDocument();
  });
});