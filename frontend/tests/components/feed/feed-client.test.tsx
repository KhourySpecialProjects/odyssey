import { render, screen, fireEvent } from '@testing-library/react';
import { FeedClient } from '@/components/feed/feed-client';

describe('FeedClient', () => {
  const mockAnnouncements = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    type: 'droplet' as const,
    content: `Announcement ${i}`,
    firstCreated: new Date()
  }));

  it('handles pagination correctly', () => {
    render(
      <FeedClient 
        selectedRoles={['droplet']} 
        announcements={mockAnnouncements}
      />
    );

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Announcement 5')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Previous'));
    expect(screen.getByText('Announcement 0')).toBeInTheDocument();
  });
});