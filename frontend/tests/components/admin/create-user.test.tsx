import { render, screen, fireEvent } from '@testing-library/react';
import { CreateUser } from '@/components/admin/users/create-user';
import { useActionState } from 'react';

jest.mock('@/lib/actions', () => ({
  createAuthorizedUser: jest.fn(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn().mockImplementation((action, initialState) => {
    return [null, action, false];
  }),
}));

jest.mock('flat', () => ({
  flatten: jest.fn(obj => obj),
  unflatten: jest.fn(obj => obj)
}));

jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{}, jest.fn()],
  DndProvider: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {}
}));

describe('CreateUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the create user button', () => {
    render(<CreateUser />);
    expect(screen.getByText('Create User')).toBeInTheDocument();
  });

  it('has the correct button text and icon', () => {
    render(<CreateUser />);
    const button = screen.getByText('Create User');
    expect(button).toBeInTheDocument();
  });

  it('displays success message and add another option when user is created', () => {
    (useActionState as jest.Mock).mockImplementation(() => [{
      ok: true,
      message: 'User created successfully'
    }, jest.fn(), false]);

    render(<CreateUser />);
  
    fireEvent.click(screen.getByText('Create User'));

    expect(screen.getByText('User created successfully')).toBeInTheDocument();
    expect(screen.getByText('Add Another?')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('displays error message when user creation fails', () => {
    (useActionState as jest.Mock).mockImplementation(() => [{
      ok: false,
      error: 'Failed to create user'
    }, jest.fn(), false]);

    render(<CreateUser />);

    fireEvent.click(screen.getByText('Create User'));

    expect(screen.getByText(/Failed to create user/)).toBeInTheDocument();
    expect(screen.getByText(/Confirm that no other user exists with this email address./)).toBeInTheDocument();
  });
});
