import { render, screen, fireEvent } from '@testing-library/react';
import { LoginButton } from '@/components/header/login-button';
import { signIn } from 'next-auth/react';

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

describe('LoginButton', () => {
  it('renders login button', () => {
    render(<LoginButton />);
    expect(screen.getByText('Log in')).toBeInTheDocument();
  });

  it('calls signIn when clicked', () => {
    render(<LoginButton />);
    fireEvent.click(screen.getByText('Log in'));
    expect(signIn).toHaveBeenCalled();
  });
});