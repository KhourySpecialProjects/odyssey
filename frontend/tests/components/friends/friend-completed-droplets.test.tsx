import { render, screen, waitFor } from '@testing-library/react';
import { getEnrollmentsByAuthorizedUser } from '@/lib/requests/enrollment';
import { FriendCompletedDroplets } from '@/components/friends/friend-completed-droplets';
import { TimeZone } from '@/types';

jest.mock('@/lib/requests/enrollment', () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(() => Promise.resolve([])), 
}));

jest.mock('@/components/friends/friend-completed-droplets-list', () => ({
  FriendCompletedDropletsList: ({ droplets }: { droplets: any[] }) => (
    <div data-testid="completed-droplets">
      {droplets.map(d => (
        <div key={d.id}>{d.name}</div>
      ))}
    </div>
  )
}));

describe('FriendCompletedDroplets', () => {
  const mockFriend = {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    bio: 'Test bio',
    profilePhoto: 'test.jpg',
    isEnabled: true,
    roles: [],
    linkedin: "https://linkedin.com/test",
    github: "https://github.com/test",
    firstTime: false,
    friendships: [],
    sent_requests: [],
    received_requests: [],
    blocked: [],
    was_blocked: [],
    enrollments: [],
    timeZone: "America/New_York" as TimeZone
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    render(<FriendCompletedDroplets friend={mockFriend} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays completed droplets when available', async () => {
    const mockEnrollments = [{
      id: 1,
      authorizedUser: mockFriend,
      droplet: {
        id: 1,
        name: 'Test Droplet',
        lessons: [
          { id: 1, name: 'Lesson 1' },
          { id: 2, name: 'Lesson 2' }
        ]
      },
      viewedLessons: [
        { id: 1, name: 'Lesson 1' },
        { id: 2, name: 'Lesson 2' }
      ],
      completed: true
    }];

    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValueOnce(mockEnrollments);

    render(<FriendCompletedDroplets friend={mockFriend} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
  });

  it('shows no completed droplets message when none available', async () => {
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValueOnce([]);

    render(<FriendCompletedDroplets friend={mockFriend} />);

    await waitFor(() => {
      expect(screen.getByText('No completed droplets yet.')).toBeInTheDocument();
    });
  });

  it('filters incomplete droplets correctly', async () => {
    const mockEnrollments = [{
      id: 1,
      authorizedUser: mockFriend,
      droplet: {
        id: 1,
        name: 'Incomplete Droplet',
        lessons: [
          { id: 1, name: 'Lesson 1' },
          { id: 2, name: 'Lesson 2' }
        ]
      },
      viewedLessons: [
        { id: 1, name: 'Lesson 1' }
      ],
      completed: false
    }];

    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValueOnce(mockEnrollments);

    render(<FriendCompletedDroplets friend={mockFriend} />);

    await waitFor(() => {
      expect(screen.getByText('No completed droplets yet.')).toBeInTheDocument();
    });
  });
});