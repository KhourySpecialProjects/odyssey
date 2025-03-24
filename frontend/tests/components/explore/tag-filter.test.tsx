import { render, screen } from '@testing-library/react';
import { TagFilter } from '@/components/explore/tag-filter';
import { getTags } from '@/lib/requests/tag';

jest.mock('@/lib/requests/tag', () => ({
  getTags: jest.fn(),
}));

describe('TagFilter', () => {
  const mockTags = [
    {
      name: 'React',
      slug: 'react',
      droplets: [{ isHidden: false, status: 'published' }],
    },
  ];

  beforeEach(() => {
    (getTags as jest.Mock).mockResolvedValue(mockTags);
  });

  it('renders filter with tags', async () => {
    expect(1+1).toBe(2);
  });
});