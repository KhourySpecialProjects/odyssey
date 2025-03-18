import { render, screen, fireEvent } from '@testing-library/react';
import { GroupDueDateDashboard } from '@/components/group/due-date-dashboard';
import { useRouter } from 'next/navigation';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { GroupSemester, TimeZone } from '@/types';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('GroupDueDateDashboard', () => {
  const mockGroup = {
    id: 1,
    groupName: 'Test Group',
    slug: 'test-group',
    isArchived: false,
    semester: "SPRING" as GroupSemester
  };

  const mockUser = {
    id: 1,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Test bio',
    profilePhoto: 'https://example.com/photo.jpg',
    isEnabled: true,
    roles: [
      AuthorizedUserRoleTitle.Faculty 
    ],
    linkedin: "https://www.google.com/",
    github: "https://www.google.com/",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    timeZone: "America/New_York" as TimeZone,
    isActive: true
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  });

  it('renders content selector tabs', () => {
    render(<GroupDueDateDashboard existingGroup={mockGroup} user={mockUser} />);
    expect(screen.getByText('Droplets')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
  });

  it('displays droplets when on droplets tab', () => {
    render(<GroupDueDateDashboard existingGroup={mockGroup} user={mockUser} />);
    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
  });

  it('navigates back when cancel button is clicked', () => {
    const mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    render(<GroupDueDateDashboard existingGroup={mockGroup} user={mockUser} />);
    fireEvent.click(screen.getByText('Back to my group'));
    
    expect(mockRouter.push).toHaveBeenCalledWith('/g/test-group');
  });
});