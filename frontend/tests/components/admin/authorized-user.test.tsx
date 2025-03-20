import { render, screen } from '@testing-library/react';
import { AuthorizedUserBlock } from '@/components/admin/users/authorized-user';
import { AuthorizedUserRoleTitle } from '@/lib/globals';
import { TimeZone } from '@/types';

// Mock dependencies
jest.mock('@/lib/actions', () => ({
  updateAuthorizedUser: jest.fn(),
  updateUserInfo: jest.fn(),
  uploadImage: jest.fn(),
}));

jest.mock('react-dom/client', () => ({
  createRoot: () => ({
    render: jest.fn(),
    unmount: jest.fn(),
  }),
}));

jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
  }),
}));

// Mock useFormStatus
jest.mock('react-dom', () => ({
  useFormStatus: () => ({ pending: false }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AuthorizedUserBlock', () => {
  const mockUser = {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user information correctly', () => {
    render(<AuthorizedUserBlock user={mockUser} />);

    expect(screen.getByTestId('user-name')).toHaveTextContent(/john/i);
  });

  it('shows (Disabled) text when user is disabled', () => {
    const disabledUser = { ...mockUser, isEnabled: false };
    render(<AuthorizedUserBlock user={disabledUser} />);

    expect(screen.getByTestId('user-status')).toHaveTextContent(/disabled/i);
  });

  it('shows Admin text for admin users', () => {
    const adminUser = {
      ...mockUser,
      roles: [
        { id: 1, title: AuthorizedUserRoleTitle.SysAdmin }
      ]
    };
    render(<AuthorizedUserBlock user={adminUser} />);

   expect(screen.getByTestId('user-role')).toHaveTextContent(/admin/i);
  })
  it('has an edit button with a pencil icon', () => {
    render(<AuthorizedUserBlock user={mockUser} />);

    const button = screen.getByRole('button', { name: /edit user/i });
    expect(button).toBeInTheDocument();
  });
});
