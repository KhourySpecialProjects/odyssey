import { render, screen, fireEvent } from '@testing-library/react';
import { DarkMode } from '@/components/explore/dark-mode';
import { useTheme } from 'next-themes';

jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

describe('DarkMode', () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
    });
  });

  it('toggles theme when clicked', () => {
    render(<DarkMode />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('shows correct icon based on theme', () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
    });
    render(<DarkMode />);
    expect(screen.getByRole('button')).toHaveClass('relative flex items-center w-8 h-8 bg-yellow-300 dark:bg-sky-600 rounded-full p-1 transition-colors');
  });
});