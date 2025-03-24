import { render, screen, fireEvent } from '@testing-library/react';
import { Filter } from '@/components/explore/filter';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe('Filter', () => {
  const mockOptions = [
    { label: 'Option 1', value: 'opt1', count: 2 },
    { label: 'Option 2', value: 'opt2', count: 3 },
  ];

  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue('/test');
  });

  it('renders filter button with label', () => {
    render(<Filter name="test" label="Test Filter" options={mockOptions} />);
    expect(screen.getByText('Test Filter')).toBeInTheDocument();
  });

});