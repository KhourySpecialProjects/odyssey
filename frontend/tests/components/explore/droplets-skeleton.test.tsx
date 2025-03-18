import { render, screen } from '@testing-library/react';
import { DropletsSkeleton } from '@/components/explore/droplets-skeleton';

describe('DropletsSkeleton', () => {
  it('renders three skeleton items', () => {
    render(<DropletsSkeleton />);
    const skeletons = screen.getAllByRole('article');
    expect(skeletons).toHaveLength(3);
  });
});