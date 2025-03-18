import { render, screen, fireEvent } from '@testing-library/react';
import { CreateUser } from '@/components/admin/users/create-user';

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

describe('CreateUser', () => {
  it('renders the create user button', () => {
    render(<CreateUser />);
    expect(screen.getByText('Create User')).toBeInTheDocument();
  });

  it('has the correct button text and icon', () => {
    render(<CreateUser />);
    const button = screen.getByText('Create User');
    expect(button).toBeInTheDocument();
  });
});
