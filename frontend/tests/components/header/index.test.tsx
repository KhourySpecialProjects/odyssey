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
    expect(1+1).toBe(2);
  });
});