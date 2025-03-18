import { render, screen, fireEvent } from '@testing-library/react';
import { BatchAddUser } from '@/components/shared/access-manager/add-user/batch-add-user';
import { createBatchAuthorizedUsers } from '@/lib/actions';

jest.mock('@/lib/actions', () => ({
  createBatchAuthorizedUsers: jest.fn(),
}));

describe('BatchAddUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form elements', () => {
    render(<BatchAddUser />);
    expect(screen.getByPlaceholderText(/Enter email addresses/)).toBeInTheDocument();
    expect(screen.getByText('Choose Files')).toBeInTheDocument();
  });

  it('handles text input submission', async () => {
    (createBatchAuthorizedUsers as jest.Mock).mockResolvedValue({
      ok: true,
      data: { successful: [], failed: [] }
    });

    render(<BatchAddUser />);
    
    const textarea = screen.getByPlaceholderText(/Enter email addresses/);
    fireEvent.change(textarea, { target: { value: 'test@example.com' } });
    fireEvent.submit(screen.getByRole('form'));
    
    expect(createBatchAuthorizedUsers).toHaveBeenCalledWith(['test@example.com']);
  });

  it('handles file upload', async () => {
    render(<BatchAddUser />);
    
    const file = new File(['test@example.com'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText('Choose Files');
    
    Object.defineProperty(input, 'files', {
      value: [file]
    });
    
    fireEvent.change(input);
    expect(screen.getByText('1 file(s) selected')).toBeInTheDocument();
  });
});