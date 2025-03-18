import { render, screen } from '@testing-library/react';
import { Header } from '@/components/header';
import { getCurrentUser } from '@/lib/auth/session';

jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/requests/authorized-user', () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

describe('Header', () => {
  it('renders logo and navigation', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    render(await Header());
    
    expect(screen.getByAltText('Khoury Odyssey Logo')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('shows login button when user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    render(await Header());
    
    expect(screen.getByText('Log in')).toBeInTheDocument();
  });

  it('shows user dropdown when user is authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({
      name: 'Test User',
      email: 'test@example.com',
    });
    render(await Header());
    
    expect(screen.getByText(/Hi, Test User!/)).toBeInTheDocument();
  });
});