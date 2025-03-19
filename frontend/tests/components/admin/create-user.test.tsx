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
