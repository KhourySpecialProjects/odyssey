import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GroupManagementForm } from '@/components/group/group-management-form';
import { createGroup, updateGroup } from '@/lib/requests/groups';
import { useRouter } from 'next/navigation';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

jest.mock('@/lib/requests/groups', () => ({
  createGroup: jest.fn(),
  updateGroup: jest.fn(),
  enrollUsers: jest.fn(),
  getGroupByID: jest.fn()
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('@/lib/actions', () => ({
  createAuthorizedUser: jest.fn(),
}));

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    // Mock the useActionState hook
    useActionState: () => {
      return [
        { ok: false, error: null },
        jest.fn(),
        false
      ];
    }
  };
});

jest.mock('flat', () => ({
  flatten: jest.fn(obj => obj),
  unflatten: jest.fn(obj => obj)
}));

// Mock react-dnd
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{}, jest.fn()],
  DndProvider: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {}
}));

describe('GroupManagementForm', () => {
  const mockCurrentUser = {
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
  const mockRouter = { push: jest.fn(), replace: jest.fn() };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders form fields correctly', () => {
    render(<GroupManagementForm currentUser={mockCurrentUser} />);
    
    expect(screen.getByLabelText('Group Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Semester')).toBeInTheDocument();
    expect(screen.getByText('Group Leadership')).toBeInTheDocument();
  });

  it('handles form submission for new group', async () => {
    (createGroup as jest.Mock).mockResolvedValue({ id: 1, slug: 'new-group' });

    render(<GroupManagementForm currentUser={mockCurrentUser} />);
    
    fireEvent.change(screen.getByLabelText('Group Name'), {
      target: { value: 'New Test Group' }
    });

    fireEvent.click(screen.getByText('Create Group'));

    await waitFor(() => {
      expect(createGroup).toHaveBeenCalled();
    });
  });

  it('shows confirmation dialog when leaving with unsaved changes', () => {
    const mockConfirm = jest.spyOn(window, 'confirm');
    mockConfirm.mockImplementation(() => true);

    render(<GroupManagementForm currentUser={mockCurrentUser} />);
    
    fireEvent.change(screen.getByLabelText('Group Name'), {
      target: { value: 'Changed Name' }
    });
    
    fireEvent.click(screen.getByText('Cancel'));

    expect(mockConfirm).toHaveBeenCalled();
    mockConfirm.mockRestore();
  });
});