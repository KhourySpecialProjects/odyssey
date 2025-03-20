import { render, screen } from '@testing-library/react';
import { Header } from '@/components/header';
import { useSession } from 'next-auth/react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  })
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn()
}));

describe('Header', () => {
  beforeEach(() => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });
  });
  it('renders logo and navigation', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('shows login button when user is not authenticated', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows user dropdown when user is authenticated', () => {
    // Override the default mock for this test
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated'
    });
    
    render(<Header />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});