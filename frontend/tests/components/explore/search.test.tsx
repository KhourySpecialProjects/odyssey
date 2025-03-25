import { render, screen, fireEvent } from '@testing-library/react';
import { Search } from '@/components/explore/search';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Search', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('updates search query on submit', () => {
    render(<Search />);
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test query' } });

    const form = screen.getByRole('searchbox').closest('form');
    fireEvent.submit(form!);
    
    expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('q=test+query'));
  });
});