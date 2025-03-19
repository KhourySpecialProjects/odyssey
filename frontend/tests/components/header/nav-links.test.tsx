import { render, screen } from '@testing-library/react';
import { NavLinks } from '@/components/header/nav-links';
import { usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  usePathname: () => '/'
}));

describe('NavLinks', () => {
  const mockItems = [
    { href: '/home', label: 'Home' },
    { href: '/about', label: 'About' },
  ];

  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/home');
  });

  it('renders all navigation items', () => {
    render(<NavLinks items={mockItems} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('applies active styles to current path', () => {
    render(<NavLinks items={mockItems} />);
    expect(screen.getByText('Home').parentElement).toHaveClass('font-bold');
  });
});