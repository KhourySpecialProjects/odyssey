import { render, screen, fireEvent } from '@testing-library/react';
import { Sort } from '@/components/explore/sort';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe('Sort', () => {
  const mockOptions = [
    { label: 'Name A-Z', slug: 'name:asc', sortKey: "name:asc" as "name:asc" | "name:desc" | "createdAt:asc" | "createdAt:desc" | "completion:asc" | "completion:desc" | "rating:asc" | "rating:desc"},
    { label: 'Name Z-A', slug: 'name:desc', sortKey: "name:asc" as "name:asc" | "name:desc" | "createdAt:asc" | "createdAt:desc" | "completion:asc" | "completion:desc" | "rating:asc" | "rating:desc" },
  ];
  const defaultValue = mockOptions[0];

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue('/test');
  });

  it('renders sort button with default option', () => {
    render(<Sort options={mockOptions} defaultValue={defaultValue} />);
    expect(screen.getByText('Name A-Z')).toBeInTheDocument();
  });

  it('shows options when clicked', () => {
    render(<Sort options={mockOptions} defaultValue={defaultValue} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Name A-Z')).toBeInTheDocument();
  });
});