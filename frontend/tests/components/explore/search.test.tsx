import { render, screen, fireEvent } from '@testing-library/react';
import { Search } from '@/components/explore/search';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe('Search', () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue('/test');
  });

  it('updates search query on submit', () => {
    render(<Search />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.submit(screen.getByRole('form'));
    expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('q=test%20query'));
  });
});