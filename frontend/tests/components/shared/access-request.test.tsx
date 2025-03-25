import { render, screen } from '@testing-library/react';
import { AccessRequestBlock } from '@/components/shared/access-manager/access-requests/access-request';

jest.mock('@/lib/actions', () => ({
  createAuthorizedUser: jest.fn(),
  deleteAccessRequest: jest.fn(),
}));

describe('AccessRequestBlock', () => {
  const mockRequest = {
    id: '1',
    givenName: 'John',
    familyName: 'Doe',
    email: 'john@example.com',
    affiliation: 'Student',
    college: 'Engineering',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders request information', () => {
    render(<AccessRequestBlock request={mockRequest} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Student • Engineering')).toBeInTheDocument();
  });
});