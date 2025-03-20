import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    const createAuthorizedUser = jest.fn().mockResolvedValue({})
    const deleteAccessRequest = jest.fn().mockResolvedValue({})
    
    render(
      <AccessRequestBlock 
        
      request={mockRequest}
      />
    )

    await fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    
    await waitFor(() => {
      expect(createAuthorizedUser).toHaveBeenCalled()
      expect(deleteAccessRequest).toHaveBeenCalled()
    })
  })

  it('handles reject action', async () => {
    render(<AccessRequestBlock request={mockRequest} />);
    
    fireEvent.click(screen.getByText('Reject'));
    expect(deleteAccessRequest).toHaveBeenCalled();
  });
});