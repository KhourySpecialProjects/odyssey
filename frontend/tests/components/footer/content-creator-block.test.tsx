import { render, screen, fireEvent } from '@testing-library/react';
import { ContentCreatorBlock } from '@/components/footer/content-creator-block';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

describe('ContentCreatorBlock', () => {
  const mockContentCreator = {
    id: 1,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Test bio',
    profilePhoto: 'https://example.com/photo.jpg',
    isEnabled: true,
    roles: [
      { id: 1, title: AuthorizedUserRoleTitle.Faculty }
    ],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone
  };

  it('renders creator name when firstName and lastName are provided', () => {
    render(<ContentCreatorBlock contentCreator={mockContentCreator} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders email when name is not provided', () => {
    const creatorWithoutName = { ...mockContentCreator, firstName: '', lastName: '' };
    render(<ContentCreatorBlock contentCreator={creatorWithoutName} />);
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('toggles content visibility when clicked', () => {
    render(<ContentCreatorBlock contentCreator={mockContentCreator} />);
    const container = screen.getByRole('listitem');
    expect(screen.getByText('Test bio')).not.toBeVisible();

    fireEvent.click(container);
    expect(screen.getByText('Test bio')).toBeVisible();
    
  });
});