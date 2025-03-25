import { render, screen } from '@testing-library/react';
import { GroupHeader } from '@/components/group/group-header';
import { useRouter } from 'next/navigation';
import { GroupSemester } from '@/types';

jest.mock('@/lib/actions', () => ({
  deleteGroup: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('GroupHeader', () => {
  const mockGroup = {
    id: 1,
    groupName: 'Test Group',
    slug: 'test-group',
    isArchived: false,
    semester: "SPRING" as GroupSemester
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ replace: jest.fn() });
  });

  it('renders group name and semester', () => {
    render(<GroupHeader group={mockGroup} />);
    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByText('SPRING')).toBeInTheDocument();
  });

  it('shows edit buttons when canEdit is true', () => {
    render(<GroupHeader group={mockGroup} canEdit={true} />);
    expect(screen.getByText('Edit Group')).toBeInTheDocument();
    expect(screen.getByText('Due Dates')).toBeInTheDocument();
  });

  it('hides edit buttons when canEdit is false', () => {
    render(<GroupHeader group={mockGroup} canEdit={false} />);
    expect(screen.queryByText('Edit Group')).not.toBeInTheDocument();
    expect(screen.queryByText('Due Dates')).not.toBeInTheDocument();
  });
});