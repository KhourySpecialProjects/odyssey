import { render, screen } from '@testing-library/react';
import { FeedContainer } from '@/components/feed/feed-container';

describe('FeedContainer', () => {
  const mockAnnouncements = [
    {
      id: 1,
      type: 'droplet' as const,
      content: 'Test announcement',
      firstCreated: new Date()
    }
  ];

  it('renders feed client and filter components', () => {
    render(<FeedContainer announcements={mockAnnouncements} />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Test announcement')).toBeInTheDocument();
  });
});