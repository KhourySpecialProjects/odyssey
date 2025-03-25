import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('BatchAddUser', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  test('removes file when clicking remove button', () => {
    render(<BatchAddUser />);
    
    // Create a mock file and add it
    const file = new File(['email1@test.com'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/Choose Files/i);
    fireEvent.change(input, { target: { files: [file] } });

    // Verify file is added
    expect(screen.getByText('test.csv')).toBeInTheDocument();

    // Click remove button
    const removeButton = screen.getByRole('button', { name: '' }); // The remove button has no text
    fireEvent.click(removeButton);

    // Verify file is removed
    expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
  });

  test('handles drag and drop of CSV files', () => {
    render(<BatchAddUser />);
    
    const dropZone = screen.getByText(/Drag and drop CSV files here/i).parentElement!;
    
    // Create a mock file
    const file = new File(['email@test.com'], 'test.csv', { type: 'text/csv' });
    
    // Create a mock drop event
    const dropEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      dataTransfer: {
        files: [file]
      }
    };

    // Trigger drop event
    fireEvent.drop(dropZone, dropEvent);

    // Verify file is added
    expect(screen.getByText('test.csv')).toBeInTheDocument();
  });
});