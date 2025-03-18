import { render, screen, fireEvent } from '@testing-library/react';
import { AccessRequestBlock } from '@/components/shared/access-manager/access-requests/access-request';
import { createAuthorizedUser, deleteAccessRequest } from '@/lib/actions';

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

  it('handles approve action', async () => {
    (createAuthorizedUser as jest.Mock).mockResolvedValue({ ok: true });
    render(<AccessRequestBlock request={mockRequest} />);
    
    fireEvent.click(screen.getByText('Accept'));
    
    expect(createAuthorizedUser).toHaveBeenCalled();
    expect(deleteAccessRequest).toHaveBeenCalled();
  });

  it('handles reject action', async () => {
    render(<AccessRequestBlock request={mockRequest} />);
    
    fireEvent.click(screen.getByText('Reject'));
    expect(deleteAccessRequest).toHaveBeenCalled();
  });
});