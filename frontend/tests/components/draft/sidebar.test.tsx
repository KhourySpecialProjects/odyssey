import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/draft/sidebar';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn()
}));

jest.mock('next-auth/react', () => ({
  signOut: jest.fn()
}));

describe('Sidebar', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@test.com',
    roles: ['user']
  };

  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    droplet_lessons: [
      { 
        orderIndex: 0,
        lesson: { id: 1, name: 'Lesson 1', slug: 'lesson-1' }
      }
    ]
  };

  const mockAuthorizedUser = {
    id: 1,
    email: 'test@test.com'
  };

  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/test-path');
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  });

  it('renders droplet name and lessons', () => {
    render(
      <Sidebar 
        user={mockUser as any}
        droplet={mockDroplet as any}
        authorizedUser={mockAuthorizedUser as any}
      />
    );
    expect(screen.getByText('Test Droplet')).toBeInTheDocument();
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
  });

  it('handles lesson reordering', async () => {
    render(
      <Sidebar 
        user={mockUser as any}
        droplet={mockDroplet as any}
        authorizedUser={mockAuthorizedUser as any}
      />
    );
  });

  it('toggles mobile menu', () => {
    render(
      <Sidebar 
        user={mockUser as any}
        droplet={mockDroplet as any}
        authorizedUser={mockAuthorizedUser as any}
      />
    );
    const menuButton = screen.getByRole('button', { name: /open sidebar/i });
    fireEvent.click(menuButton);
    expect(screen.getByRole('complementary')).toHaveClass('md:translate-x-80');
  });
});