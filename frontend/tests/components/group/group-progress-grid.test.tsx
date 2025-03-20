import { render, screen, act } from '@testing-library/react';
import { GroupProgressGrid } from '@/components/group/group-progress-grid';
import { getEnrollmentsByAuthorizedUser } from '@/lib/requests/enrollment';
import { GroupSemester } from '@/types';

jest.mock('@/lib/requests/enrollment', () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));

describe('GroupProgressGrid', () => {
  const mockGroup = {
    id: 1,
    groupName: 'Test Group',
    slug: 'test-group',
    isArchived: false,
    semester: "SPRING" as GroupSemester
  };

  beforeEach(() => {
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([
      {
        droplet: { id: 1, lessons: [{ id: 1 }] },
        viewedLessons: [{ id: 1 }]
      }
    ]);
  });

  it('renders member names and droplet names', () => {
    render(<GroupProgressGrid group={mockGroup} />);
    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
  });

  it('shows navigation buttons when there are multiple pages', () => {
    const groupWithManyDroplets = {
      ...mockGroup,
      droplets: Array(10).fill({ id: 1, name: 'Test Droplet', lessons: [] })
    };

    render(<GroupProgressGrid group={groupWithManyDroplets} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('fetches and displays completion status', async () => {
    render(<GroupProgressGrid group={mockGroup} />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(getEnrollmentsByAuthorizedUser).toHaveBeenCalledWith(1);
  });
});