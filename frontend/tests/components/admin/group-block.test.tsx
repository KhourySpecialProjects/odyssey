import { render, screen } from '@testing-library/react';
import { GroupBlock } from '@/components/admin/groups/group-block';
import { updateGroup } from '@/lib/requests/groups';
import { toast } from 'sonner';
import { GroupSemester } from '@/types';

// Mock dependencies
jest.mock('@/lib/requests/groups', () => ({
  updateGroup: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next/link', () => {
  return function Link({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock useFormStatus without using react-dom
jest.mock('react-dom', () => {
  return {
    useFormStatus: () => ({ pending: false }),
  };
});

describe('GroupBlock', () => {
  const mockGroup = {
    id: 1,
    groupName: 'Test Group',
    slug: 'test-group',
    isArchived: false,
    semester: "SPRING" as GroupSemester
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders group name correctly', () => {
    render(<GroupBlock group={mockGroup} />);
    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('shows (Archived) text when group is archived', () => {
    const archivedGroup = { ...mockGroup, isArchived: true };
    render(<GroupBlock group={archivedGroup} />);
    expect(screen.getByText('Test Group (Archived)')).toBeInTheDocument();
  });

  it('links to the correct edit URL', () => {
    render(<GroupBlock group={mockGroup} />);
    const editLink = screen.getByRole('link');
    expect(editLink).toHaveAttribute('href', '/g/management?slug=test-group');
  });

  it('shows "Archive Group" button when group is not archived', () => {
    render(<GroupBlock group={mockGroup} />);
    expect(screen.getByText('Archive Group')).toBeInTheDocument();
  });

  it('shows "Unarchive Group" button when group is archived', () => {
    const archivedGroup = { ...mockGroup, isArchived: true };
    render(<GroupBlock group={archivedGroup} />);
    expect(screen.getByText('Unarchive Group')).toBeInTheDocument();
  });
});
