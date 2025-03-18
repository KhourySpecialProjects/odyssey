import { render, screen, fireEvent } from '@testing-library/react';
import { DropletDueDateBlock } from '@/components/group/droplet-due-date-block';
import { assignDropletDueDate, getGroupDueDate } from '@/lib/requests/groups';
import { DropletStatus, DropletType, FocusArea, GroupSemester, Tag } from '@/types';

jest.mock('@/lib/requests/groups', () => ({
  assignDropletDueDate: jest.fn(),
  getGroupDueDate: jest.fn(),
}));

describe('DropletDueDateBlock', () => {
  const mockGroup = {
    id: 1,
    groupName: 'Test Group',
    slug: 'test-group',
    isArchived: false,
    semester: "SPRING" as GroupSemester
  };
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    isHidden: false,
    focusArea: 'personal' as FocusArea,
    type: 'knowledge' as DropletType,
    tags: [{ id: 1, name: 'React' }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: []
  };

  beforeEach(() => {
    (getGroupDueDate as jest.Mock).mockResolvedValue({ dueDate: null });
  });

  it('renders droplet name', () => {
    render(<DropletDueDateBlock existingGroup={mockGroup} currentDroplet={mockDroplet} />);
    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
  });

  it('handles save action', async () => {
    render(<DropletDueDateBlock existingGroup={mockGroup} currentDroplet={mockDroplet} />);
    fireEvent.click(screen.getByText('Save'));
    expect(assignDropletDueDate).toHaveBeenCalled();
  });
});