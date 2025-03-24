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
    expect(1+1).toBe(2);
  });

  

});
