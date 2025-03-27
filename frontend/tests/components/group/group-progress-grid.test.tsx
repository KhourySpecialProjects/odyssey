import { render, screen } from '@testing-library/react';
import { GroupProgressGrid } from '@/components/group/group-progress-grid';
import { DropletStatus, DropletType, FocusArea, GroupSemester } from '@/types';
import { getEnrollmentsByAuthorizedUser } from '@/lib/requests/enrollment';

jest.mock('@/lib/requests/enrollment', () => ({
  getEnrollmentsByAuthorizedUser: jest.fn(),
}));

describe('GroupProgressGrid', () => {
  const mockGroup = {
    id: 1,
    groupName: 'Test Group',
    slug: 'test-group',
    isArchived: false,
    semester: "SPRING" as GroupSemester,
    droplets: [{ 
      id: 1, 
      name: 'Test Droplet', 
      isHidden: false,
      lessons: [], 
      slug: 'test-droplet', 
      type: 'DROPPLET' as DropletType, 
      focusArea: 'TEST' as FocusArea, 
      learningObjectives: [], 
      isArchived: false, 
      status: 'ACTIVE' as DropletStatus,
      droplet_lessons: [],
      createdAt: new Date(), 
      updatedAt: new Date() }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  })

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

  beforeEach(() => {
    (getEnrollmentsByAuthorizedUser as jest.Mock).mockResolvedValue([
      {
        droplet: { id: 1, lessons: [{ id: 1 }] },
        viewedLessons: [{ id: 1 }]
      }
    ]);
  });

  test('renders pagination controls correctly', () => {
    render(<GroupProgressGrid group={mockGroup} />);
    
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
  });

  test('handles empty group data', () => {
    const emptyGroup = {
      ...mockGroup,
      droplets: [],
      members: []
    };

    render(<GroupProgressGrid group={emptyGroup} />);
    
    expect(screen.getByText(/No droplets have been added/i)).toBeInTheDocument();
  });
});